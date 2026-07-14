import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors } from "@/src/lib/theme";

type Settings = {
  workshop_name?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  phone?: string;
  email?: string;
  gstin?: string;
  default_gst_rate: number;
  upi_id?: string;
  invoice_prefix: string;
  footer_note?: string;
};

const EMPTY: Settings = {
  workshop_name: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  phone: "",
  email: "",
  gstin: "",
  default_gst_rate: 18,
  upi_id: "",
  invoice_prefix: "INV",
  footer_note: "",
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [s, setS] = useState<Settings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const isOwner = user?.role === "owner";

  const load = useCallback(async () => {
    try {
      const data = await api.getSettings();
      setS({ ...EMPTY, ...data });
    } catch (e) {
      console.warn("settings", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  const save = async () => {
    if (!isOwner || saving) return;
    setSaving(true);
    try {
      const payload = {
        ...s,
        default_gst_rate: Number(s.default_gst_rate) || 18,
      };
      await api.updateSettings(payload);
      setToast("Settings saved");
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      setToast(e?.message || "Failed");
      setTimeout(() => setToast(null), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="settings-screen">
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.eyebrow}>CONFIGURATION</Text>
          <Text style={styles.title}>WORKSHOP SETTINGS</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <KeyboardAwareScrollView
          bottomOffset={20}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}
        >
          {!isOwner ? (
            <View style={styles.notice}>
              <Ionicons name="lock-closed" size={14} color={colors.warning} />
              <Text style={styles.noticeText}>
                Only the owner can edit these settings — everyone can view.
              </Text>
            </View>
          ) : null}

          <SectionTitle>WORKSHOP IDENTITY</SectionTitle>
          <Field label="WORKSHOP NAME" value={s.workshop_name} onChange={(v) => set("workshop_name", v)} editable={isOwner} placeholder="AutoCare Multi-brand Workshop" />
          <Field label="ADDRESS" value={s.address} onChange={(v) => set("address", v)} editable={isOwner} placeholder="Full street address" multiline />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 2 }}>
              <Field label="CITY" value={s.city} onChange={(v) => set("city", v)} editable={isOwner} />
            </View>
            <View style={{ flex: 2 }}>
              <Field label="STATE" value={s.state} onChange={(v) => set("state", v)} editable={isOwner} />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="PIN" value={s.pincode} onChange={(v) => set("pincode", v)} editable={isOwner} keyboardType="numeric" />
            </View>
          </View>

          <SectionTitle>CONTACT</SectionTitle>
          <Field label="PHONE" value={s.phone} onChange={(v) => set("phone", v)} editable={isOwner} keyboardType="phone-pad" />
          <Field label="EMAIL" value={s.email} onChange={(v) => set("email", v)} editable={isOwner} keyboardType="email-address" autoCapitalize="none" />

          <SectionTitle>TAX & INVOICING</SectionTitle>
          <Field label="GSTIN" value={s.gstin} onChange={(v) => set("gstin", v)} editable={isOwner} autoCapitalize="characters" />
          <View style={{ flexDirection: "row", gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="DEFAULT GST %" value={String(s.default_gst_rate)} onChange={(v) => set("default_gst_rate", parseFloat(v) || 0)} editable={isOwner} keyboardType="numeric" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="INVOICE PREFIX" value={s.invoice_prefix} onChange={(v) => set("invoice_prefix", v)} editable={isOwner} autoCapitalize="characters" />
            </View>
          </View>
          <Field label="UPI ID" value={s.upi_id} onChange={(v) => set("upi_id", v)} editable={isOwner} placeholder="workshop@upi" />

          <SectionTitle>INVOICE FOOTER</SectionTitle>
          <Field label="FOOTER NOTE" value={s.footer_note} onChange={(v) => set("footer_note", v)} editable={isOwner} multiline placeholder="Thank you for choosing us. Warranty policy…" />

          {isOwner ? (
            <TouchableOpacity
              testID="save-settings"
              onPress={save}
              disabled={saving}
              style={[styles.saveBtn, saving && { opacity: 0.6 }]}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator color="#000" />
              ) : (
                <>
                  <Ionicons name="save" size={18} color="#000" />
                  <Text style={styles.saveBtnText}>SAVE SETTINGS</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}
        </KeyboardAwareScrollView>
      )}

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 20 }]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.accent} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

function Field({
  label,
  value,
  onChange,
  editable = true,
  multiline,
  placeholder,
  keyboardType,
  autoCapitalize,
}: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value || ""}
        onChangeText={onChange}
        editable={editable}
        multiline={multiline}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        style={[styles.input, multiline && styles.inputMulti, !editable && { opacity: 0.6 }]}
      />
    </View>
  );
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
    width: 36, height: 36, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: colors.border,
  },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 2 },
  title: { color: colors.text, fontSize: 20, fontWeight: "900" },

  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: `${colors.warning}0F`,
    padding: 12,
    marginBottom: 10,
  },
  noticeText: { color: colors.warning, fontSize: 12, fontWeight: "700", flex: 1 },

  section: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 20,
    marginBottom: 10,
  },
  fieldWrap: { marginBottom: 12 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
  },
  inputMulti: { minHeight: 70, textAlignVertical: "top" },

  saveBtn: {
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    marginTop: 24,
  },
  saveBtnText: { color: "#000", fontWeight: "900", letterSpacing: 2, fontSize: 13 },

  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  toastText: { color: colors.text, fontWeight: "700", fontSize: 12, flex: 1 },
});
