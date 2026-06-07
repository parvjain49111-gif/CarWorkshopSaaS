import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, statusColor, statusLabel } from "@/src/lib/theme";

export function StatusPill({ status }: { status: string }) {
  const c = statusColor(status);
  return (
    <View
      testID={`status-pill-${status}`}
      style={[
        styles.pill,
        { borderColor: c, backgroundColor: `${c}1A` },
      ]}
    >
      <View style={[styles.dot, { backgroundColor: c }]} />
      <Text style={[styles.text, { color: c }]}>{statusLabel(status)}</Text>
    </View>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  dot: { width: 6, height: 6, marginRight: 6 },
  text: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },
  section: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },
});
