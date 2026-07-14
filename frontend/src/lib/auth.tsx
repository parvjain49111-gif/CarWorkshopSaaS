import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { Platform } from "react-native";
import * as Linking from "expo-linking";
import { api, getAccessToken, setAccessToken, setRefreshToken, clearTokens, mockMode } from "./api";

export type AuthUser = {
  user_id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
};

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthCtx = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const me = await api.me();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  const exchangeAndSet = useCallback(async (session_id: string) => {
    const res = await api.exchangeSession(session_id);
    // backend may return accessToken/refreshToken or legacy session_token
    if ((res as any).accessToken) {
      await setAccessToken((res as any).accessToken);
      await setRefreshToken((res as any).refreshToken || null);
    } else if ((res as any).session_token) {
      await setAccessToken((res as any).session_token);
    }
    setUser(res.user);
  }, []);

  // Bootstrap: check existing token / pending session_id in URL (web)
  useEffect(() => {
    (async () => {
      try {
        if (Platform.OS === "web" && typeof window !== "undefined") {
          const hash = window.location.hash || "";
          const search = window.location.search || "";
          const sid =
            new URLSearchParams(hash.replace(/^#/, "")).get("session_id") ||
            new URLSearchParams(search).get("session_id");
          if (sid) {
            await exchangeAndSet(sid);
            window.history.replaceState(null, "", window.location.pathname);
            setLoading(false);
            return;
          }
        } else {
          const initial = await Linking.getInitialURL();
          if (initial) {
            const parsed = Linking.parse(initial);
            const sid =
              (parsed.queryParams as any)?.session_id ||
              extractFragmentSession(initial);
            if (sid) {
              await exchangeAndSet(sid as string);
              setLoading(false);
              return;
            }
          }
        }
        const storedToken = await getAccessToken();
        if (mockMode && !storedToken) {
          const res = await api.login();
          if ((res as any).accessToken) {
            await setAccessToken((res as any).accessToken);
            await setRefreshToken((res as any).refreshToken || null);
          }
          setUser(res.user);
          setLoading(false);
          return;
        }
        await refresh();
      } catch (e) {
        console.warn("auth bootstrap", e);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [exchangeAndSet, refresh]);

  // Mobile hot links
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = Linking.addEventListener("url", async (event) => {
      const sid = extractSessionId(event.url);
      if (sid) {
        try {
          await exchangeAndSet(sid);
        } catch (e) {
          console.warn("hot link auth", e);
        }
      }
    });
    return () => sub.remove();
  }, [exchangeAndSet]);

  const login = useCallback(async () => {
    const res = await api.login();
    if ((res as any).accessToken) {
      await setAccessToken((res as any).accessToken);
      await setRefreshToken((res as any).refreshToken || null);
    } else if ((res as any).session_token) {
      await setAccessToken((res as any).session_token);
    }
    setUser(res.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {}
    await clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}

function extractSessionId(url: string): string | null {
  try {
    const hashPart = url.split("#")[1];
    if (hashPart) {
      const sid = new URLSearchParams(hashPart).get("session_id");
      if (sid) return sid;
    }
    const queryPart = url.split("?")[1]?.split("#")[0];
    if (queryPart) {
      const sid = new URLSearchParams(queryPart).get("session_id");
      if (sid) return sid;
    }
  } catch {}
  return null;
}

function extractFragmentSession(url: string): string | null {
  const hashPart = url.split("#")[1];
  if (!hashPart) return null;
  return new URLSearchParams(hashPart).get("session_id");
}
