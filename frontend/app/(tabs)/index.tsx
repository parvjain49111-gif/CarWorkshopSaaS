import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, statusColor, statusLabel } from "@/src/lib/theme";
import { StatusPill } from "@/src/components/ui";

type Stats = {
  total: number;
  pending: number;
  in_progress: number;
  completed: number;
  recent: any[];
};

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.stats();
      setStats(data);
    } catch (e) {
      console.warn("stats", e);
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

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="dashboard-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>WELCOME BACK</Text>
          <Text style={styles.name} testID="user-name">
            {user?.name?.split(" ")[0] || "Owner"}.
          </Text>
        </View>
        <View style={styles.roleBadge}>
          <View style={styles.roleDot} />
          <Text style={styles.roleText}>
            {(user?.role || "owner").toUpperCase()}
          </Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={
          <RefreshControl
            tintColor={colors.accent}
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <Text style={styles.heroLabel}>JOBS UNDER YOUR HOOD</Text>
              <Text style={styles.heroNumber} testID="total-jobs">
                {String(stats?.total ?? 0).padStart(2, "0")}
              </Text>
              <View style={styles.heroDivider} />
              <View style={styles.heroFooter}>
                <Ionicons name="time-outline" size={14} color={colors.accent} />
                <Text style={styles.heroFooterText}>
                  Live · auto-refreshes on focus
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <StatCell
                label="PENDING"
                value={stats?.pending ?? 0}
                color={colors.danger}
                icon="alert-circle"
                onPress={() => router.push({ pathname: "/jobs", params: { status: "pending" } })}
                testID="stat-pending"
              />
              <StatCell
                label="IN PROGRESS"
                value={stats?.in_progress ?? 0}
                color={colors.warning}
                icon="construct"
                onPress={() => router.push({ pathname: "/jobs", params: { status: "in_progress" } })}
                testID="stat-in-progress"
              />
              <StatCell
                label="DONE"
                value={stats?.completed ?? 0}
                color={colors.success}
                icon="checkmark-circle"
                onPress={() => router.push({ pathname: "/jobs", params: { status: "completed" } })}
                testID="stat-completed"
              />
            </View>

            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>RECENT INTAKES</Text>
              <TouchableOpacity onPress={() => router.push("/jobs")} testID="see-all-jobs">
                <Text style={styles.sectionLink}>VIEW ALL →</Text>
              </TouchableOpacity>
            </View>

            {!stats?.recent?.length ? (
              <View style={styles.emptyCard}>
                <Ionicons name="car-sport-outline" size={28} color={colors.textMuted} />
                <Text style={styles.emptyTitle}>No jobs yet</Text>
                <Text style={styles.emptySub}>
                  Tap the yellow + tab to log your first car intake.
                </Text>
                <TouchableOpacity
                  style={styles.emptyCta}
                  onPress={() => router.push("/(tabs)/add")}
                  testID="empty-add-cta"
                >
                  <Text style={styles.emptyCtaText}>START INTAKE</Text>
                </TouchableOpacity>
              </View>
            ) : (
              stats.recent.map((job) => (
                <TouchableOpacity
                  key={job.job_id}
                  testID={`recent-job-${job.job_id}`}
                  style={styles.jobCard}
                  onPress={() => router.push(`/job/${job.job_id}`)}
                  activeOpacity={0.85}
                >
                  <View
                    style={[
                      styles.jobAccent,
                      { backgroundColor: statusColor(job.status) },
                    ]}
                  />
                  <View style={{ flex: 1, padding: 14 }}>
                    <View style={styles.jobTopRow}>
                      <Text style={styles.jobCarNumber}>{job.car_number}</Text>
                      <StatusPill status={job.status} />
                    </View>
                    <Text style={styles.jobCarName} numberOfLines={1}>
                      {job.car_name}
                      {job.model_year ? ` · ${job.model_year}` : ""}
                    </Text>
                    <Text style={styles.jobCustomer}>
                      {job.customer_name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCell({
  label,
  value,
  color,
  icon,
  onPress,
  testID,
}: {
  label: string;
  value: number;
  color: string;
  icon: any;
  onPress: () => void;
  testID: string;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={styles.statCell}
      testID={testID}
    >
      <View style={[styles.statAccent, { backgroundColor: color }]} />
      <Ionicons name={icon} size={16} color={color} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 18,
  },
  greeting: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
  },
  name: { color: colors.text, fontSize: 30, fontWeight: "900", marginTop: 4 },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleDot: { width: 6, height: 6, backgroundColor: colors.accent, marginRight: 8 },
  roleText: { color: colors.text, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },

  loadingBox: { paddingVertical: 60, alignItems: "center" },

  heroCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    marginBottom: 14,
  },
  heroLabel: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 3,
  },
  heroNumber: {
    color: colors.text,
    fontSize: 88,
    fontWeight: "900",
    letterSpacing: -4,
    marginTop: 6,
    lineHeight: 92,
  },
  heroDivider: { height: 1, backgroundColor: colors.border, marginTop: 4, marginBottom: 12 },
  heroFooter: { flexDirection: "row", alignItems: "center", gap: 6 },
  heroFooterText: { color: colors.textDim, fontSize: 12 },

  statRow: { flexDirection: "row", gap: 8, marginBottom: 24 },
  statCell: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    overflow: "hidden",
  },
  statAccent: { position: "absolute", top: 0, left: 0, right: 0, height: 2 },
  statValue: { color: colors.text, fontSize: 28, fontWeight: "900", marginTop: 6 },
  statLabel: {
    color: colors.textDim,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    marginTop: 2,
  },

  sectionHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: { color: colors.text, fontSize: 14, fontWeight: "900", letterSpacing: 2 },
  sectionLink: { color: colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },

  emptyCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    paddingVertical: 36,
    paddingHorizontal: 20,
    alignItems: "center",
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "900",
    marginTop: 10,
  },
  emptySub: {
    color: colors.textDim,
    fontSize: 13,
    textAlign: "center",
    marginTop: 6,
    maxWidth: 260,
  },
  emptyCta: {
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 16,
  },
  emptyCtaText: { color: "#000", fontWeight: "900", letterSpacing: 2, fontSize: 12 },

  jobCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  jobAccent: { width: 4 },
  jobTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  jobCarNumber: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 1,
  },
  jobCarName: { color: colors.textDim, fontSize: 13, marginBottom: 4 },
  jobCustomer: { color: colors.textMuted, fontSize: 12 },
});
