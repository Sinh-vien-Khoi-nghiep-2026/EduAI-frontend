import { afterEach, expect, test } from "bun:test";
import { ApiError, request, setUnauthorizedHandler, shouldRetryQuery } from "./client";

const originalFetch = globalThis.fetch;
function mockFetch(respond: () => Promise<Response>): typeof fetch {
  return Object.assign(async (_input: RequestInfo | URL, _init?: RequestInit) => respond(), { preconnect: originalFetch.preconnect });
}

afterEach(() => {
  globalThis.fetch = originalFetch;
  setUnauthorizedHandler(() => {});
});

test("request normalizes FastAPI field validation errors", async () => {
  globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ detail: [{ loc: ["body", "level"], msg: "Input should be less than or equal to 10" }] }), { status: 422, headers: { "content-type": "application/json" } }));
  await expect(request("/skills/me/progress", { method: "PUT", body: { skill_id: "typescript", level: 11 } })).rejects.toMatchObject({ status: 422, code: "validation_error", fieldErrors: { level: "Input should be less than or equal to 10" } });
});

test("only bearer-token 401 responses notify the session", async () => {
  const notified: string[] = [];
  setUnauthorizedHandler(token => notified.push(token));
  globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ detail: { code: "expired" } }), { status: 401, headers: { "content-type": "application/json" } }));
  await expect(request("/users/me", { token: "expired-token" })).rejects.toMatchObject({ status: 401 });
  expect(notified).toEqual(["expired-token"]);
  await expect(request("/auth/config")).rejects.toMatchObject({ status: 401 });
  expect(notified).toEqual(["expired-token"]);
});

test("403, server, and transport failures retain the session", async () => {
  const notified: string[] = [];
  setUnauthorizedHandler(token => notified.push(token));
  for (const status of [403, 500]) {
    globalThis.fetch = mockFetch(async () => new Response(JSON.stringify({ detail: { code: "denied" } }), { status, headers: { "content-type": "application/json" } }));
    await expect(request("/users/me", { token: "active-token" })).rejects.toMatchObject({ status });
  }
  globalThis.fetch = mockFetch(async () => { throw new TypeError("network unavailable"); });
  await expect(request("/users/me", { token: "active-token" })).rejects.toThrow("network unavailable");
  expect(notified).toEqual([]);
});

test("query retries transient failures but not bearer 401 responses", () => {
  expect(shouldRetryQuery(0, new ApiError(401, "expired"))).toBeFalse();
  expect(shouldRetryQuery(0, new ApiError(403, "denied"))).toBeTrue();
  expect(shouldRetryQuery(0, new ApiError(500, "failed"))).toBeTrue();
  expect(shouldRetryQuery(1, new TypeError("network unavailable"))).toBeFalse();
});

test("request rejects malformed JSON without leaking a parser error", async () => {
  globalThis.fetch = mockFetch(async () => new Response("not json", { status: 500, headers: { "content-type": "application/json" } }));
  await expect(request("/users/me")).rejects.toMatchObject({ status: 500, message: "The server returned an invalid response." });
});
