import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { arbor, type User } from "@/api/arbor";

type Session = { token: string | null; user: User | undefined; isLoading: boolean; connect(token: string): Promise<void>; signOut(): void };
const SessionContext = createContext<Session | null>(null);
const storageKey = "arborcursus.access-token";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem(storageKey));
  const client = useQueryClient();
  const me = useQuery({ queryKey: ["me", token], queryFn: () => arbor.me(token!), enabled: Boolean(token), retry: false });

  useEffect(() => {
    if (me.error instanceof ApiError && me.error.status === 401) {
      sessionStorage.removeItem(storageKey);
      setToken(null);
    }
  }, [me.error]);

  const value = useMemo<Session>(() => ({
    token,
    user: me.data,
    isLoading: Boolean(token) && me.isLoading,
    async connect(nextToken) {
      sessionStorage.setItem(storageKey, nextToken);
      setToken(nextToken);
      await client.fetchQuery({ queryKey: ["me", nextToken], queryFn: () => arbor.me(nextToken) });
    },
    signOut() {
      sessionStorage.removeItem(storageKey);
      client.clear();
      setToken(null);
    },
  }), [client, me.data, me.isLoading, token]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}
