import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ImageBackground,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";

export default function LoginScreen() {
  const { login } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleLogin = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await login();
    } catch (e) {
      console.warn("login error", e);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root} testID="login-screen">
      <ImageBackground
        source={{
          uri: "https://images.pexels.com/photos/4488639/pexels-photo-4488639.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940",
        }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      >
        <LinearGradient
          colors={["rgba(11,19,43,0.55)", "rgba(11,19,43,0.90)", "#0B132B"]}
          locations={[0, 0.55, 1]}
          style={StyleSheet.absoluteFillObject}
        />
      </ImageBackground>

      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.topBlock}>
          <View style={styles.badge}>
            <View style={styles.dot} />
            <Text style={styles.badgeText}>WORKSHOPOPS</Text>
          </View>

          <Text style={styles.title}>COMMAND</Text>
          <Text style={[styles.title, styles.titleAccent]}>YOUR BAYS.</Text>
          <Text style={styles.subtitle}>
            Multi-brand intake, mechanic findings, parts tracking — all on one
            tactical dashboard.
          </Text>
        </View>

        <View style={styles.bottomBlock}>
          <View style={styles.featureRow}>
            <Feature icon="car-sport" label="Intake" />
            <Feature icon="camera" label="Photo log" />
            <Feature icon="construct" label="Mechanic" />
            <Feature icon="cog" label="Parts" />
          </View>

          <TouchableOpacity
            testID="google-login-button"
            activeOpacity={0.85}
            onPress={handleLogin}
            disabled={busy}
            style={[styles.cta, busy && { opacity: 0.7 }]}
          >
            {busy ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="logo-google" size={18} color="#000" />
                <Text style={styles.ctaText}>CONTINUE WITH GOOGLE</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.legal}>
            By continuing you agree to operate this workshop log responsibly.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

function Feature({ icon, label }: { icon: any; label: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={colors.accent} />
      </View>
      <Text style={styles.featureLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  safe: { flex: 1, paddingHorizontal: 24, justifyContent: "space-between" },
  topBlock: { paddingTop: 24 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: 28,
  },
  dot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 8,
  },
  badgeText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2.5,
  },
  title: {
    color: colors.text,
    fontSize: 48,
    fontWeight: "900",
    letterSpacing: -1.5,
    lineHeight: 54,
  },
  titleAccent: { color: colors.accent },
  subtitle: {
    color: colors.textDim,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 18,
    maxWidth: 360,
  },
  bottomBlock: { paddingBottom: 12 },
  featureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
    paddingVertical: 16,
  },
  feature: { alignItems: "center", flex: 1 },
  featureIcon: {
    width: 46, height: 46,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  featureLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "700",
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.accent,
    paddingVertical: 18,
    gap: 10,
    borderRadius: 14,
  },
  ctaText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  legal: {
    color: colors.textMuted,
    fontSize: 11,
    textAlign: "center",
    marginTop: 14,
    lineHeight: 16,
  },
});
