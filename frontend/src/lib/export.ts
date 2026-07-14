import { Platform } from "react-native";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { fetchJobsCsv } from "@/src/lib/api";

export type ExportResult =
  | { ok: true; message: string; rows?: number; bytes?: number }
  | { ok: false; error: string };

export async function downloadJobsCsv(): Promise<ExportResult> {
  try {
    const filename = `workshop_jobs_${new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:.]/g, "-")}.csv`;

    const text = await fetchJobsCsv();
    const rows = Math.max(0, text.split("\n").filter((l) => l.trim()).length - 1);
    const bytes = new Blob([text]).size;

    if (Platform.OS === "web") {
      const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = filename;
      a.style.display = "none";
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(dlUrl);
      }, 200);
      return {
        ok: true,
        message: `Downloaded ${filename} · ${rows} rows · check your Downloads folder`,
        rows,
        bytes,
      };
    }

    // Native: write to cache + share sheet
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
      return {
        ok: true,
        message: `${rows} rows shared · save it to Files, Drive, WhatsApp or email`,
        rows,
        bytes,
      };
    }
    return {
      ok: true,
      message: `Saved to ${file.uri}`,
      rows,
      bytes,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Download failed" };
  }
}
