import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { storage } from "@/src/utils/storage";

const TOKEN_KEY = "workshop_session_token";
const BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL || "";

async function getToken(): Promise<string> {
  const t =
    Platform.OS === "web"
      ? await storage.getItem<string>(TOKEN_KEY, "")
      : await storage.secureGet<string>(TOKEN_KEY, "");
  return (t as string) || "";
}

export async function downloadJobsCsv(): Promise<
  { ok: true; where: "browser" | "share" | "saved"; path?: string } | { ok: false; error: string }
> {
  try {
    const token = await getToken();
    const url = `${BASE_URL}/api/jobs/export.csv`;
    const filename = `workshop_jobs_${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.csv`;

    if (Platform.OS === "web") {
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(dlUrl);
      return { ok: true, where: "browser" };
    }

    // Native: fetch as text, write file to cache, then share.
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();

    const file = new File(Paths.cache, filename);
    if (file.exists) file.delete();
    file.create();
    file.write(text);

    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(file.uri, {
        mimeType: "text/csv",
        dialogTitle: "Workshop Jobs CSV",
        UTI: "public.comma-separated-values-text",
      });
      return { ok: true, where: "share", path: file.uri };
    }
    return { ok: true, where: "saved", path: file.uri };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Download failed" };
  }
}
