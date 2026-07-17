import { useCallback, useEffect, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, RefreshControl,
  TouchableOpacity, Image, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, radius, shadow, font, statusColor, statusShort } from "@/src/lib/theme";
import { Card, Skeleton, EmptyState } from "@/src/components/kit";

type Stats = {
  total: number;
  open: number;
  working: number;
  ready: number;
  delivered: number;
  by_status: Record<string, number>;
  recent: any[];
};

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [settings, setSettings] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [s, sett, a] = await Promise.all([
        api.stats(),
        api.getSettings().catch(() => ({})),
        api.analytics().catch(() => null),
      ]);
      setStats(s);
      setSettings(sett);
      setAnalytics(a);
    } catch (e) { console.warn("dashboard", e); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => { load(); }, [load]);

  const greeting = getGreeting();
  const workshopName = settings?.workshop_name || "WorkshopOps";
  const first = (user?.name || "").split(" ")[0];
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" });
  const carsInside = stats ? stats.open + stats.working + stats.ready : 0;
  const revenueToday = analytics?.revenue_completed || 0;

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="dashboard-screen">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            tintColor={colors.accent}
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(); }}
          />
        }
      >
        {/* -------- Header -------- */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="car-sport" size={22} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.workshop} numberOfLines={1}>{workshopName}</Text>
            <Text style={styles.today}>{today}</Text>
          </View>
          <TouchableOpacity style={styles.iconBtn} onPress={() => router.push("/reminders")} testID="header-notif">
            <Ionicons name="notifications-outline" size={20} color={colors.text} />
            {analytics?.top_customers?.length ? <View style={styles.dot} /> : null}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(tabs)/profile")} testID="header-avatar">
            {user?.picture ? (
              <Image source={{ uri: user.picture }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>
                  {(first || "?").slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* -------- Greeting Hero -------- */}
        <View style={styles.hero}>
          <Text style={styles.greeting}>{greeting}, {first || "there"} 👋</Text>
          <Text style={styles.subGreeting}>Here is what is happening at your workshop today.</Text>
        </View>

        {/* -------- Summary Grid -------- */}
        <View style={styles.summaryWrap}>
          <View style={styles.summaryHead}>
            <Text style={styles.sectionTitle}>Today Overview</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/analytics")}>
              <Text style={styles.viewAll}>Analytics →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.grid}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} height={100} width="48%" style={{ marginBottom: 10 }} />)}
            </View>
          ) : (
            <View style={styles.grid}>
              <SummaryTile
                testID="tile-revenue"
                icon="cash"
                iconBg={colors.successSoft}
                iconColor={colors.success}
                label="Revenue (Delivered)"
                value={`₹${formatNum(revenueToday)}`}
                onPress={() => router.push("/(tabs)/analytics")}
              />
              <SummaryTile
                testID="tile-inside"
                icon="car-sport"
                iconBg={colors.accentSoft}
                iconColor={colors.accent}
                label="Cars Inside"
                value={String(carsInside)}
                onPress={() => router.push({ pathname: "/(tabs)/jobs", params: {} })}
              />
              <SummaryTile
                testID="tile-delivered"
                icon="checkmark-done-circle"
                iconBg={colors.successSoft}
                iconColor={colors.success}
                label="Delivered"
                value={String(stats?.delivered ?? 0)}
                onPress={() => router.push({ pathname: "/(tabs)/jobs", params: { status: "delivered" } })}
              />
              <SummaryTile
                testID="tile-ready"
                icon="flag"
                iconBg={colors.warningSoft}
                iconColor={colors.warning}
                label="Ready for Pickup"
                value={String(stats?.ready ?? 0)}
                onPress={() => router.push({ pathname: "/(tabs)/jobs", params: { status: "ready_for_delivery" } })}
              />
              <SummaryTile
                testID="tile-total"
                icon="documents"
                iconBg={colors.accentSoft}
                iconColor={colors.accent}
                label="Total Job Cards"
                value={String(stats?.total ?? 0)}
                onPress={() => router.push("/(tabs)/jobs")}
              />
              <SummaryTile
                testID="tile-customers"
                icon="people"
                iconBg={`${colors.violet}20`}
                iconColor={colors.violet}
                label="Customers"
                value={String(analytics?.unique_customers ?? 0)}
                onPress={() => router.push("/(tabs)/customers")}
              />
            </View>
          )}
        </View>

        {/* -------- Quick Actions -------- */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <ActionTile testID="qa-intake" icon="add-circle" label="New Job" onPress={() => router.push("/(tabs)/add")} primary />
            <ActionTile testID="qa-search" icon="search" label="Search" onPress={() => router.push("/(tabs)/jobs")} />
            <ActionTile testID="qa-inventory" icon="cube" label="Parts" onPress={() => router.push("/inventory")} />
            <ActionTile testID="qa-staff" icon="people-circle" label="Staff" onPress={() => router.push("/staff")} />
            <ActionTile testID="qa-reports" icon="stats-chart" label="Reports" onPress={() => router.push("/(tabs)/analytics")} />
            <ActionTile testID="qa-crm" icon="briefcase" label="CRM" onPress={() => router.push("/(tabs)/customers")} />
            <ActionTile testID="qa-remind" icon="megaphone" label="Reminders" onPress={() => router.push("/reminders")} />
            <ActionTile testID="qa-settings" icon="settings-sharp" label="Settings" onPress={() => router.push("/settings")} />
          </View>
        </View>

        {/* -------- Recent Activity -------- */}
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push("/(tabs)/jobs")} testID="see-all-jobs">
              <Text style={styles.viewAll}>See all →</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={{ gap: 10 }}>
              {[...Array(3)].map((_, i) => <Skeleton key={i} height={72} />)}
            </View>
          ) : !stats?.recent?.length ? (
            <EmptyState
              icon="car-sport-outline"
              title="No jobs yet"
              message="Log your first vehicle intake to see activity here."
              cta="+ NEW JOB CARD"
              onCta={() => router.push("/(tabs)/add")}
            />
          ) : (
            stats.recent.map((job) => (
              <Card
                key={job.job_id}
                testID={`recent-${job.job_id}`}
                onPress={() => router.push(`/job/${job.job_id}`)}
                style={styles.jobCard}
              >
                <View style={styles.jobRow}>
                  <View style={[styles.jobIconBox, { backgroundColor: `${statusColor(job.status)}20` }]}>
                    <Ionicons name="car-sport" size={20} color={statusColor(job.status)} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobPlate}>{job.car_number}</Text>
                    <Text style={styles.jobCustomer} numberOfLines={1}>
                      {job.customer_name || "—"} · {job.car_name}
                    </Text>
                  </View>
                  <View style={styles.jobRight}>
                    <View style={[styles.pill, { backgroundColor: `${statusColor(job.status)}20` }]}>
                      <View style={[styles.pillDot, { backgroundColor: statusColor(job.status) }]} />
                      <Text style={[styles.pillText, { color: statusColor(job.status) }]}>{statusShort(job.status)}</Text>
                    </View>
                    {job.total_amount ? (
                      <Text style={styles.jobAmount}>₹{Number(job.total_amount).toFixed(0)}</Text>
                    ) : null}
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryTile({ icon, iconBg, iconColor, label, value, onPress, testID }: any) {
  return (
    <Card testID={testID} onPress={onPress} style={styles.tile}>
      <View style={[styles.tileIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <Text style={styles.tileValue}>{value}</Text>
      <Text style={styles.tileLabel} numberOfLines={1}>{label}</Text>
    </Card>
  );
}

function ActionTile({ icon, label, onPress, primary, testID }: any) {
  return (
    <TouchableOpacity
      testID={testID}
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.actionTile, primary && styles.actionTilePrimary]}
    >
      <View style={[styles.actionIcon, primary && { backgroundColor: "rgba(0,0,0,0.15)" }]}>
        <Ionicons name={icon} size={22} color={primary ? colors.accentContrast : colors.accent} />
      </View>
      <Text style={[styles.actionLabel, primary && { color: colors.accentContrast }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatNum(n: number): string {
  if (n >= 100000) return `${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return Math.round(n).toLocaleString();
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },

  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10,
  },
  logoBadge: {
    width: 44, height: 44, borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
  },
  workshop: { color: colors.text, ...font.h4, letterSpacing: -0.2 },
  today: { color: colors.textDim, fontSize: 11, marginTop: 2 },
  iconBtn: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  dot: {
    position: "absolute", top: 8, right: 8,
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent,
    borderWidth: 2, borderColor: colors.bg,
  },
  avatar: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.surface },
  avatarFallback: { alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: colors.accent, fontSize: 12, fontWeight: "900", letterSpacing: 1 },

  hero: {
    paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20,
  },
  greeting: { ...font.h1, color: colors.text, fontSize: 26 },
  subGreeting: { color: colors.textDim, ...font.body, marginTop: 6 },

  summaryWrap: { paddingHorizontal: 20, marginBottom: 8 },
  summaryHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: { color: colors.text, ...font.h3 },
  viewAll: { color: colors.accent, ...font.caption, fontWeight: "800" },
  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: 12,
  },

  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    width: "48%",
    padding: 14,
  },
  tileIcon: {
    width: 34, height: 34, borderRadius: radius.sm,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  tileValue: { color: colors.text, ...font.h2, fontSize: 22, marginBottom: 2 },
  tileLabel: { color: colors.textDim, fontSize: 12, fontWeight: "600" },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionTile: {
    width: "23.5%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    paddingVertical: 10,
    ...shadow.sm,
  },
  actionTilePrimary: { backgroundColor: colors.accent },
  actionIcon: {
    width: 40, height: 40, borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: 6,
  },
  actionLabel: { color: colors.text, fontSize: 10, fontWeight: "700" },

  jobCard: { marginBottom: 10, padding: 14 },
  jobRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  jobIconBox: {
    width: 44, height: 44, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
  },
  jobPlate: { color: colors.text, ...font.h4, letterSpacing: 0.5 },
  jobCustomer: { color: colors.textDim, fontSize: 12, marginTop: 2 },
  jobRight: { alignItems: "flex-end", gap: 4 },
  jobAmount: { color: colors.text, ...font.bodyStrong },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill,
  },
  pillDot: { width: 5, height: 5, borderRadius: 3 },
  pillText: { fontSize: 9, fontWeight: "900", letterSpacing: 0.8 },
});
