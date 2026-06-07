import { storage } from "@/src/utils/storage";
import { Platform } from "react-native";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const TOKEN_KEY = "workshop_session_token";

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return await storage.getItem<string>(TOKEN_KEY, "");
  }
  return await storage.secureGet<string>(TOKEN_KEY, "");
}

export async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await storage.setItem(TOKEN_KEY, token);
  } else {
    await storage.secureSet(TOKEN_KEY, token);
  }
}

export async function clearToken(): Promise<void> {
  if (Platform.OS === "web") {
    await storage.removeItem(TOKEN_KEY);
  } else {
    await storage.secureRemove(TOKEN_KEY);
  }
}

type RequestOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};

export async function apiRequest<T = any>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}/api${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    await clearToken();
    throw new Error("Unauthorized");
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data.detail || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  exchangeSession: (session_id: string) =>
    fetch(`${BASE_URL}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id }),
    }).then(async (r) => {
      if (!r.ok) throw new Error("Auth failed");
      return r.json();
    }),
  me: () => apiRequest("/auth/me"),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  listJobs: (params: { q?: string; status?: string } = {}) => {
    const usp = new URLSearchParams();
    if (params.q) usp.set("q", params.q);
    if (params.status) usp.set("status", params.status);
    const qs = usp.toString();
    return apiRequest(`/jobs${qs ? "?" + qs : ""}`);
  },
  getJob: (id: string) => apiRequest(`/jobs/${id}`),
  createJob: (body: any) => apiRequest(`/jobs`, { method: "POST", body }),
  updateJob: (id: string, body: any) =>
    apiRequest(`/jobs/${id}`, { method: "PATCH", body }),
  stats: () => apiRequest(`/stats`),
  analytics: () => apiRequest(`/analytics`),
};
