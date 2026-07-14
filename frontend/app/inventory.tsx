import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput,
  ActivityIndicator, RefreshControl, Modal, Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";
import { storage } from "@/src/utils/storage";

type Part = {
  part_id: string;
  part_number: string;
  name: string;
  category?: string;
  brand?: string;
  supplier?: string;
  purchase_price?: number;
  mrp?: number;
  gst?: number;
  quantity: number;
  minimum_stock?: number;
  warehouse_location?: string;
};

const EMPTY_FORM: Partial<Part> = {
  part_number: "",
  name: "",
  category: "",
  brand: "",
  supplier: "",
  purchase_price: 0,
  mrp: 0,
  gst: 18,
  quantity: 0,
  minimum_stock: 0,
  warehouse_location: "",
};

const BASE = process.env.EXPO_PUBLIC_BACKEND_URL || "";

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [items, setItems] = useState<Part[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editing, setEditing] = useState<Partial<Part> | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const canEdit = ["owner", "manager", "accountant"].includes(user?.role || "");
  const canDelete = user?.role === "owner";

  const load = useCallback(async () => {
    try {
      const [rows, sum] = await Promise.all([
        api.listParts(q || undefined),
        api.partsSummary().catch(() => null),
      ]);
      setItems(rows || []);
      setSummary(sum);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const showToast = (msg: string, ms = 3000) => {
    setToast(msg);
    setTimeout(() => setToast(null), ms);
  };

  const saveEdit = async () => {
    if (!editing || saving) return;
    if (!editing.part_number?.trim() || !editing.name?.trim()) {
      showToast("Part number and name are required");
      return;
    }
    setSaving(true);
    try {
      const body: any = { ...editing };
      ["purchase_price", "mrp", "gst", "quantity", "minimum_stock"].forEach((k) => {
        if (typeof body[k] === "string") body[k] = parseFloat(body[k]) || 0;
      });
      if (editing.part_id) {
        await api.updatePart(editing.part_id, body);
        showToast("Part updated");
      } else {
        await api.createPart(body);
        showToast("Part added");
      }
      setEditing(null);
      load();
    } catch (e: any) {
      showToast(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const removePart = async (p: Part) => {
    if (!canDelete) return;
    setSaving(true);
    try {
      await api.deletePart(p.part_id);
      setItems((prev) => prev.filter((x) => x.part_id !== p.part_id));
      setEditing(null);
      showToast(`${p.name} deleted`);
    } catch (e: any) {
      showToast(e?.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  const exportXlsx = async () => {
    try {
      const tokenRaw = Platform.OS === "web"
        ? await storage.getItem<string>("workshop_session_token", "")
        : await storage.secureGet<string>("workshop_session_token", "");
      const token = (tokenRaw as string) || "";
      const res = await fetch(`${BASE}/api/parts/export.xlsx`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (Platform.OS === "web") {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parts_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        showToast("Excel downloaded — check Downloads folder");
      } else {
        showToast("Excel share not yet enabled on mobile — use web export");
      }
    } catch (e: any) {
      showToast(e?.message || "Export failed");
    }
  };

  const setF = <K extends keyof Part>(k: K, v: any) =>
    setEditing((p) => (p ? { ...p, [k]: v } : p));

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="inventory-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>WAREHOUSE</Text>
          <Text style={styles.title}>INVENTORY</Text>
        </View>
        {canEdit ? (
          <TouchableOpacity
            testID="add-part-btn"
            onPress={() => setEditing({ ...EMPTY_FORM })}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={22} color="#000" />
          </TouchableOpacity>
        ) : null}
      </View>

      {summary ? (
        <View style={styles.summaryRow}>
          <SumTile label="PARTS" value={summary.total_parts} color={colors.text} />
          <SumTile label="LOW STOCK" value={summary.low_stock_count} color={colors.danger} />
          <SumTile label="VALUE" value={`₹${formatNum(summary.inventory_value)}`} color={colors.success} />
        </View>
      ) : null}

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          testID="parts-search"
          value={q}
          onChangeText={setQ}
          placeholder="Part number, name, brand…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
        />
        <TouchableOpacity onPress={exportXlsx} style={styles.exportSmall} testID="export-parts-btn">
          <Ionicons name="download" size={14} color={colors.accent} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="cube-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No parts in inventory</Text>
          {canEdit ? (
            <TouchableOpacity onPress={() => setEditing({ ...EMPTY_FORM })} style={styles.emptyCta}>
              <Text style={styles.emptyCtaText}>ADD YOUR FIRST PART</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(p) => p.part_id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 40 }}
          refreshControl={
            <RefreshControl
              tintColor={colors.accent}
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); load(); }}
            />
          }
          renderItem={({ item }) => {
            const low = item.minimum_stock && item.quantity <= item.minimum_stock;
            return (
              <TouchableOpacity
                testID={`part-${item.part_id}`}
                onPress={() => canEdit && setEditing(item)}
                activeOpacity={0.85}
                style={[styles.row, low && { borderColor: colors.danger }]}
              >
                <View
                  style={[
                    styles.stockBox,
                    { borderColor: low ? colors.danger : colors.success },
                  ]}
                >
                  <Text
                    style={[
                      styles.stockNum,
                      { color: low ? colors.danger : colors.success },
                    ]}
                  >
                    {item.quantity}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.pn}>{item.part_number}</Text>
                  <View style={styles.metaRow}>
                    {item.brand ? <Text style={styles.meta}>{item.brand}</Text> : null}
                    {item.category ? <Text style={styles.meta}>· {item.category}</Text> : null}
                    {low ? <Text style={styles.lowTag}>LOW · min {item.minimum_stock}</Text> : null}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  {item.mrp ? <Text style={styles.mrp}>₹{item.mrp}</Text> : null}
                  {canEdit ? <Ionicons name="pencil" size={14} color={colors.textMuted} /> : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}

      <Modal transparent visible={!!editing} animationType="slide" onRequestClose={() => setEditing(null)}>
        <View style={styles.modalRoot}>
          <SafeAreaView style={styles.modalCard} edges={["bottom"]}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {editing?.part_id ? "EDIT PART" : "NEW PART"}
              </Text>
              <TouchableOpacity onPress={() => setEditing(null)} hitSlop={10}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <KeyboardAwareScrollView
              bottomOffset={20}
              contentContainerStyle={{ padding: 20 }}
            >
              <F label="PART NUMBER *" value={editing?.part_number || ""} onChange={(v: string) => setF("part_number", v.toUpperCase())} testID="part-number-input" autoCapitalize="characters" />
              <F label="NAME *" value={editing?.name || ""} onChange={(v: string) => setF("name", v)} testID="part-name-input" />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <F label="CATEGORY" value={editing?.category || ""} onChange={(v: string) => setF("category", v)} />
                </View>
                <View style={{ flex: 1 }}>
                  <F label="BRAND" value={editing?.brand || ""} onChange={(v: string) => setF("brand", v)} />
                </View>
              </View>
              <F label="SUPPLIER" value={editing?.supplier || ""} onChange={(v: string) => setF("supplier", v)} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <F label="PURCHASE ₹" value={String(editing?.purchase_price ?? 0)} onChange={(v: string) => setF("purchase_price", v)} keyboardType="numeric" />
                </View>
                <View style={{ flex: 1 }}>
                  <F label="MRP ₹" value={String(editing?.mrp ?? 0)} onChange={(v: string) => setF("mrp", v)} keyboardType="numeric" />
                </View>
                <View style={{ width: 70 }}>
                  <F label="GST %" value={String(editing?.gst ?? 18)} onChange={(v: string) => setF("gst", v)} keyboardType="numeric" />
                </View>
              </View>
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <F label="STOCK QTY *" value={String(editing?.quantity ?? 0)} onChange={(v: string) => setF("quantity", v)} keyboardType="numeric" testID="part-qty-input" />
                </View>
                <View style={{ flex: 1 }}>
                  <F label="MIN STOCK" value={String(editing?.minimum_stock ?? 0)} onChange={(v: string) => setF("minimum_stock", v)} keyboardType="numeric" />
                </View>
              </View>
              <F label="LOCATION / RACK" value={editing?.warehouse_location || ""} onChange={(v: string) => setF("warehouse_location", v)} />

              <TouchableOpacity
                testID="save-part"
                onPress={saveEdit}
                disabled={saving}
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              >
                {saving ? <ActivityIndicator color="#000" /> : (
                  <>
                    <Ionicons name="save" size={16} color="#000" />
                    <Text style={styles.saveText}>SAVE PART</Text>
                  </>
                )}
              </TouchableOpacity>

              {editing?.part_id && canDelete ? (
                <TouchableOpacity
                  testID="delete-part"
                  onPress={() => editing && removePart(editing as Part)}
                  disabled={saving}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                  <Text style={styles.deleteText}>DELETE PART</Text>
                </TouchableOpacity>
              ) : null}
            </KeyboardAwareScrollView>
          </SafeAreaView>
        </View>
      </Modal>

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 20 }]}>
          <Ionicons name="information-circle" size={16} color={colors.accent} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function F({ label, value, onChange, testID, ...rest }: any) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        testID={testID}
        value={value}
        onChangeText={onChange}
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...rest}
      />
    </View>
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

function formatNum(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
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
  title: { color: colors.text, fontSize: 22, fontWeight: "900" },
  addBtn: {
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    backgroundColor: colors.accent,
  },

  summaryRow: { flexDirection: "row", gap: 8, marginHorizontal: 20, marginBottom: 12 },
  sumTile: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    padding: 12,
  },
  sumLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  sumValue: { fontSize: 18, fontWeight: "900", marginTop: 4 },

  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginBottom: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  exportSmall: {
    width: 32, height: 32, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.accent,
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyTitle: { color: colors.text, fontWeight: "900", marginTop: 12 },
  emptyCta: {
    backgroundColor: colors.accent, paddingHorizontal: 24, paddingVertical: 12, marginTop: 16,
  },
  emptyCtaText: { color: "#000", fontWeight: "900", letterSpacing: 2, fontSize: 12 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    padding: 12, marginBottom: 8,
  },
  stockBox: {
    width: 50, height: 50, borderWidth: 2, alignItems: "center", justifyContent: "center",
  },
  stockNum: { fontSize: 18, fontWeight: "900" },
  name: { color: colors.text, fontWeight: "900", fontSize: 14 },
  pn: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  metaRow: { flexDirection: "row", gap: 6, marginTop: 4, flexWrap: "wrap" },
  meta: { color: colors.textMuted, fontSize: 11 },
  lowTag: {
    color: colors.danger, fontSize: 9, fontWeight: "900", letterSpacing: 1.2,
    borderWidth: 1, borderColor: colors.danger, paddingHorizontal: 4, paddingVertical: 1,
  },
  mrp: { color: colors.text, fontWeight: "900", fontSize: 14 },

  modalRoot: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.bg, borderTopWidth: 1, borderColor: colors.border, maxHeight: "92%" },
  modalHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10, borderBottomWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: { color: colors.text, fontSize: 16, fontWeight: "900", letterSpacing: 1.5 },

  field: { marginBottom: 12 },
  fieldLabel: {
    color: colors.textMuted, fontSize: 10, fontWeight: "800",
    letterSpacing: 1.5, marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    color: colors.text, paddingHorizontal: 12, paddingVertical: 12, fontSize: 14,
  },

  saveBtn: {
    backgroundColor: colors.accent, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10, paddingVertical: 16, marginTop: 10,
  },
  saveText: { color: "#000", fontWeight: "900", letterSpacing: 2 },
  deleteBtn: {
    borderWidth: 1, borderColor: colors.danger, paddingVertical: 12,
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10,
  },
  deleteText: { color: colors.danger, fontWeight: "900", letterSpacing: 1.5 },

  toast: {
    position: "absolute", left: 20, right: 20,
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  toastText: { color: colors.text, fontWeight: "700", fontSize: 12, flex: 1 },
});
