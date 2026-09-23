import type { AuthConfig, User } from "@/api/arbor";
import { authorizeUrl, deriveChallenge, discover, generateState, generateVerifier } from "./oidc";

export const sessionStorageKey = "arborcursus.access-token";
export const refreshTokenStorageKey = "arborcursus.refresh-token";
export const expiresAtStorageKey = "arborcursus.expires-at";
export const pendingLoginStorageKey = "arborcursus.oidc-pending";

type Activate = (token: string, user: User) => void;

export type PendingLogin = {
  state: string;
  verifier: string;
  from: string;
};

export function readPendingLogin(): PendingLogin | undefined {
  const raw = sessionStorage.getItem(pendingLoginStorageKey);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as PendingLogin;
  } catch {
    return undefined;
  }
}

export function clearPendingLogin() {
  sessionStorage.removeItem(pendingLoginStorageKey);
}

export async function beginLogin(config: AuthConfig, from: string): Promise<string> {
  const discovery = await discover(config);
  const verifier = generateVerifier();
  const state = generateState();
  const challenge = await deriveChallenge(verifier);
  sessionStorage.setItem(pendingLoginStorageKey, JSON.stringify({ state, verifier, from }));
  return authorizeUrl(config, discovery, challenge, state);
}

export async function connectSession(candidate: string, verify: (token: string) => Promise<User>, activate: Activate) {
  const token = candidate.trim();
  if (!token) throw new Error("Paste an access token to connect.");
  const user = await verify(token);
  activate(token, user);
  return { token, user };
}
