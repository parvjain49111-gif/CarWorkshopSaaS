import { storage } from "@/src/utils/storage";
import { Platform } from "react-native";
import { normalizeJob, normalizeJobs } from "@/src/utils/transform";
import { mockApi, isMockApi } from "./mockApi";

const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";
const USE_MOCK = isMockApi();
const ACCESS_KEY = "workshop_access_token";
const REFRESH_KEY = "workshop_refresh_token";

async function getAccessToken(): Promise<string | null> {
  if (Platform.OS === "web") return await storage.getItem<string>(ACCESS_KEY, "");
  return await storage.secureGet<string>(ACCESS_KEY, "");
}

async function getRefreshToken(): Promise<string | null> {
  if (Platform.OS === "web") return await storage.getItem<string>(REFRESH_KEY, "");
  return await storage.secureGet<string>(REFRESH_KEY, "");
}

export async function setAccessToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (token) await storage.setItem(ACCESS_KEY, token);
    else await storage.removeItem(ACCESS_KEY);
    return;
  }
  if (token) await storage.secureSet(ACCESS_KEY, token);
  else await storage.secureRemove(ACCESS_KEY);
}

export async function setRefreshToken(token: string | null): Promise<void> {
  if (Platform.OS === "web") {
    if (token) await storage.setItem(REFRESH_KEY, token);
    else await storage.removeItem(REFRESH_KEY);
    return;
  }
  if (token) await storage.secureSet(REFRESH_KEY, token);
  else await storage.secureRemove(REFRESH_KEY);
}

export async function setTokens(access: string | null, refresh: string | null) {
  await setAccessToken(access);
  await setRefreshToken(refresh);
}

export async function clearTokens() {
  await setTokens(null, null);
}

type RequestOptions = {
  method?: string;
  body?: any;
  headers?: Record<string, string>;
};

async function attemptRefresh(): Promise<boolean> {
  try {
    const rtoken = await getRefreshToken();
    if (!rtoken) return false;
    if (USE_MOCK) {
      const data = await mockApi.refresh(rtoken);
      if (!data.accessToken) return false;
      await setTokens(data.accessToken, data.refreshToken || rtoken);
      return true;
    }
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rtoken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (!data.accessToken) return false;
    await setTokens(data.accessToken, data.refreshToken || rtoken);
    return true;
  } catch (e) {
    return false;
  }
}

async function mockRequest<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const token = await getAccessToken();
  const headers: Record<string, string> = {
    ...(opts.headers || {}),
    Authorization: token ? `Bearer ${token}` : "",
  };
  const url = new URL(path, "http://localhost");
  const pathname = url.pathname;
  const query = url.searchParams;

  if (pathname === "/api/auth/me") return mockApi.me(headers) as any;
  if (pathname === "/api/auth/logout") return mockApi.logout(headers) as any;
  if (pathname === "/api/jobs") {
    if (opts.method === "POST") return mockApi.createJob(opts.body, headers) as any;
    return mockApi.listJobs(query, headers) as any;
  }
  if (pathname.startsWith("/api/jobs/") && opts.method === "PATCH") {
    const jobId = pathname.replace("/api/jobs/", "");
    return mockApi.updateJob(jobId, opts.body, headers) as any;
  }
  if (pathname.startsWith("/api/jobs/")) {
    const jobId = pathname.replace("/api/jobs/", "");
    return mockApi.getJob(jobId, headers) as any;
  }
  if (pathname === "/api/stats") return mockApi.stats(headers) as any;
  if (pathname === "/api/analytics") return mockApi.analytics(headers) as any;
  throw new Error(`Mock route not implemented: ${pathname}`);
}

export async function apiRequest<T = any>(
  path: string,
  opts: RequestOptions = {},
): Promise<T> {
  if (USE_MOCK) {
    return mockRequest<T>(`/api${path}`, opts);
  }

  let token = await getAccessToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(opts.headers || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res = await fetch(`${BASE_URL}/api${path}`, {
    method: opts.method || "GET",
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });

  if (res.status === 401) {
    const ok = await attemptRefresh();
    if (!ok) {
      await clearTokens();
      throw new Error("Unauthorized");
    }
    token = await getAccessToken();
    const headers2 = { ...headers, Authorization: token ? `Bearer ${token}` : undefined } as any;
    res = await fetch(`${BASE_URL}/api${path}`, {
      method: opts.method || "GET",
      headers: headers2,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  }

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const data = await res.json();
      msg = data.detail || data.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  exchangeSession: (session_id: string) => {
    if (USE_MOCK) {
      return mockApi.exchangeSession(session_id);
    }
    return fetch(`${BASE_URL}/api/auth/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id }),
    }).then(async (r) => {
      if (!r.ok) throw new Error("Auth failed");
      return r.json();
    });
  },
  login: (email?: string) => {
    if (USE_MOCK) {
      return mockApi.login(email);
    }
    const payload = email ? { email } : {};
    return fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(async (r) => {
      if (!r.ok) throw new Error("Auth failed");
      return r.json();
    });
  },
  me: () => apiRequest("/auth/me"),
  logout: async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch {}
    await clearTokens();
  },
  listJobs: (params: { q?: string; status?: string } = {}) => {
    const usp = new URLSearchParams();
    if (params.q) usp.set("q", params.q);
    if (params.status) usp.set("status", params.status);
    const qs = usp.toString();
    return apiRequest(`/jobs${qs ? "?" + qs : ""}`).then((r) => normalizeJobs(r));
  },
  getJob: (id: string) => apiRequest(`/jobs/${id}`).then((r) => normalizeJob(r)),
  createJob: (body: any) => apiRequest(`/jobs`, { method: "POST", body }).then((r) => normalizeJob(r)),
  updateJob: (id: string, body: any) =>
    apiRequest(`/jobs/${id}`, { method: "PATCH", body }).then((r) => normalizeJob(r)),
  stats: () => apiRequest(`/stats`),
  analytics: () => apiRequest(`/analytics`),
  getSettings: () => apiRequest(`/settings`),
  updateSettings: (body: any) => apiRequest(`/settings`, { method: "PUT", body }),
  listCustomers: (q?: string) =>
    apiRequest(`/customers${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getCustomer: (key: string) => apiRequest(`/customers/${encodeURIComponent(key)}`),
  listStaff: () => apiRequest(`/staff`),
  updateStaffRole: (userId: string, role: string) =>
    apiRequest(`/staff/${userId}`, { method: "PATCH", body: { role } }),
  // Inventory
  listParts: (q?: string) =>
    apiRequest(`/parts${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  getPart: (id: string) => apiRequest(`/parts/${id}`),
  createPart: (body: any) => apiRequest(`/parts`, { method: "POST", body }),
  updatePart: (id: string, body: any) =>
    apiRequest(`/parts/${id}`, { method: "PATCH", body }),
  deletePart: (id: string) => apiRequest(`/parts/${id}`, { method: "DELETE" }),
  partsLowStock: () => apiRequest(`/parts/low-stock`),
  partsSummary: () => apiRequest(`/parts/summary`),
  importParts: (parts: any[]) =>
    apiRequest(`/parts/import`, { method: "POST", body: { parts } }),
  // Phase 3
  notifEvents: () => apiRequest(`/notifications/events`),
  sendNotif: (event: string, to_phone: string, context: any) =>
    apiRequest(`/notifications/send`, {
      method: "POST",
      body: { event, to_phone, context },
    }),
  remindersDue: () => apiRequest(`/reminders/due`),
  sendDueReminders: () =>
    apiRequest(`/reminders/send-due`, { method: "POST" }),
};

export async function fetchJobsCsv(): Promise<string> {
  const token = await getAccessToken();
  if (USE_MOCK) {
    return mockApi.exportCsv({ Authorization: token ? `Bearer ${token}` : "" });
  }
  const res = await fetch(`${BASE_URL}/api/jobs/export.csv`, {
    headers: { Authorization: `Bearer ${token || ""}` },
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.text();
}

export async function fetchJobsXlsx(): Promise<Blob> {
  const token = await getAccessToken();
  if (USE_MOCK) {
    const text = await mockApi.exportCsv({ Authorization: token ? `Bearer ${token}` : "" });
    return new Blob([text], { type: "text/csv;charset=utf-8;" });
  }
  const res = await fetch(`${BASE_URL}/api/jobs/export.xlsx`, {
    headers: { Authorization: `Bearer ${token || ""}` },
  });
  if (!res.ok) throw new Error(`Server returned ${res.status}`);
  return res.blob();
}

export const mockMode = USE_MOCK;

export { getAccessToken };
