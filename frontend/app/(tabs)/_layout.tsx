import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { View, StyleSheet, Text } from "react-native";

import { colors, radius, shadow } from "@/src/lib/theme";

function TabIcon({ icon, focused, label, primary }: { icon: any; focused: boolean; label: string; primary?: boolean }) {
  if (primary) {
    return (
      <View style={styles.fabWrap}>
        <View style={styles.fab}>
          <Ionicons name={icon} size={26} color="#fff" />
        </View>
      </View>
    );
  }
  return (
    <View style={styles.tabInner}>
      <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
        <Ionicons name={icon} size={focused ? 22 : 20} color={focused ? colors.accent : colors.textMuted} />
      </View>
      <Text style={[styles.tabLabel, focused && { color: colors.accent }]} numberOfLines={1}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopWidth: 0,
          height: 68 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
          ...shadow.lg,
        },
      }}
    >
      <Tabs.Screen name="index" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="grid" focused={focused} label="Home" />,
      }} />
      <Tabs.Screen name="jobs" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="briefcase" focused={focused} label="Jobs" />,
      }} />
      <Tabs.Screen name="add" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="add" focused={focused} label="Intake" primary />,
      }} />
      <Tabs.Screen name="analytics" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="stats-chart" focused={focused} label="Stats" />,
      }} />
      <Tabs.Screen name="customers" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="people" focused={focused} label="CRM" />,
      }} />
      <Tabs.Screen name="profile" options={{
        tabBarIcon: ({ focused }) => <TabIcon icon="menu" focused={focused} label="More" />,
      }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabInner: { alignItems: "center", justifyContent: "center", gap: 2, minWidth: 50 },
  iconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconWrapActive: { backgroundColor: colors.accentSoft },
  tabLabel: { fontSize: 9, fontWeight: "800", color: colors.textMuted, letterSpacing: 0.5 },
  fabWrap: {
    alignItems: "center", justifyContent: "center",
    marginTop: -18,
  },
  fab: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.accent,
    alignItems: "center", justifyContent: "center",
    ...shadow.md,
    shadowColor: colors.accent,
    shadowOpacity: 0.4,
  },
});
