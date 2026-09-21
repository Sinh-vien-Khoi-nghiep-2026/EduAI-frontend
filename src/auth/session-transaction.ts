import type { User } from "@/api/arbor";

export const sessionStorageKey = "arborcursus.access-token";

type Activate = (token: string, user: User) => void;

export async function connectSession(candidate: string, verify: (token: string) => Promise<User>, activate: Activate) {
  const token = candidate.trim();
  if (!token) throw new Error("Paste an access token to connect.");
  const user = await verify(token);
  activate(token, user);
  return { token, user };
}
