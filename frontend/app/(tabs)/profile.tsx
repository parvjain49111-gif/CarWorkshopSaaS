import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";
import { downloadJobsCsv } from "@/src/lib/export";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const onExport = async () => {
    if (downloading) return;
    setDownloading(true);
    const res = await downloadJobsCsv();
    setDownloading(false);
    if (res.ok) {
      setToast(
        res.where === "browser"
          ? "CSV downloaded"
          : res.where === "share"
          ? "Opened share sheet"
          : "Saved to device",
      );
    } else {
      setToast(res.error);
    }
    setTimeout(() => setToast(null), 2000);
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="profile-screen">
      <View style={styles.header}>
        <Text style={styles.title}>PROFILE</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          {user?.picture ? (
            <Image source={{ uri: user.picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={28} color={colors.textDim} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={styles.name} numberOfLines={1} testID="profile-name">
              {user?.name || "—"}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user?.email}
            </Text>
            <View style={styles.roleBadge}>
              <View style={styles.roleDot} />
              <Text style={styles.roleText}>
                {(user?.role || "owner").toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.infoBlock}>
        <Text style={styles.eyebrow}>WORKSHOP</Text>
        <InfoRow icon="business" label="Studio" value="Multi-brand" />
        <InfoRow icon="shield-checkmark" label="Account" value="Active" />
        <InfoRow
          icon="key"
          label="Role permissions"
          value={
            user?.role === "owner"
              ? "Full access · delete jobs"
              : "Update jobs · cannot delete"
          }
        />
      </View>

      <TouchableOpacity
        testID="export-csv-button"
        activeOpacity={0.85}
        onPress={onExport}
        disabled={downloading}
        style={[styles.exportBtn, downloading && { opacity: 0.6 }]}
      >
        {downloading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Ionicons name="download-outline" size={18} color="#000" />
            <Text style={styles.exportText}>EXPORT DATA · CSV</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.exportHint}>
        Downloads every job (customer, car, problems, mechanic findings, parts, status, dates) as one CSV ready for Excel, Google Sheets, or Python/pandas analysis. Photos are flagged (yes/no) but not embedded.
      </Text>

      <TouchableOpacity
        testID="logout-button"
        activeOpacity={0.85}
        onPress={logout}
        style={styles.logout}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={styles.logoutText}>SIGN OUT</Text>
      </TouchableOpacity>

      <Text style={styles.footer}>WorkshopOps · v1.0</Text>

      {toast ? (
        <View style={styles.toast} testID="profile-toast">
          <Ionicons name="information-circle" size={16} color={colors.accent} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={16} color={colors.accent} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  header: { paddingTop: 8, paddingBottom: 18 },
  title: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 14 },
  avatar: { width: 64, height: 64, backgroundColor: colors.surface2 },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  name: { color: colors.text, fontSize: 20, fontWeight: "900" },
  email: { color: colors.textDim, fontSize: 13, marginTop: 2 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.accent,
    marginTop: 8,
  },
  roleDot: { width: 6, height: 6, backgroundColor: colors.accent, marginRight: 6 },
  roleText: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 1.4 },

  infoBlock: { marginTop: 22 },
  eyebrow: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: { color: colors.textDim, fontSize: 13, flex: 1 },
  infoValue: { color: colors.text, fontSize: 13, fontWeight: "700", maxWidth: 180 },

  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.danger,
  },
  logoutText: { color: colors.danger, fontWeight: "900", letterSpacing: 2 },

  exportBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 28,
    paddingVertical: 16,
    backgroundColor: colors.accent,
  },
  exportText: { color: "#000", fontWeight: "900", letterSpacing: 2, fontSize: 13 },
  exportHint: {
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
    textAlign: "center",
  },

  footer: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 24,
  },
  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: { color: colors.text, fontWeight: "800", fontSize: 12, letterSpacing: 1 },
});
