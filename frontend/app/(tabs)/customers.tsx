import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { colors } from "@/src/lib/theme";

type Customer = {
  customer_name: string;
  customer_phone?: string | null;
  visits: number;
  lifetime_value: number;
  outstanding: number;
  last_visit?: string | null;
  vehicles: { car_number: string; car_name?: string }[];
};

export default function CustomersScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Customer[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listCustomers(q || undefined);
      setItems(data || []);
    } catch (e) {
      console.warn("customers", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const totalLifetime = items.reduce((s, c) => s + (c.lifetime_value || 0), 0);
  const totalOutstanding = items.reduce((s, c) => s + (c.outstanding || 0), 0);

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="customers-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>CRM</Text>
          <Text style={styles.title}>CUSTOMERS</Text>
        </View>
        <View style={styles.headKpi}>
          <Text style={styles.headKpiValue}>{items.length}</Text>
          <Text style={styles.headKpiLabel}>UNIQUE</Text>
        </View>
      </View>

      <View style={styles.kpiRow}>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>LIFETIME REVENUE</Text>
          <Text style={[styles.kpiValue, { color: colors.success }]}>
            ₹{formatNum(totalLifetime)}
          </Text>
        </View>
        <View style={styles.kpi}>
          <Text style={styles.kpiLabel}>OUTSTANDING</Text>
          <Text style={[styles.kpiValue, { color: colors.danger }]}>
            ₹{formatNum(totalOutstanding)}
          </Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          testID="customer-search"
          value={q}
          onChangeText={setQ}
          placeholder="Search name, phone, plate…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ("")}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No customers yet</Text>
          <Text style={styles.emptySub}>
            Log your first intake — customers auto-populate here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(c) => `${c.customer_name}-${c.customer_phone || ""}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}
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
            <TouchableOpacity
              testID={`customer-${item.customer_name}`}
              onPress={() =>
                router.push(
                  `/customer/${encodeURIComponent(
                    item.customer_phone || item.customer_name,
                  )}`,
                )
              }
              activeOpacity={0.85}
              style={styles.row}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.customer_name.slice(0, 2).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.customer_name}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  {item.customer_phone || "no phone"} · {item.visits} visit{item.visits === 1 ? "" : "s"}
                </Text>
                <View style={styles.tagRow}>
                  {item.vehicles.slice(0, 3).map((v) => (
                    <View key={v.car_number} style={styles.tag}>
                      <Text style={styles.tagText}>{v.car_number}</Text>
                    </View>
                  ))}
                  {item.vehicles.length > 3 ? (
                    <Text style={styles.moreTag}>+{item.vehicles.length - 3}</Text>
                  ) : null}
                </View>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.value}>₹{formatNum(item.lifetime_value)}</Text>
                {item.outstanding > 0 ? (
                  <Text style={styles.outstanding}>
                    ₹{formatNum(item.outstanding)} due
                  </Text>
                ) : (
                  <Text style={styles.paid}>PAID</Text>
                )}
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
  },
  eyebrow: { color: colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 2.5 },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  headKpi: { alignItems: "flex-end" },
  headKpiValue: { color: colors.text, fontSize: 24, fontWeight: "900" },
  headKpiLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },

  kpiRow: { flexDirection: "row", gap: 10, marginHorizontal: 20, marginBottom: 12 },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  kpiLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  kpiValue: { fontSize: 20, fontWeight: "900", marginTop: 4 },

  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyTitle: { color: colors.text, fontWeight: "900", marginTop: 12 },
  emptySub: { color: colors.textDim, fontSize: 13, textAlign: "center", marginTop: 6 },

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
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.accent, fontWeight: "900", fontSize: 13, letterSpacing: 1 },
  name: { color: colors.text, fontWeight: "900", fontSize: 14 },
  meta: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  tagRow: { flexDirection: "row", gap: 4, marginTop: 6, flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tagText: { color: colors.textDim, fontSize: 9, fontWeight: "900", letterSpacing: 0.5 },
  moreTag: { color: colors.textMuted, fontSize: 10, fontWeight: "700", alignSelf: "center" },
  value: { color: colors.text, fontWeight: "900", fontSize: 15 },
  outstanding: { color: colors.danger, fontSize: 11, fontWeight: "800", marginTop: 2 },
  paid: { color: colors.success, fontSize: 10, fontWeight: "900", letterSpacing: 1, marginTop: 2 },
});
