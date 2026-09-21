import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { arbor, type User } from "@/api/arbor";
import { ApiError, setUnauthorizedHandler } from "@/api/client";
import { connectSession, sessionStorageKey } from "./session-transaction";

export function shouldEndSession(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

type Session = { token: string | null; user: User | undefined; isLoading: boolean; connect(token: string): Promise<void>; signOut(): void };
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(sessionStorageKey));
  const client = useQueryClient();
  const signOut = useCallback(() => {
    sessionStorage.removeItem(sessionStorageKey);
    client.clear();
    setToken(null);
  }, [client]);
  const me = useQuery({
    queryKey: ["me", token],
    queryFn: async () => {
      try { return await arbor.me(token!); }
      catch (error) { if (shouldEndSession(error)) queueMicrotask(signOut); throw error; }
    },
    enabled: Boolean(token), retry: false, staleTime: Infinity,
  });

  useEffect(() => setUnauthorizedHandler(unauthorizedToken => {
    if (unauthorizedToken === token) signOut();
  }), [signOut, token]);

  const connect = useCallback(async (candidate: string) => {
    const { token: verifiedToken, user } = await connectSession(candidate, arbor.me, (nextToken, nextUser) => {
      client.clear();
      client.setQueryData(["me", nextToken], nextUser);
      sessionStorage.setItem(sessionStorageKey, nextToken);
      setToken(nextToken);
    });
    client.setQueryData(["me", verifiedToken], user);
  }, [client]);

  const value = useMemo<Session>(() => ({ token, user: me.data, isLoading: Boolean(token) && me.isLoading, connect, signOut }), [connect, me.data, me.isLoading, signOut, token]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
