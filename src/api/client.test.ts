import { afterEach, expect, test } from "bun:test";
import { ApiError, request, setUnauthorizedHandler, shouldRetryQuery } from "./client";

const originalFetch = globalThis.fetch;
let cleanupUnauthorized: (() => void) | undefined;

function mockFetch(respond: () => Promise<Response>): typeof fetch {
  return Object.assign(async (_input: RequestInfo | URL, _init?: RequestInit) => respond(), { preconnect: originalFetch.preconnect });
}

function watchUnauthorized(notified: string[]) {
  cleanupUnauthorized = setUnauthorizedHandler(token => notified.push(token));
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  cleanupUnauthorized?.();
  cleanupUnauthorized = undefined;
});

test("request normalizes FastAPI field validation errors", async () => {
  globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ detail: [{ loc: ["body", "level"], msg: "Input should be less than or equal to 10" }] }), { status: 422, headers: { "content-type": "application/json" } }));
  await expect(request("/skills/me/progress", { method: "PUT", body: { skill_id: "typescript", level: 11 } })).rejects.toMatchObject({ status: 422, code: "validation_error", fieldErrors: { level: "Input should be less than or equal to 10" } });
});

test("request sends bearer headers only for authenticated calls", async () => {
  const headers: Headers[] = [];
  globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, init?: RequestInit) => {
    headers.push(new Headers(init?.headers));
    return new Response(JSON.stringify({}), { headers: { "content-type": "application/json" } });
  }, { preconnect: originalFetch.preconnect });
  await request("/users/me", { token: "abc123" });
  await request("/auth/config");
  expect(headers[0]?.get("Authorization")).toBe("Bearer abc123");
  expect(headers[1]?.has("Authorization")).toBeFalse();
});

test("request returns undefined for no-content responses", async () => {
  globalThis.fetch = mockFetch(async () => new Response(null, { status: 204 }));
  expect(await request("/notifications/1/read", { method: "POST", token: "abc123" })).toBeUndefined();
});

test("request preserves readable backend error details", async () => {
  globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ detail: "Readable message" }), { status: 400, headers: { "content-type": "application/json" } }));
  await expect(request("/users/me")).rejects.toMatchObject({ status: 400, message: "Readable message" });
  globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ detail: { code: "candidate_access_denied", message: "Candidate access denied" } }), { status: 403, headers: { "content-type": "application/json" } }));
  await expect(request("/candidates/search")).rejects.toMatchObject({ status: 403, code: "candidate_access_denied", message: "Candidate access denied" });
  globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ detail: { code: "candidate_access_denied" } }), { status: 403, headers: { "content-type": "application/json" } }));
  await expect(request("/candidates/search")).rejects.toMatchObject({ status: 403, code: "candidate_access_denied", message: "candidate access denied" });
});

test("non-JSON errors are normalized without exposing proxy output", async () => {
  for (const response of [new Response(null, { status: 500, headers: { "content-type": "text/plain" } }), new Response("<body>upstream failed</body>", { status: 502, headers: { "content-type": "text/html" } })]) {
    globalThis.fetch = mockFetch(async () => response);
    await expect(request("/users/me")).rejects.toMatchObject({ status: response.status, message: "The request could not be completed." });
  }
});

test("authenticated 401 notifies exactly once even with malformed JSON", async () => {
  const notified: string[] = [];
  watchUnauthorized(notified);
  globalThis.fetch = mockFetch(async () => new Response("not json", { status: 401, headers: { "content-type": "application/json" } }));
  await expect(request("/users/me", { token: "expired-token" })).rejects.toMatchObject({ status: 401, message: "The server returned an invalid response." });
  await Promise.resolve();
  expect(notified).toEqual(["expired-token"]);
});

test("unauthenticated 401, 403, server, and transport failures retain the session", async () => {
  const notified: string[] = [];
  watchUnauthorized(notified);
  globalThis.fetch = mockFetch(async () => new Response("not json", { status: 401, headers: { "content-type": "application/json" } }));
  await expect(request("/auth/config")).rejects.toMatchObject({ status: 401 });
  for (const status of [403, 500]) {
    globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ detail: { code: "denied" } }), { status, headers: { "content-type": "application/json" } }));
    await expect(request("/users/me", { token: "active-token" })).rejects.toMatchObject({ status });
  }
  globalThis.fetch = mockFetch(async () => { throw new TypeError("network unavailable"); });
  await expect(request("/users/me", { token: "active-token" })).rejects.toThrow("network unavailable");
  await Promise.resolve();
  expect(notified).toEqual([]);
});

test("query retries one transient failure but not 401", () => {
  expect(shouldRetryQuery(0, new ApiError(401, "expired"))).toBeFalse();
  expect(shouldRetryQuery(0, new ApiError(403, "denied"))).toBeTrue();
  expect(shouldRetryQuery(0, new ApiError(500, "failed"))).toBeTrue();
  expect(shouldRetryQuery(0, new TypeError("network unavailable"))).toBeTrue();
  expect(shouldRetryQuery(1, new TypeError("network unavailable"))).toBeFalse();
});

test("request rejects malformed non-401 JSON without leaking a parser error", async () => {
  globalThis.fetch = mockFetch(async () => new Response("not json", { status: 500, headers: { "content-type": "application/json" } }));
  await expect(request("/users/me")).rejects.toMatchObject({ status: 500, message: "The server returned an invalid response." });
});
