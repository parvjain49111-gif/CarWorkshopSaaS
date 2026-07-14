import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, ROLES, roleColor, roleLabel } from "@/src/lib/theme";

type Staff = {
  user_id: string;
  name: string;
  email: string;
  role: string;
  picture?: string;
  intake: number;
  completed: number;
};

export default function StaffScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Staff | null>(null);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await api.listStaff();
      setItems(data || []);
    } catch (e: any) {
      setToast(e?.message || "Failed to load staff");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const changeRole = async (userId: string, role: string) => {
    if (saving) return;
    setSaving(userId);
    try {
      await api.updateStaffRole(userId, role);
      setItems((prev) => prev.map((s) => (s.user_id === userId ? { ...s, role } : s)));
      setEditing(null);
      setToast(`Role updated → ${role.toUpperCase()}`);
      setTimeout(() => setToast(null), 2200);
    } catch (e: any) {
      setToast(e?.message || "Failed");
      setTimeout(() => setToast(null), 2500);
    } finally {
      setSaving(null);
    }
  };

  const isOwner = user?.role === "owner";

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="staff-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>ORGANIZATION</Text>
          <Text style={styles.title}>STAFF · ROLES</Text>
        </View>
        <Text style={styles.count}>{items.length} PEOPLE</Text>
      </View>

      <Text style={styles.hint}>
        {isOwner
          ? "Tap a role to change it. Owner-only capability."
          : "View-only. Only owners can edit roles."}
      </Text>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(s) => s.user_id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          refreshControl={
            <RefreshControl
              tintColor={colors.accent}
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row} testID={`staff-${item.user_id}`}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {(item.name || "?").slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name || item.email}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.email}
                </Text>
                <Text style={styles.stats}>
                  {item.intake} intakes · {item.completed} delivered
                </Text>
              </View>
              <TouchableOpacity
                testID={`role-btn-${item.user_id}`}
                disabled={!isOwner || saving !== null}
                onPress={() => setEditing(item)}
                style={[
                  styles.roleBadge,
                  { borderColor: roleColor(item.role) },
                  !isOwner && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.roleText, { color: roleColor(item.role) }]}>
                  {roleLabel(item.role)}
                </Text>
                {isOwner ? (
                  <Ionicons name="pencil" size={11} color={roleColor(item.role)} />
                ) : null}
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <Modal transparent visible={!!editing} animationType="fade" onRequestClose={() => setEditing(null)}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setEditing(null)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>ASSIGN ROLE</Text>
            <Text style={styles.sheetName}>{editing?.name}</Text>
            {ROLES.map((r) => (
              <TouchableOpacity
                key={r.key}
                testID={`assign-${r.key}`}
                onPress={() => editing && changeRole(editing.user_id, r.key)}
                disabled={saving !== null}
                style={[
                  styles.sheetBtn,
                  editing?.role === r.key && { borderColor: r.color },
                ]}
              >
                {saving === editing?.user_id && editing?.role !== r.key ? (
                  <ActivityIndicator color={r.color} size="small" />
                ) : (
                  <>
                    <View style={[styles.roleDot, { backgroundColor: r.color }]} />
                    <Text style={[styles.sheetBtnText, { color: r.color }]}>{r.label}</Text>
                    {editing?.role === r.key ? (
                      <Ionicons name="checkmark" size={16} color={r.color} />
                    ) : null}
                  </>
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setEditing(null)} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 30 }]}>
          <Ionicons name="information-circle" size={16} color={colors.accent} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
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
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  count: { color: colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  hint: {
    color: colors.textDim,
    fontSize: 12,
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },

  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.text, fontWeight: "900", fontSize: 13 },
  name: { color: colors.text, fontWeight: "900", fontSize: 14 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  stats: { color: colors.textMuted, fontSize: 11, marginTop: 3 },

  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    minHeight: 34,
  },
  roleText: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    padding: 20,
    gap: 10,
  },
  sheetTitle: { color: colors.textDim, fontSize: 11, fontWeight: "800", letterSpacing: 2 },
  sheetName: { color: colors.text, fontSize: 18, fontWeight: "900", marginBottom: 6 },
  sheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleDot: { width: 8, height: 8 },
  sheetBtnText: { fontWeight: "900", letterSpacing: 1.5, fontSize: 12, flex: 1 },
  cancelBtn: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: { color: colors.textDim, fontWeight: "900", letterSpacing: 2, fontSize: 11 },

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
  toastText: { color: colors.text, fontWeight: "700", fontSize: 12, flex: 1 },
});
