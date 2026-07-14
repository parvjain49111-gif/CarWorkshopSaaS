import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Modal, Animated, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/src/lib/theme";

/** Loading skeleton block. Use in place of raw ActivityIndicator on list screens. */
export function Skeleton({ height = 60, width = "100%", style }: { height?: number; width?: any; style?: any }) {
  const anim = React.useRef(new Animated.Value(0.5)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.5, duration: 700, easing: Easing.linear, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      testID="skeleton"
      style={[
        {
          height,
          width,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

/** Confirm dialog for destructive actions. */
export function Confirm({
  visible,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = "CONFIRM",
  destructive = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onCancel}>
        <View style={styles.card}>
          <Ionicons
            name={destructive ? "warning" : "help-circle"}
            size={28}
            color={destructive ? colors.danger : colors.accent}
          />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.msg}>{message}</Text>
          <View style={styles.row}>
            <TouchableOpacity onPress={onCancel} style={styles.cancel} testID="confirm-cancel">
              <Text style={styles.cancelText}>CANCEL</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              style={[styles.yes, destructive && { backgroundColor: colors.danger }]}
              testID="confirm-yes"
            >
              <Text style={styles.yesText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

/** Standard empty state. */
export function EmptyState({
  icon = "folder-open-outline",
  title,
  message,
  cta,
  onCta,
}: {
  icon?: any;
  title: string;
  message?: string;
  cta?: string;
  onCta?: () => void;
}) {
  return (
    <View style={styles.empty} testID="empty-state">
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
      {cta && onCta ? (
        <TouchableOpacity onPress={onCta} style={styles.emptyCta}>
          <Text style={styles.emptyCtaText}>{cta}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
  },
  title: { color: colors.text, fontSize: 15, fontWeight: "900", letterSpacing: 1.5, marginTop: 14, marginBottom: 8 },
  msg: { color: colors.textDim, fontSize: 13, textAlign: "center", lineHeight: 18 },
  row: { flexDirection: "row", gap: 10, marginTop: 20, width: "100%" },
  cancel: { flex: 1, borderWidth: 1, borderColor: colors.border, paddingVertical: 12, alignItems: "center" },
  cancelText: { color: colors.textDim, fontWeight: "900", letterSpacing: 1.5 },
  yes: { flex: 1, backgroundColor: colors.accent, paddingVertical: 12, alignItems: "center" },
  yesText: { color: "#000", fontWeight: "900", letterSpacing: 1.5 },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyTitle: { color: colors.text, fontWeight: "900", fontSize: 15, marginTop: 12 },
  emptyMsg: { color: colors.textDim, fontSize: 13, marginTop: 6, textAlign: "center", maxWidth: 260 },
  emptyCta: {
    marginTop: 16,
    backgroundColor: colors.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  emptyCtaText: { color: "#000", fontWeight: "900", letterSpacing: 1.5, fontSize: 12 },
});
