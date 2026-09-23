import type { AuthConfig } from "@/api/arbor";

export type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  end_session_endpoint?: string;
};

export type OidcTokens = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  token_type?: string;
};

const discoveryCache = new Map<string, OidcDiscovery>();

export function clearDiscoveryCache() {
  discoveryCache.clear();
}

export function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

export function generateVerifier(): string {
  const bytes = new Uint8Array(64);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export function generateState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

export async function deriveChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || !value) throw new Error(`The identity provider discovery document is missing "${field}".`);
  return value;
}

export async function discover(config: AuthConfig): Promise<OidcDiscovery> {
  const cached = discoveryCache.get(config.discovery_url);
  if (cached) return cached;
  let payload: Record<string, unknown>;
  try {
    const response = await fetch(config.discovery_url, { headers: { accept: "application/json" } });
    if (!response.ok) throw new Error(`The identity provider returned ${response.status}.`);
    payload = (await response.json()) as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("The identity provider returned")) throw error;
    throw new Error("The identity provider could not be reached.", { cause: error });
  }
  const discovery = {
    authorization_endpoint: requireString(payload.authorization_endpoint, "authorization_endpoint"),
    token_endpoint: requireString(payload.token_endpoint, "token_endpoint"),
    end_session_endpoint: typeof payload.end_session_endpoint === "string" ? payload.end_session_endpoint : undefined,
  };
  discoveryCache.set(config.discovery_url, discovery);
  return discovery;
}

export function authorizeUrl(config: AuthConfig, discovery: OidcDiscovery, challenge: string, state: string): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.client_id,
    redirect_uri: config.redirect_uri,
    scope: config.scopes.join(" "),
    code_challenge: challenge,
    code_challenge_method: config.pkce,
    state,
  });
  return `${discovery.authorization_endpoint}?${params}`;
}

function tokenError(status: number, payload: unknown): Error {
  const detail = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).error_description : undefined;
  const code = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>).error : undefined;
  const message = typeof detail === "string" ? detail : typeof code === "string" ? `${code}.` : undefined;
  return new Error(message ?? `The identity provider rejected the token request (${status}).`);
}

async function tokenRequest(endpoint: string, params: Record<string, string>): Promise<OidcTokens> {
  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params),
    });
  } catch {
    throw new Error("The identity provider could not be reached.");
  }
  let payload: unknown;
  if (!response.ok) {
    try { payload = await response.json(); } catch { payload = undefined; }
    throw tokenError(response.status, payload);
  }
  try {
    payload = await response.json();
  } catch {
    throw new Error("The identity provider returned an invalid response.");
  }
  const body = payload as Record<string, unknown>;
  return {
    access_token: requireString(body.access_token, "access_token"),
    expires_in: typeof body.expires_in === "number" ? body.expires_in : 0,
    refresh_token: typeof body.refresh_token === "string" ? body.refresh_token : undefined,
    token_type: typeof body.token_type === "string" ? body.token_type : undefined,
  };
}

export async function exchangeCode(config: AuthConfig, discovery: OidcDiscovery, code: string, verifier: string): Promise<OidcTokens> {
  return tokenRequest(discovery.token_endpoint, {
    grant_type: config.grant_type,
    client_id: config.client_id,
    code,
    redirect_uri: config.redirect_uri,
    code_verifier: verifier,
  });
}

export async function passwordGrant(config: AuthConfig, discovery: OidcDiscovery, username: string, password: string): Promise<OidcTokens> {
  return tokenRequest(discovery.token_endpoint, {
    grant_type: "password",
    client_id: config.client_id,
    username,
    password,
    scope: config.scopes.join(" "),
  });
}

export async function refreshAccess(config: AuthConfig, discovery: OidcDiscovery, refreshToken: string): Promise<OidcTokens> {
  return tokenRequest(discovery.token_endpoint, {
    grant_type: "refresh_token",
    client_id: config.client_id,
    refresh_token: refreshToken,
  });
}