import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { colors, statusColor, statusLabel } from "@/src/lib/theme";
import { StatusPill } from "@/src/components/ui";

type CustomerDetail = {
  customer_name: string;
  customer_phone?: string | null;
  visits: number;
  lifetime_value: number;
  outstanding: number;
  vehicles: any[];
  jobs: any[];
};

export default function CustomerDetailScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.getCustomer(decodeURIComponent(key as string));
      setData(d);
    } catch (e) {
      console.warn("customer", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [key]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="customer-detail-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>CUSTOMER</Text>
          <Text style={styles.title} numberOfLines={1}>{data?.customer_name || "…"}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : !data ? (
        <View style={styles.center}>
          <Text style={{ color: colors.textDim }}>Not found</Text>
        </View>
      ) : (
        <ScrollView
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
        >
          <View style={styles.hero}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{data.customer_name.slice(0, 2).toUpperCase()}</Text>
            </View>
            {data.customer_phone ? (
              <Text style={styles.phone}>📞 {data.customer_phone}</Text>
            ) : null}
          </View>

          <View style={styles.kpiRow}>
            <Kpi label="VISITS" value={String(data.visits)} color={colors.accent} />
            <Kpi label="LIFETIME" value={`₹${formatNum(data.lifetime_value)}`} color={colors.success} />
            <Kpi
              label="OUTSTANDING"
              value={`₹${formatNum(data.outstanding)}`}
              color={data.outstanding > 0 ? colors.danger : colors.textDim}
            />
          </View>

          <Text style={styles.section}>VEHICLES · {data.vehicles.length}</Text>
          {data.vehicles.map((v: any) => (
            <View key={v.car_number} style={styles.vCard} testID={`vehicle-${v.car_number}`}>
              <Ionicons name="car-sport" size={18} color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.vPlate}>{v.car_number}</Text>
                <Text style={styles.vName}>
                  {v.car_name}{v.model_year ? ` · ${v.model_year}` : ""}
                </Text>
                {v.odometer_km ? (
                  <Text style={styles.vMeta}>Last ODO: {v.odometer_km} km</Text>
                ) : null}
              </View>
            </View>
          ))}

          <Text style={styles.section}>SERVICE HISTORY · {data.jobs.length}</Text>
          {data.jobs.map((j: any) => (
            <TouchableOpacity
              key={j.job_id}
              testID={`hist-${j.job_id}`}
              onPress={() => router.push(`/job/${j.job_id}`)}
              activeOpacity={0.85}
              style={styles.jobRow}
            >
              <View
                style={[styles.jobAccent, { backgroundColor: statusColor(j.status) }]}
              />
              <View style={{ flex: 1, padding: 14 }}>
                <View style={styles.jobHead}>
                  <Text style={styles.jobCard}>{j.job_card_no || j.car_number}</Text>
                  <StatusPill status={j.status} />
                </View>
                <Text style={styles.jobProblem} numberOfLines={2}>
                  {j.customer_problems}
                </Text>
                <View style={styles.jobFoot}>
                  <Text style={styles.jobFootText}>
                    {(j.created_at || "").slice(0, 10)}
                  </Text>
                  {j.total_amount ? (
                    <Text style={styles.jobFootAmt}>
                      ₹{j.total_amount.toFixed(0)}
                    </Text>
                  ) : null}
                  <Text
                    style={[
                      styles.jobPay,
                      {
                        color:
                          j.payment_status === "paid"
                            ? colors.success
                            : j.payment_status === "partial"
                            ? colors.warning
                            : colors.danger,
                      },
                    ]}
                  >
                    {(j.payment_status || "unpaid").toUpperCase()}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Kpi({ label, value, color }: any) {
  return (
    <View style={styles.kpi}>
      <Text style={styles.kpiLabel}>{label}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
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
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  hero: { alignItems: "center", paddingVertical: 20 },
  avatar: {
    width: 84,
    height: 84,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: colors.accent, fontSize: 24, fontWeight: "900" },
  phone: { color: colors.textDim, marginTop: 12, fontSize: 13 },

  kpiRow: { flexDirection: "row", gap: 8, marginBottom: 8 },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
  },
  kpiLabel: { color: colors.textMuted, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  kpiValue: { fontSize: 18, fontWeight: "900", marginTop: 4, letterSpacing: -0.5 },

  section: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 22,
    marginBottom: 10,
  },

  vCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  vPlate: { color: colors.text, fontWeight: "900", fontSize: 14, letterSpacing: 1 },
  vName: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  vMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },

  jobRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    overflow: "hidden",
  },
  jobAccent: { width: 4 },
  jobHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  jobCard: { color: colors.text, fontWeight: "900", fontSize: 13, letterSpacing: 0.5 },
  jobProblem: { color: colors.textDim, fontSize: 12, lineHeight: 16 },
  jobFoot: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 },
  jobFootText: { color: colors.textMuted, fontSize: 11, flex: 1 },
  jobFootAmt: { color: colors.text, fontWeight: "900", fontSize: 12 },
  jobPay: { fontSize: 10, fontWeight: "900", letterSpacing: 1 },
});
