import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
  RefreshControl, Modal,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { colors } from "@/src/lib/theme";

type Item = {
  car_number: string;
  customer_name?: string;
  customer_phone?: string | null;
  car_name?: string;
  last_service?: string;
  days_since_service: number;
};

export default function RemindersScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const d = await api.remindersDue();
      setItems(d.items || []);
    } catch (e: any) {
      setToast(e?.message || "Failed");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sendAll = async () => {
    setConfirm(false);
    setSending(true);
    try {
      const r = await api.sendDueReminders();
      setToast(`Sent ${r.sent}/${r.total_due} · skipped ${r.skipped} (no phone) · via console-mock provider`);
      setTimeout(() => setToast(null), 6000);
    } catch (e: any) {
      setToast(e?.message || "Failed");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSending(false);
    }
  };

  const withPhone = items.filter((i) => i.customer_phone);

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="reminders-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>AUTOMATION</Text>
          <Text style={styles.title}>SERVICE REMINDERS</Text>
        </View>
      </View>

      <View style={styles.summaryRow}>
        <SumTile label="OVERDUE" value={items.length} color={colors.danger} />
        <SumTile label="WITH PHONE" value={withPhone.length} color={colors.success} />
      </View>

      <View style={styles.noticeBox}>
        <Ionicons name="information-circle" size={16} color={colors.accent} />
        <Text style={styles.noticeText}>
          Vehicles not serviced in 180+ days. Sending uses the currently configured provider
          (default: console-log mock — plug in Twilio/MSG91/AiSensy in{" "}
          <Text style={{ color: colors.accent }}>backend/services/whatsapp.py</Text>).
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={colors.accent} /></View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="checkmark-done-circle" size={40} color={colors.success} />
          <Text style={styles.emptyTitle}>All vehicles serviced recently</Text>
          <Text style={styles.emptySub}>Nothing due for reminder right now.</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.car_number}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
          refreshControl={
            <RefreshControl
              tintColor={colors.accent}
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row} testID={`due-${item.car_number}`}>
              <View style={styles.daysCol}>
                <Text style={styles.daysNum}>{item.days_since_service}</Text>
                <Text style={styles.daysLabel}>DAYS</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plate}>{item.car_number}</Text>
                <Text style={styles.name}>
                  {item.customer_name || "—"}
                  {item.car_name ? ` · ${item.car_name}` : ""}
                </Text>
                <Text style={[styles.phone, !item.customer_phone && { color: colors.textMuted }]}>
                  {item.customer_phone ? `📞 ${item.customer_phone}` : "no phone on file"}
                </Text>
              </View>
            </View>
          )}
        />
      )}

      {withPhone.length > 0 ? (
        <TouchableOpacity
          testID="send-all-reminders"
          onPress={() => setConfirm(true)}
          disabled={sending}
          style={[styles.sendAllBtn, sending && { opacity: 0.6 }, { bottom: insets.bottom + 20 }]}
          activeOpacity={0.85}
        >
          {sending ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="paper-plane" size={16} color="#000" />
              <Text style={styles.sendAllText}>SEND {withPhone.length} REMINDERS</Text>
            </>
          )}
        </TouchableOpacity>
      ) : null}

      <Modal transparent visible={confirm} animationType="fade" onRequestClose={() => setConfirm(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setConfirm(false)}>
          <View style={styles.confirmCard}>
            <Ionicons name="warning" size={26} color={colors.warning} />
            <Text style={styles.confirmTitle}>SEND REMINDERS?</Text>
            <Text style={styles.confirmMsg}>
              This will dispatch {withPhone.length} WhatsApp messages using the currently configured provider (console-log mock unless changed).
            </Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 16 }}>
              <TouchableOpacity onPress={() => setConfirm(false)} style={styles.confirmCancel}>
                <Text style={styles.confirmCancelText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={sendAll} style={styles.confirmYes}>
                <Text style={styles.confirmYesText}>SEND ALL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 90 }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function SumTile({ label, value, color }: any) {
  return (
    <View style={styles.sumTile}>
      <Text style={styles.sumLabel}>{label}</Text>
      <Text style={[styles.sumValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingTop: 8, paddingBottom: 12,
  },
  backBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },

  summaryRow: { flexDirection: "row", gap: 8, marginHorizontal: 20, marginBottom: 12 },
  sumTile: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, padding: 12 },
  sumLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  sumValue: { fontSize: 22, fontWeight: "900", marginTop: 4 },

  noticeBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surface, padding: 12,
  },
  noticeText: { color: colors.textDim, fontSize: 11, flex: 1, lineHeight: 15 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyTitle: { color: colors.text, fontWeight: "900", marginTop: 12 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center", marginTop: 6 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    padding: 14, marginBottom: 8,
  },
  daysCol: {
    borderWidth: 1, borderColor: colors.danger, paddingVertical: 6, paddingHorizontal: 8,
    alignItems: "center", minWidth: 54,
  },
  daysNum: { color: colors.danger, fontWeight: "900", fontSize: 18 },
  daysLabel: { color: colors.danger, fontWeight: "900", fontSize: 8, letterSpacing: 1 },
  plate: { color: colors.text, fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  name: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  phone: { color: colors.textDim, fontSize: 12, marginTop: 4 },

  sendAllBtn: {
    position: "absolute", left: 20, right: 20,
    backgroundColor: colors.accent,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 10, paddingVertical: 14,
  },
  sendAllText: { color: "#000", fontWeight: "900", letterSpacing: 1.5, fontSize: 12 },

  modalBackdrop: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center", justifyContent: "center", padding: 24,
  },
  confirmCard: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    padding: 20, width: "100%", maxWidth: 380, alignItems: "center",
  },
  confirmTitle: {
    color: colors.text, fontSize: 16, fontWeight: "900",
    letterSpacing: 2, marginTop: 12, marginBottom: 8,
  },
  confirmMsg: { color: colors.textDim, fontSize: 13, textAlign: "center", lineHeight: 18 },
  confirmCancel: {
    flex: 1, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: "center",
  },
  confirmCancelText: { color: colors.textDim, fontWeight: "900", letterSpacing: 1.5 },
  confirmYes: {
    flex: 1, backgroundColor: colors.warning, paddingVertical: 12, alignItems: "center",
  },
  confirmYesText: { color: "#000", fontWeight: "900", letterSpacing: 1.5 },

  toast: {
    position: "absolute", left: 20, right: 20,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  toastText: { color: colors.text, fontWeight: "700", fontSize: 12, flex: 1 },
});
