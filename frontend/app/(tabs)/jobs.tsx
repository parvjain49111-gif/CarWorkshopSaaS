import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { api } from "@/src/lib/api";
import { colors, statusColor } from "@/src/lib/theme";
import { StatusPill } from "@/src/components/ui";

const STATUSES = [
  { key: "all", label: "ALL" },
  { key: "pending", label: "PENDING" },
  { key: "in_progress", label: "IN PROGRESS" },
  { key: "completed", label: "COMPLETED" },
];

export default function JobsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>(
    typeof params.status === "string" ? params.status : "all",
  );
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.listJobs({
        q: q || undefined,
        status: status === "all" ? undefined : status,
      });
      setJobs(data || []);
    } catch (e) {
      console.warn("jobs", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [q, status]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    if (typeof params.status === "string" && params.status !== status) {
      setStatus(params.status);
    }
  }, [params.status]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="jobs-screen">
      <View style={styles.header}>
        <Text style={styles.title}>JOBS</Text>
        <Text style={styles.count} testID="jobs-count">
          {jobs.length} TOTAL
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={colors.textMuted} />
        <TextInput
          testID="search-input"
          value={q}
          onChangeText={setQ}
          placeholder="Search car number, customer, model…"
          placeholderTextColor={colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="characters"
          returnKeyType="search"
        />
        {q ? (
          <TouchableOpacity onPress={() => setQ("")} testID="clear-search">
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={STATUSES}
        keyExtractor={(it) => it.key}
        style={styles.chipsRow}
        contentContainerStyle={styles.chipsContent}
        renderItem={({ item }) => {
          const active = status === item.key;
          const c = item.key === "all" ? colors.accent : statusColor(item.key);
          return (
            <TouchableOpacity
              testID={`filter-${item.key}`}
              onPress={() => setStatus(item.key)}
              style={[
                styles.chip,
                {
                  borderColor: active ? c : colors.border,
                  backgroundColor: active ? `${c}1F` : colors.surface,
                },
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? c : colors.textDim },
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : jobs.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="folder-open-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyTitle}>No jobs match this filter</Text>
          <Text style={styles.emptySub}>
            Try a different status or clear the search.
          </Text>
        </View>
      ) : (
        <FlatList
          data={jobs}
          keyExtractor={(item) => item.job_id}
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
              testID={`job-row-${item.job_id}`}
              style={styles.row}
              activeOpacity={0.85}
              onPress={() => router.push(`/job/${item.job_id}`)}
            >
              <View
                style={[
                  styles.rowAccent,
                  { backgroundColor: statusColor(item.status) },
                ]}
              />
              <View style={{ flex: 1, padding: 14 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.rowPlate}>{item.car_number}</Text>
                  <StatusPill status={item.status} />
                </View>
                <Text style={styles.rowCar} numberOfLines={1}>
                  {item.car_name}
                  {item.model_year ? ` · ${item.model_year}` : ""}
                </Text>
                <View style={styles.rowMeta}>
                  <Ionicons name="person-outline" size={12} color={colors.textMuted} />
                  <Text style={styles.rowMetaText}>{item.customer_name}</Text>
                  {item.reference ? (
                    <>
                      <View style={styles.metaDivider} />
                      <Ionicons name="people-outline" size={12} color={colors.textMuted} />
                      <Text style={styles.rowMetaText} numberOfLines={1}>
                        {item.reference}
                      </Text>
                    </>
                  ) : null}
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={colors.textMuted}
                style={{ alignSelf: "center", marginRight: 12 }}
              />
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { color: colors.text, fontSize: 30, fontWeight: "900", letterSpacing: -1 },
  count: { color: colors.textMuted, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    height: 44,
    gap: 8,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 14 },
  chipsRow: {
    maxHeight: 56,
    marginTop: 12,
    marginBottom: 6,
  },
  chipsContent: {
    paddingHorizontal: 20,
    gap: 8,
    alignItems: "center",
    height: 56,
  },
  chip: {
    height: 36,
    paddingHorizontal: 14,
    borderWidth: 1,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipText: { fontSize: 11, fontWeight: "900", letterSpacing: 1.5 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 16, marginTop: 12 },
  emptySub: { color: colors.textDim, fontSize: 13, marginTop: 4, textAlign: "center" },
  row: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
    overflow: "hidden",
  },
  rowAccent: { width: 4 },
  rowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  rowPlate: { color: colors.text, fontSize: 17, fontWeight: "900", letterSpacing: 1 },
  rowCar: { color: colors.textDim, fontSize: 13, marginBottom: 8 },
  rowMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  rowMetaText: { color: colors.textMuted, fontSize: 12 },
  metaDivider: { width: 1, height: 12, backgroundColor: colors.border, marginHorizontal: 6 },
});
