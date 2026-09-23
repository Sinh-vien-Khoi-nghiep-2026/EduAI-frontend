import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { arbor, type User } from "@/api/arbor";
import { ApiError, setUnauthorizedHandler } from "@/api/client";
import { type OidcTokens, discover, refreshAccess } from "./oidc";
import {
  connectSession,
  expiresAtStorageKey,
  pendingLoginStorageKey,
  refreshTokenStorageKey,
  sessionStorageKey,
} from "./session-transaction";

export function shouldEndSession(error: unknown) {
  return error instanceof ApiError && error.status === 401;
}

type Session = {
  token: string | null;
  user: User | undefined;
  isLoading: boolean;
  connect(token: string): Promise<void>;
  connectOidc(tokens: OidcTokens): Promise<void>;
  signOut(): void;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    sessionStorage.getItem(sessionStorageKey),
  );
  const client = useQueryClient();
  const signOut = useCallback(() => {
    sessionStorage.removeItem(sessionStorageKey);
    sessionStorage.removeItem(refreshTokenStorageKey);
    sessionStorage.removeItem(expiresAtStorageKey);
    sessionStorage.removeItem(pendingLoginStorageKey);
    client.clear();
    setToken(null);
  }, [client]);

  const connectOidc = useCallback(
    async (tokens: OidcTokens) => {
      client.clear();
      if (tokens.refresh_token) sessionStorage.setItem(refreshTokenStorageKey, tokens.refresh_token);
      else sessionStorage.removeItem(refreshTokenStorageKey);
      if (tokens.expires_in > 0) sessionStorage.setItem(expiresAtStorageKey, String(Date.now() + tokens.expires_in * 1000));
      else sessionStorage.removeItem(expiresAtStorageKey);
      sessionStorage.setItem(sessionStorageKey, tokens.access_token);
      setToken(tokens.access_token);
    },
    [client],
  );

  const refreshInFlight = useRef<Promise<void> | null>(null);
  const refresh = useCallback(async () => {
    if (refreshInFlight.current) return refreshInFlight.current;
    refreshInFlight.current = (async () => {
      const refreshToken = sessionStorage.getItem(refreshTokenStorageKey);
      if (!refreshToken) throw new Error("No refresh token available.");
      const config = await arbor.authConfig();
      const discovery = await discover(config);
      const tokens = await refreshAccess(config, discovery, refreshToken);
      connectOidc(tokens);
    })();
    try {
      await refreshInFlight.current;
    } catch {
      signOut();
    } finally {
      refreshInFlight.current = null;
    }
  }, [connectOidc, signOut]);

  const me = useQuery({
    queryKey: ["me", token],
    queryFn: async () => {
      try {
        return await arbor.me(token!);
      } catch (error) {
        // Rescued by `refresh` (which swaps the token and restarts this query)
        // when a refresh token exists; otherwise `refresh` signs out.
        if (shouldEndSession(error)) void refresh();
        throw error;
      }
    },
    enabled: Boolean(token),
    retry: false,
    staleTime: Infinity,
  });

  // A 401 from any authenticated call escalates only to a refresh attempt;
  // a token without a refresh grant falls through to sign-out.
  useEffect(
    () =>
      setUnauthorizedHandler((unauthorizedToken) => {
        if (unauthorizedToken === token) void refresh();
      }),
    [refresh, token],
  );

  const connect = useCallback(
    async (candidate: string) => {
      const { token: verifiedToken, user } = await connectSession(
        candidate,
        arbor.me,
        (nextToken, nextUser) => {
          client.clear();
          client.setQueryData(["me", nextToken], nextUser);
          sessionStorage.setItem(sessionStorageKey, nextToken);
          setToken(nextToken);
        },
      );
      client.setQueryData(["me", verifiedToken], user);
    },
    [client],
  );

  // Proactive refresh shortly before expiry keeps operations off the 401 path.
  useEffect(() => {
    if (!token) return;
    const expiresAt = Number(sessionStorage.getItem(expiresAtStorageKey) ?? 0);
    if (expiresAt <= 0 || !sessionStorage.getItem(refreshTokenStorageKey)) return;
    const delay = Math.max(0, expiresAt - Date.now() - 60000);
    const timer = setTimeout(() => void refresh(), delay);
    return () => clearTimeout(timer);
  }, [refresh, token]);

  const value = useMemo<Session>(
    () => ({
      token,
      user: me.data,
      isLoading: Boolean(token) && me.isLoading,
      connect,
      connectOidc,
      signOut,
    }),
    [connect, connectOidc, me.data, me.isLoading, signOut, token],
  );
  return (
    <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
  );
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used within SessionProvider");
  return value;
}