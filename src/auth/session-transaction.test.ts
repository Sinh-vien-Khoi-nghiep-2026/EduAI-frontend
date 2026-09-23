import { afterEach, beforeEach, expect, test } from "bun:test";
import type { AuthConfig } from "@/api/arbor";
import { clearDiscoveryCache } from "./oidc";
import { beginLogin, clearPendingLogin, connectSession, readPendingLogin } from "./session-transaction";

const user = { id: "u", display_name: null, email: null, profile_public: false, recruiter_searchable: false };

const config: AuthConfig = {
  issuer: "https://idp.test/realms/arborcursus",
  discovery_url: "https://idp.test/realms/arborcursus/.well-known/openid-configuration",
  client_id: "arborcursus-web",
  audience: "arborcursus-api",
  scopes: ["openid", "profile", "email"],
  pkce: "S256",
  grant_type: "authorization_code",
  redirect_uri: "http://localhost:8081/callback",
};

const originalFetch = globalThis.fetch;
const storage = new Map<string, string>();

beforeEach(() => {
  clearDiscoveryCache();
  storage.clear();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

globalThis.sessionStorage = {
  get length() { return storage.size; },
  clear: () => storage.clear(),
  getItem: (key) => storage.get(key) ?? null,
  key: (index) => Array.from(storage.keys())[index] ?? null,
  removeItem: (key) => void storage.delete(key),
  setItem: (key, value) => void storage.set(key, value),
};

test("session connection verifies before activating the trimmed token", async () => {
  let active = false;
  await expect(connectSession("   ", async () => user, () => { active = true; })).rejects.toThrow("Paste an access token");
  expect(active).toBeFalse();
  await connectSession(" token ", async value => { expect(value).toBe("token"); return user; }, (token, current) => { active = token === "token" && current === user; });
  expect(active).toBeTrue();
});

test("rejected replacement token cannot replace an existing session", async () => {
  let persisted = "current-token";
  const activate = (token: string) => { persisted = token; };
  for (const failure of [new Error("unauthorized"), new Error("forbidden"), new Error("server error"), new TypeError("network error")]) {
    await expect(connectSession("candidate-token", async () => { throw failure; }, activate)).rejects.toBe(failure);
    expect(persisted).toBe("current-token");
  }
});

test("beginLogin builds an authorization URL and stores the pending exchange", async () => {
  globalThis.fetch = Object.assign(async (_input: RequestInfo | URL) =>
    new Response(JSON.stringify({
      authorization_endpoint: "https://idp.test/realms/arborcursus/protocol/openid-connect/auth",
      token_endpoint: "https://idp.test/realms/arborcursus/protocol/openid-connect/token",
    }), { headers: { "content-type": "application/json" } }),
  { preconnect: originalFetch.preconnect });
  const url = await beginLogin(config, "/skills");
  const params = new URL(url).searchParams;
  expect(params.get("code_challenge_method")).toBe("S256");
  expect(params.get("client_id")).toBe("arborcursus-web");
  const pending = readPendingLogin();
  expect(pending?.from).toBe("/skills");
  expect(pending?.state).toBe(params.get("state") ?? undefined);
  expect(pending?.verifier).toBeTruthy();
});

test("readPendingLogin tolerates a corrupted pending record", async () => {
  storage.set("arborcursus.oidc-pending", "not-json");
  expect(readPendingLogin()).toBeUndefined();
  clearPendingLogin();
  expect(readPendingLogin()).toBeUndefined();
});

test("clearPendingLogin discards the pending exchange", async () => {
  globalThis.fetch = Object.assign(async () =>
    new Response(JSON.stringify({
      authorization_endpoint: "https://idp.test/auth",
      token_endpoint: "https://idp.test/token",
    }), { headers: { "content-type": "application/json" } }),
  { preconnect: originalFetch.preconnect });
  await beginLogin(config, "/");
  expect(readPendingLogin()).toBeTruthy();
  clearPendingLogin();
  expect(readPendingLogin()).toBeUndefined();
});