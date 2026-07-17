import React from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, font } from "@/src/lib/theme";

/* -------------------- Card -------------------- */
export function Card({
  children,
  style,
  onPress,
  testID,
  variant = "default",
}: {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  onPress?: () => void;
  testID?: string;
  variant?: "default" | "elevated" | "outline";
}) {
  const base: ViewStyle = {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: variant === "outline" ? 1 : 0,
    borderColor: colors.border,
    padding: 16,
    ...(variant === "elevated" ? shadow.md : shadow.sm),
  };
  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} testID={testID} style={[base, style]}>
        {children}
      </TouchableOpacity>
    );
  }
  return <View testID={testID} style={[base, style]}>{children}</View>;
}

/* -------------------- Button -------------------- */
type BtnVariant = "primary" | "secondary" | "danger" | "outline" | "ghost";

export function Button({
  label,
  onPress,
  variant = "primary",
  icon,
  iconRight,
  loading,
  disabled,
  size = "md",
  testID,
  style,
  block = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: BtnVariant;
  icon?: any;
  iconRight?: any;
  loading?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  testID?: string;
  style?: ViewStyle;
  block?: boolean;
}) {
  const scale = React.useRef(new Animated.Value(1)).current;
  const bgMap = {
    primary: colors.accent,
    secondary: colors.surface2,
    danger: colors.danger,
    outline: "transparent",
    ghost: "transparent",
  };
  const fgMap = {
    primary: colors.accentContrast,
    secondary: colors.text,
    danger: "#fff",
    outline: colors.accent,
    ghost: colors.textDim,
  };
  const bordMap = {
    primary: "transparent",
    secondary: colors.border,
    danger: "transparent",
    outline: colors.accent,
    ghost: "transparent",
  };
  const padMap = {
    sm: { paddingVertical: 8, paddingHorizontal: 12, minHeight: 36 },
    md: { paddingVertical: 12, paddingHorizontal: 18, minHeight: 46 },
    lg: { paddingVertical: 16, paddingHorizontal: 22, minHeight: 54 },
  };
  const fontSize = size === "sm" ? 11 : size === "lg" ? 14 : 12;

  const bg = bgMap[variant];
  const fg = fgMap[variant];
  const bord = bordMap[variant];

  const inner = loading ? (
    <ActivityIndicator color={fg} size="small" />
  ) : (
    <>
      {icon ? <Ionicons name={icon} size={size === "lg" ? 20 : 16} color={fg} /> : null}
      <Text style={[styles.btnText, { color: fg, fontSize }]}>{label}</Text>
      {iconRight ? <Ionicons name={iconRight} size={16} color={fg} /> : null}
    </>
  );

  return (
    <Animated.View style={{ transform: [{ scale }], alignSelf: block ? "stretch" : "flex-start" }}>
      <TouchableOpacity
        testID={testID}
        activeOpacity={0.85}
        disabled={disabled || loading}
        onPressIn={() => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40 }).start()}
        onPressOut={() => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
        onPress={onPress}
        style={[
          styles.btn,
          padMap[size],
          { backgroundColor: bg, borderColor: bord, borderWidth: bord === "transparent" ? 0 : 1 },
          (variant === "primary" || variant === "danger") && shadow.sm,
          (disabled || loading) && { opacity: 0.5 },
          style,
        ]}
      >
        {inner}
      </TouchableOpacity>
    </Animated.View>
  );
}

/* -------------------- ScreenHeader -------------------- */
export function ScreenHeader({
  title,
  eyebrow,
  onBack,
  right,
}: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity onPress={onBack} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
      ) : null}
      <View style={{ flex: 1 }}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

/* -------------------- Skeleton -------------------- */
export function Skeleton({ height = 60, width = "100%", style, radius: r }: { height?: number; width?: any; style?: any; radius?: number }) {
  const anim = React.useRef(new Animated.Value(0.5)).current;
  React.useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      testID="skeleton"
      style={[{
        height, width,
        backgroundColor: colors.surface,
        borderRadius: r ?? radius.md,
        opacity: anim,
      }, style]}
    />
  );
}

/* -------------------- EmptyState -------------------- */
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
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={36} color={colors.accent} />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {message ? <Text style={styles.emptyMsg}>{message}</Text> : null}
      {cta && onCta ? <Button label={cta} onPress={onCta} style={{ marginTop: 20 }} /> : null}
    </View>
  );
}

/* -------------------- Confirm -------------------- */
export function Confirm({
  visible, title, message, onCancel, onConfirm, confirmLabel = "CONFIRM", destructive = false,
}: {
  visible: boolean; title: string; message: string;
  onCancel: () => void; onConfirm: () => void;
  confirmLabel?: string; destructive?: boolean;
}) {
  if (!visible) return null;
  return (
    <View style={styles.confirmBackdrop} pointerEvents="auto">
      <View style={styles.confirmCard}>
        <View style={[styles.confirmIcon, { backgroundColor: destructive ? colors.dangerSoft : colors.accentSoft }]}>
          <Ionicons name={destructive ? "warning" : "help-circle"} size={28} color={destructive ? colors.danger : colors.accent} />
        </View>
        <Text style={styles.confirmTitle}>{title}</Text>
        <Text style={styles.confirmMsg}>{message}</Text>
        <View style={{ flexDirection: "row", gap: 10, marginTop: 20, width: "100%" }}>
          <Button label="CANCEL" variant="secondary" onPress={onCancel} block style={{ flex: 1 } as any} />
          <Button label={confirmLabel} variant={destructive ? "danger" : "primary"} onPress={onConfirm} block style={{ flex: 1 } as any} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.md,
  },
  btnText: {
    ...font.h4,
    fontWeight: "800",
    letterSpacing: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 42, height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center",
  },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  title: { ...font.h2, color: colors.text },

  empty: {
    flex: 1, alignItems: "center", justifyContent: "center", padding: 40,
  },
  emptyIcon: {
    width: 80, height: 80,
    borderRadius: radius.xl,
    backgroundColor: colors.accentSoft,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: { color: colors.text, ...font.h3, marginBottom: 6 },
  emptyMsg: { color: colors.textDim, ...font.body, textAlign: "center", maxWidth: 300 },

  confirmBackdrop: {
    position: "absolute", inset: 0 as any,
    top: 0, bottom: 0, left: 0, right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center", justifyContent: "center",
    padding: 24,
    zIndex: 999,
  },
  confirmCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: 24,
    width: "100%", maxWidth: 380,
    alignItems: "center",
    ...shadow.lg,
  },
  confirmIcon: {
    width: 68, height: 68, borderRadius: radius.pill,
    alignItems: "center", justifyContent: "center",
    marginBottom: 12,
  },
  confirmTitle: { color: colors.text, ...font.h3, marginBottom: 6, textAlign: "center" },
  confirmMsg: { color: colors.textDim, ...font.body, textAlign: "center", lineHeight: 20 },
});
