import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { api } from "@/src/lib/api";
import { colors } from "@/src/lib/theme";

type Row = { label: string; count: number };
type Analytics = {
  total_jobs: number;
  status_counts: { pending: number; in_progress: number; completed: number };
  intake_7d: number;
  intake_30d: number;
  daily_series: { date: string; count: number }[];
  brands: Row[];
  references: Row[];
  issues: Row[];
  revenue_total: number;
  revenue_completed: number;
  parts_total: number;
  avg_turnaround_hours: number | null;
  completed_count: number;
  top_customers: Row[];
  mechanics: Row[];
  unique_customers: number;
};

export default function AnalyticsScreen() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await api.analytics();
      setData(d);
    } catch (e) {
      console.warn("analytics", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="analytics-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>FOUNDER VIEW</Text>
          <Text style={styles.title}>ANALYTICS</Text>
        </View>
        <Ionicons name="trending-up" size={26} color={colors.accent} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 20 }}
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
        {loading || !data ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            {/* KPI Row 1 */}
            <View style={styles.kpiRow}>
              <KpiTile
                label="THIS WEEK"
                value={data.intake_7d}
                hint="new intakes (7d)"
                accent={colors.accent}
                icon="calendar"
                testID="kpi-week"
              />
              <KpiTile
                label="THIS MONTH"
                value={data.intake_30d}
                hint="new intakes (30d)"
                accent={colors.text}
                icon="calendar-outline"
                testID="kpi-month"
              />
            </View>

            <View style={styles.kpiRow}>
              <KpiTile
                label="CUSTOMERS"
                value={data.unique_customers}
                hint="unique recorded"
                accent={colors.warning}
                icon="people"
                testID="kpi-customers"
              />
              <KpiTile
                label="ALL JOBS"
                value={data.total_jobs}
                hint="lifetime intake"
                accent={colors.success}
                icon="layers"
                testID="kpi-total"
              />
            </View>

            {/* Revenue + Turnaround */}
            <View style={styles.revCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.revLabel}>PARTS REVENUE</Text>
                <Text style={styles.revBig} testID="revenue-total">
                  ₹{formatNum(data.revenue_total)}
                </Text>
                <Text style={styles.revSub}>
                  ₹{formatNum(data.revenue_completed)} from completed ·{" "}
                  {data.parts_total} parts billed
                </Text>
              </View>
              <View style={styles.revDivider} />
              <View style={{ flex: 1 }}>
                <Text style={styles.revLabel}>AVG TURNAROUND</Text>
                <Text style={styles.revBig} testID="avg-turnaround">
                  {data.avg_turnaround_hours == null
                    ? "—"
                    : formatHours(data.avg_turnaround_hours)}
                </Text>
                <Text style={styles.revSub}>
                  across {data.completed_count} completed
                </Text>
              </View>
            </View>

            {/* 14-day intake trend */}
            <SectionHeader title="INTAKE · LAST 14 DAYS" />
            <View style={styles.trendCard}>
              <TrendChart series={data.daily_series} />
              <View style={styles.statusLegend}>
                <LegendDot color={colors.danger} label={`PENDING ${data.status_counts.pending}`} />
                <LegendDot color={colors.warning} label={`IN PROGRESS ${data.status_counts.in_progress}`} />
                <LegendDot color={colors.success} label={`COMPLETED ${data.status_counts.completed}`} />
              </View>
            </View>

            {/* Brands */}
            <SectionHeader title="TOP BRANDS · BY VOLUME" />
            <BarList
              rows={data.brands}
              emptyLabel="No vehicles logged yet."
              testIDPrefix="brand"
              barColor={colors.accent}
            />

            {/* Issues */}
            <SectionHeader title="TOP ISSUE KEYWORDS" />
            <BarList
              rows={data.issues}
              emptyLabel="Need a few customer problem descriptions first."
              testIDPrefix="issue"
              barColor={colors.warning}
            />

            {/* Reference sources */}
            <SectionHeader title="HOW CUSTOMERS REACH YOU" />
            <BarList
              rows={data.references}
              emptyLabel="No referral data yet."
              testIDPrefix="ref"
              barColor={colors.success}
            />

            {/* Returning customers */}
            <SectionHeader title="REPEAT CUSTOMERS · LOYALTY" />
            {data.top_customers.length === 0 ? (
              <EmptyHint text="No repeat customers yet. Once a name logs twice, they show up here." />
            ) : (
              data.top_customers.map((c) => (
                <View key={c.label} style={styles.loyaltyRow} testID={`loyal-${c.label}`}>
                  <Ionicons name="star" size={14} color={colors.accent} />
                  <Text style={styles.loyaltyName} numberOfLines={1}>
                    {c.label}
                  </Text>
                  <Text style={styles.loyaltyCount}>{c.count} visits</Text>
                </View>
              ))
            )}

            {/* Mechanic workload */}
            {data.mechanics.length > 0 ? (
              <>
                <SectionHeader title="MECHANIC WORKLOAD" />
                <BarList
                  rows={data.mechanics}
                  emptyLabel=""
                  testIDPrefix="mech"
                  barColor={colors.text}
                />
              </>
            ) : null}

            <Text style={styles.footer}>
              Pull down to refresh · all numbers are live.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function KpiTile({
  label,
  value,
  hint,
  accent,
  icon,
  testID,
}: {
  label: string;
  value: number;
  hint: string;
  accent: string;
  icon: any;
  testID: string;
}) {
  return (
    <View style={styles.kpi} testID={testID}>
      <View style={[styles.kpiAccent, { backgroundColor: accent }]} />
      <View style={styles.kpiHead}>
        <Text style={styles.kpiLabel}>{label}</Text>
        <Ionicons name={icon} size={14} color={accent} />
      </View>
      <Text style={[styles.kpiValue, { color: accent }]}>{value}</Text>
      <Text style={styles.kpiHint}>{hint}</Text>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function BarList({
  rows,
  emptyLabel,
  testIDPrefix,
  barColor,
}: {
  rows: Row[];
  emptyLabel: string;
  testIDPrefix: string;
  barColor: string;
}) {
  if (!rows || rows.length === 0) {
    return emptyLabel ? <EmptyHint text={emptyLabel} /> : null;
  }
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <View style={styles.barList}>
      {rows.map((r) => {
        const pct = Math.max(6, Math.round((r.count / max) * 100));
        return (
          <View key={r.label} style={styles.barRow} testID={`${testIDPrefix}-${r.label}`}>
            <Text style={styles.barLabel} numberOfLines={1}>
              {r.label}
            </Text>
            <View style={styles.barTrack}>
              <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
            </View>
            <Text style={styles.barCount}>{r.count}</Text>
          </View>
        );
      })}
    </View>
  );
}

function TrendChart({ series }: { series: { date: string; count: number }[] }) {
  const max = Math.max(...series.map((s) => s.count), 1);
  const total = series.reduce((sum, s) => sum + s.count, 0);

  return (
    <View>
      <View style={styles.trendHeader}>
        <Text style={styles.trendTotal}>{total}</Text>
        <Text style={styles.trendTotalLabel}>JOBS IN 14 DAYS</Text>
      </View>
      <View style={styles.trendBars}>
        {series.map((s, idx) => {
          const h = (s.count / max) * 90;
          const isToday = idx === series.length - 1;
          return (
            <View key={s.date} style={styles.trendCol}>
              <View style={styles.trendBarWrap}>
                <View
                  style={[
                    styles.trendBar,
                    {
                      height: Math.max(h, s.count > 0 ? 4 : 2),
                      backgroundColor: isToday ? colors.accent : `${colors.accent}66`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.trendDate}>{s.date.slice(-2)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <View style={styles.emptyBox}>
      <Ionicons name="information-circle-outline" size={16} color={colors.textMuted} />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function formatNum(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatHours(h: number): string {
  if (h < 24) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.5,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -1 },

  loadingBox: { paddingVertical: 60, alignItems: "center" },

  kpiRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  kpi: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    overflow: "hidden",
  },
  kpiAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  kpiHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  kpiLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  kpiValue: { fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  kpiHint: { color: colors.textDim, fontSize: 11, marginTop: 2 },

  revCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    marginTop: 6,
    marginBottom: 12,
    alignItems: "stretch",
  },
  revLabel: { color: colors.textMuted, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  revBig: { color: colors.text, fontSize: 26, fontWeight: "900", letterSpacing: -1, marginTop: 6 },
  revSub: { color: colors.textDim, fontSize: 11, marginTop: 4 },
  revDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: 14 },

  sectionHeader: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 22,
    marginBottom: 10,
  },

  trendCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  trendHeader: { marginBottom: 12 },
  trendTotal: { color: colors.text, fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  trendTotalLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  trendBars: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 110,
    gap: 4,
  },
  trendCol: { flex: 1, alignItems: "center" },
  trendBarWrap: { height: 90, justifyContent: "flex-end", width: "100%", alignItems: "center" },
  trendBar: { width: "70%", minHeight: 2 },
  trendDate: { color: colors.textMuted, fontSize: 9, marginTop: 4 },
  statusLegend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 8, height: 8 },
  legendLabel: { color: colors.textDim, fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },

  barList: { gap: 8 },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  barLabel: {
    width: 110,
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },
  barTrack: {
    flex: 1,
    height: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  barFill: { height: "100%" },
  barCount: {
    width: 32,
    textAlign: "right",
    color: colors.text,
    fontSize: 12,
    fontWeight: "900",
  },

  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyText: { color: colors.textDim, fontSize: 12, flex: 1 },

  loyaltyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 6,
  },
  loyaltyName: { color: colors.text, fontSize: 13, fontWeight: "700", flex: 1 },
  loyaltyCount: { color: colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 1 },

  footer: {
    color: colors.textMuted,
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 28,
  },
});
