import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

import { api, fetchJobsXlsx } from "@/src/lib/api";
import { colors, statusColor, statusLabel } from "@/src/lib/theme";


export default function DataScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string, ms = 4500) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const load = useCallback(async () => {
    try {
      const data = await api.listJobs();
      setJobs(data || []);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const buildTsv = (): string => {
    const headers = [
      "Job ID", "Created", "Status",
      "Customer", "Phone", "Reference",
      "Car", "Plate", "Year",
      "Customer Problems", "Mechanic Findings",
      "Parts Count", "Parts Total ₹", "Parts Detail",
      "Photos",
    ];
    const lines = [headers.join("\t")];
    for (const j of jobs) {
      const parts = j.spare_parts || [];
      const total = parts.reduce(
        (s: number, p: any) => s + (p.price || 0) * (p.quantity || 1),
        0,
      );
      const detail = parts
        .map((p: any) => `${p.name} x${p.quantity} (${p.status})`)
        .join(" | ");
      const photos = j.photos || {};
      const photoCount = ["front", "back", "left", "right"].filter(
        (k) => photos[k],
      ).length;
      const clean = (s: any) =>
        String(s ?? "")
          .replace(/\t/g, " ")
          .replace(/\r?\n/g, " ");
      lines.push(
        [
          j.job_id,
          (j.created_at || "").slice(0, 19).replace("T", " "),
          (j.status || "").replace("_", " "),
          clean(j.customer_name),
          clean(j.customer_phone),
          clean(j.reference),
          clean(j.car_name),
          clean(j.car_number),
          clean(j.model_year),
          clean(j.customer_problems),
          clean(j.mechanic_findings),
          parts.length,
          total ? total.toFixed(2) : "",
          clean(detail),
          photoCount,
        ].join("\t"),
      );
    }
    return lines.join("\n");
  };

  const copyAll = async () => {
    if (busy) return;
    setBusy("copy");
    try {
      const tsv = buildTsv();
      await Clipboard.setStringAsync(tsv);
      showToast(`Copied ${jobs.length} rows. Open Excel/Sheets and paste (Ctrl+V).`);
    } catch (e: any) {
      showToast(`Failed: ${e?.message || "copy error"}`);
    } finally {
      setBusy(null);
    }
  };

  const downloadXlsx = async () => {
    if (busy) return;
    setBusy("xlsx");
    try {
      const blob = await fetchJobsXlsx();
      const filename = `workshop_jobs_${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/[:.]/g, "-")}.xlsx`;

      if (Platform.OS === "web") {
        const dlUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = dlUrl;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(dlUrl);
        }, 200);
        showToast(
          `Excel file saved as ${filename}. Check your browser's Downloads bar at the bottom.`,
        );
      } else {
        const ab = await blob.arrayBuffer();
        const bytes = new Uint8Array(ab);
        let bin = "";
        for (let i = 0; i < bytes.byteLength; i++) {
          bin += String.fromCharCode(bytes[i]);
        }
        const b64 = btoa(bin);
        const file = new File(Paths.cache, filename);
        if (file.exists) file.delete();
        file.create();
        file.write(b64, { encoding: "base64" });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(file.uri, {
            mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            dialogTitle: "Workshop Jobs Excel",
            UTI: "org.openxmlformats.spreadsheetml.sheet",
          });
          showToast("Excel file ready · save to Files, send via WhatsApp/Email");
        } else {
          showToast(`Saved to ${file.uri}`);
        }
      }
    } catch (e: any) {
      showToast(`Failed: ${e?.message || "xlsx error"}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="data-screen">
      <View style={styles.header}>
        <TouchableOpacity
          testID="data-back"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>FOUNDER VIEW</Text>
          <Text style={styles.title}>ALL DATA</Text>
        </View>
        <Text style={styles.count} testID="data-count">
          {jobs.length} JOBS
        </Text>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          testID="copy-data-btn"
          onPress={copyAll}
          disabled={busy !== null || loading || jobs.length === 0}
          activeOpacity={0.85}
          style={[styles.action, { backgroundColor: colors.accent }]}
        >
          {busy === "copy" ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="copy" size={16} color="#000" />
              <Text style={styles.actionText}>COPY · PASTE IN EXCEL</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          testID="xlsx-data-btn"
          onPress={downloadXlsx}
          disabled={busy !== null || loading || jobs.length === 0}
          activeOpacity={0.85}
          style={[styles.action, styles.actionAlt]}
        >
          {busy === "xlsx" ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <>
              <Ionicons name="document" size={16} color={colors.accent} />
              <Text style={[styles.actionText, { color: colors.accent }]}>EXCEL .XLSX</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <Text style={styles.hint}>
        <Text style={{ color: colors.accent, fontWeight: "900" }}>Tip:</Text>{" "}
        the COPY button is the most reliable way. Tap it, open Excel or Google
        Sheets, then paste — your data lands in proper columns instantly.
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>Nothing logged yet</Text>
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        >
          <ScrollView
            showsVerticalScrollIndicator
            contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
          >
            <View>
              {/* Header row */}
              <View style={[styles.tr, styles.thead]}>
                <Th w={100}>Plate</Th>
                <Th w={140}>Customer</Th>
                <Th w={140}>Car</Th>
                <Th w={70}>Year</Th>
                <Th w={120}>Reference</Th>
                <Th w={120}>Status</Th>
                <Th w={220}>Customer Problem</Th>
                <Th w={220}>Mechanic Found</Th>
                <Th w={80}>Parts</Th>
                <Th w={100}>₹ Parts</Th>
                <Th w={140}>Logged</Th>
              </View>
              {jobs.map((j, i) => {
                const parts = j.spare_parts || [];
                const total = parts.reduce(
                  (s: number, p: any) => s + (p.price || 0) * (p.quantity || 1),
                  0,
                );
                return (
                  <TouchableOpacity
                    key={j.job_id}
                    testID={`data-row-${j.job_id}`}
                    onPress={() => router.push(`/job/${j.job_id}`)}
                    style={[
                      styles.tr,
                      i % 2 === 0 ? styles.trEven : styles.trOdd,
                    ]}
                    activeOpacity={0.85}
                  >
                    <Td w={100}>
                      <Text style={styles.plate}>{j.car_number}</Text>
                    </Td>
                    <Td w={140}>{j.customer_name}</Td>
                    <Td w={140}>{j.car_name}</Td>
                    <Td w={70}>{j.model_year || "—"}</Td>
                    <Td w={120}>{j.reference || "—"}</Td>
                    <Td w={120}>
                      <View
                        style={[
                          styles.statusBadge,
                          { borderColor: statusColor(j.status) },
                        ]}
                      >
                        <View style={[styles.statusDot, { backgroundColor: statusColor(j.status) }]} />
                        <Text style={[styles.statusBadgeText, { color: statusColor(j.status) }]}>
                          {statusLabel(j.status)}
                        </Text>
                      </View>
                    </Td>
                    <Td w={220}>{j.customer_problems || "—"}</Td>
                    <Td w={220}>{j.mechanic_findings || "—"}</Td>
                    <Td w={80}>{parts.length}</Td>
                    <Td w={100}>{total ? `₹${total.toFixed(0)}` : "—"}</Td>
                    <Td w={140}>
                      {(j.created_at || "").slice(0, 16).replace("T", " ")}
                    </Td>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 20 }]} testID="data-toast">
          <Ionicons name="information-circle" size={18} color={colors.accent} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Th({ w, children }: { w: number; children: React.ReactNode }) {
  return (
    <View style={[styles.cell, { width: w }]}>
      <Text style={styles.th}>{children}</Text>
    </View>
  );
}

function Td({ w, children }: { w: number; children: React.ReactNode }) {
  if (typeof children === "string" || typeof children === "number") {
    return (
      <View style={[styles.cell, { width: w }]}>
        <Text style={styles.td} numberOfLines={3}>
          {children}
        </Text>
      </View>
    );
  }
  return <View style={[styles.cell, { width: w }]}>{children}</View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  title: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },
  count: { color: colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },

  actionsRow: { flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 10 },
  action: {
    flex: 1,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    minHeight: 48,
  },
  actionAlt: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent },
  actionText: { color: "#000", fontWeight: "900", letterSpacing: 1.5, fontSize: 11 },

  hint: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 16,
    paddingHorizontal: 20,
    marginBottom: 14,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyTitle: { color: colors.text, fontWeight: "900", marginTop: 12 },

  tr: { flexDirection: "row", borderBottomWidth: 1, borderColor: colors.border },
  thead: { backgroundColor: colors.surface2, borderTopWidth: 1, borderColor: colors.borderStrong },
  trEven: { backgroundColor: colors.surface },
  trOdd: { backgroundColor: colors.bg },

  cell: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderRightWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
  },
  th: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  td: { color: colors.text, fontSize: 12, lineHeight: 16 },
  plate: { color: colors.text, fontWeight: "900", fontSize: 12, letterSpacing: 1 },

  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
    gap: 4,
  },
  statusDot: { width: 5, height: 5 },
  statusBadgeText: { fontSize: 9, fontWeight: "900", letterSpacing: 1 },

  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastText: { color: colors.text, flex: 1, fontSize: 12, fontWeight: "700" },
});
