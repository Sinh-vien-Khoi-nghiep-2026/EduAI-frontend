import { afterEach, beforeEach, expect, test } from "bun:test";
import type { AuthConfig } from "@/api/arbor";
import {
  authorizeUrl,
  base64url,
  clearDiscoveryCache,
  deriveChallenge,
  discover,
  exchangeCode,
  generateState,
  generateVerifier,
  passwordGrant,
  refreshAccess,
  type OidcDiscovery,
} from "./oidc";

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

const discovery: OidcDiscovery = {
  authorization_endpoint: "https://idp.test/realms/arborcursus/protocol/openid-connect/auth",
  token_endpoint: "https://idp.test/realms/arborcursus/protocol/openid-connect/token",
};

const originalFetch = globalThis.fetch;

beforeEach(() => {
  clearDiscoveryCache();
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function captureFetch(capture: (url: string, headers: Record<string, string>, body?: string) => void, respond?: () => Response): typeof fetch {
  return Object.assign(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const body = typeof init?.body === "string" ? init.body : init?.body instanceof URLSearchParams ? init.body.toString() : undefined;
      const headers: Record<string, string> = {};
      new Headers(init?.headers as HeadersInit).forEach((value, key) => { headers[key] = value; });
      capture(String(input), headers, body);
      return respond ? respond() : new Response(JSON.stringify({}), { status: 200, headers: { "content-type": "application/json" } });
    },
    { preconnect: originalFetch.preconnect },
  );
}

test("base64url encodes bytes without padding or URI characters", () => {
  expect(base64url(new Uint8Array([1, 2, 3]))).toBe("AQID");
  expect(base64url(new Uint8Array([0xb7, 0xb7, 0xfe]))).toBe("t7f-");
});

test("verifier and state are unpadded base64url randomness", () => {
  const verifier = generateVerifier();
  const state = generateState();
  expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(verifier).toHaveLength(86);
  expect(state).toMatch(/^[A-Za-z0-9_-]+$/);
  expect(state).toHaveLength(43);
  expect(verifier).not.toBe(generateVerifier());
});

test("challenge derivation is deterministic SHA-256 base64url", async () => {
  const verifier = generateVerifier();
  const first = await deriveChallenge(verifier);
  const second = await deriveChallenge(verifier);
  expect(first).toBe(second);
  expect(first).toHaveLength(43);
  expect(first).not.toBe(verifier);
});

test("authorizeUrl carries the PKCE and OIDC query parameters", () => {
  const url = authorizeUrl(config, discovery, "challenge-value", "state-value");
  const params = new URL(url).searchParams;
  expect(url).toStartWith(`${discovery.authorization_endpoint}?`);
  expect(params.get("response_type")).toBe("code");
  expect(params.get("client_id")).toBe("arborcursus-web");
  expect(params.get("redirect_uri")).toBe("http://localhost:8081/callback");
  expect(params.get("scope")).toBe("openid profile email");
  expect(params.get("code_challenge")).toBe("challenge-value");
  expect(params.get("code_challenge_method")).toBe("S256");
  expect(params.get("state")).toBe("state-value");
});

test("discover fetches the discovery document once and caches it", async () => {
  let calls = 0;
  globalThis.fetch = captureFetch((_url) => { calls += 1; }, () =>
    new Response(JSON.stringify({
      authorization_endpoint: discovery.authorization_endpoint,
      token_endpoint: discovery.token_endpoint,
    }), { headers: { "content-type": "application/json" } }),
  );
  const first = await discover(config);
  const second = await discover(config);
  expect(first).toEqual(discovery);
  expect(second).toBe(first);
  expect(calls).toBe(1);
});

test("discover rejects a document missing required endpoints", async () => {
  globalThis.fetch = captureFetch(() => undefined, () =>
    new Response(JSON.stringify({ token_endpoint: "only-token" }), { headers: { "content-type": "application/json" } }),
  );
  await expect(discover(config)).rejects.toThrow("authorization_endpoint");
});

test("exchangeCode posts an authorization-code form to the token endpoint", async () => {
  let postedUrl = "";
  let postedHeaders: Record<string, string> = {};
  let postedBody = "";
  globalThis.fetch = captureFetch((url, headers, body) => {
    postedUrl = url;
    postedHeaders = headers ?? {};
    postedBody = body ?? "";
  }, () =>
    new Response(JSON.stringify({ access_token: "at", expires_in: 300, refresh_token: "rt", token_type: "Bearer" }), { headers: { "content-type": "application/json" } }),
  );
  const tokens = await exchangeCode(config, discovery, "the-code", "the-verifier");
  expect(postedUrl).toBe(discovery.token_endpoint);
  expect(postedHeaders["content-type"]).toContain("x-www-form-urlencoded");
  const params = new URLSearchParams(postedBody);
  expect(params.get("grant_type")).toBe("authorization_code");
  expect(params.get("client_id")).toBe("arborcursus-web");
  expect(params.get("code")).toBe("the-code");
  expect(params.get("redirect_uri")).toBe("http://localhost:8081/callback");
  expect(params.get("code_verifier")).toBe("the-verifier");
  expect(tokens).toEqual({ access_token: "at", expires_in: 300, refresh_token: "rt", token_type: "Bearer" });
});

test("passwordGrant posts a Direct Access Grant to the token endpoint", async () => {
  let postedBody = "";
  globalThis.fetch = captureFetch((_url, _headers, body) => { postedBody = body ?? ""; }, () =>
    new Response(JSON.stringify({ access_token: "at", expires_in: 300, refresh_token: "rt", token_type: "Bearer" }), { headers: { "content-type": "application/json" } }),
  );
  const tokens = await passwordGrant(config, discovery, "dev@local.dev", "devpass");
  const params = new URLSearchParams(postedBody);
  expect(params.get("grant_type")).toBe("password");
  expect(params.get("client_id")).toBe("arborcursus-web");
  expect(params.get("username")).toBe("dev@local.dev");
  expect(params.get("password")).toBe("devpass");
  expect(params.get("scope")).toBe("openid profile email");
  expect(tokens).toEqual({ access_token: "at", expires_in: 300, refresh_token: "rt", token_type: "Bearer" });
});

test("password grant errors surface the provider description", async () => {
  globalThis.fetch = captureFetch(() => undefined, () =>
    new Response(JSON.stringify({ error: "invalid_grant", error_description: "Invalid user credentials" }), { status: 400, headers: { "content-type": "application/json" } }),
  );
  await expect(passwordGrant(config, discovery, "dev", "wrong")).rejects.toThrow("Invalid user credentials");
});

test("refreshAccess posts a refresh-token grant", async () => {
  let postedBody = "";
  globalThis.fetch = captureFetch((_url, _headers, body) => { postedBody = body ?? ""; }, () =>
    new Response(JSON.stringify({ access_token: "at2", expires_in: 300, refresh_token: "rt2" }), { headers: { "content-type": "application/json" } }),
  );
  const tokens = await refreshAccess(config, discovery, "rt");
  const params = new URLSearchParams(postedBody);
  expect(params.get("grant_type")).toBe("refresh_token");
  expect(params.get("refresh_token")).toBe("rt");
  expect(params.get("client_id")).toBe("arborcursus-web");
  expect(tokens.access_token).toBe("at2");
});

test("token endpoint errors surface the provider description", async () => {
  globalThis.fetch = captureFetch(() => undefined, () =>
    new Response(JSON.stringify({ error: "invalid_grant", error_description: "Code already redeemed" }), { status: 400, headers: { "content-type": "application/json" } }),
  );
  await expect(exchangeCode(config, discovery, "used-code", "verifier")).rejects.toThrow("Code already redeemed");
});

test("token request surfaces the error code when no description exists", async () => {
  globalThis.fetch = captureFetch(() => undefined, () =>
    new Response(JSON.stringify({ error: "invalid_grant" }), { status: 400, headers: { "content-type": "application/json" } }),
  );
  await expect(exchangeCode(config, discovery, "used-code", "verifier")).rejects.toThrow("invalid_grant.");
});