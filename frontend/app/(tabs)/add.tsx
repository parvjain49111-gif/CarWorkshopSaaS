import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { colors } from "@/src/lib/theme";
import { pickPhoto } from "@/src/lib/photos";

type PhotoSlot = "front" | "back" | "left" | "right";

const SLOTS: { key: PhotoSlot; label: string }[] = [
  { key: "front", label: "FRONT" },
  { key: "back", label: "BACK" },
  { key: "left", label: "LEFT SIDE" },
  { key: "right", label: "RIGHT SIDE" },
];

export default function AddJobScreen() {
  const router = useRouter();
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [carName, setCarName] = useState("");
  const [carNumber, setCarNumber] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [reference, setReference] = useState("");
  const [problems, setProblems] = useState("");
  const [photos, setPhotos] = useState<Record<PhotoSlot, string | null>>({
    front: null,
    back: null,
    left: null,
    right: null,
  });

  const [pickerOpen, setPickerOpen] = useState<PhotoSlot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const setSlot = async (slot: PhotoSlot, source: "camera" | "library") => {
    setPickerOpen(null);
    const data = await pickPhoto(source);
    if (data) setPhotos((p) => ({ ...p, [slot]: data }));
  };

  const valid = customerName.trim() && carName.trim() && carNumber.trim() && problems.trim();

  const reset = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCarName("");
    setCarNumber("");
    setModelYear("");
    setReference("");
    setProblems("");
    setPhotos({ front: null, back: null, left: null, right: null });
  };

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const job = await api.createJob({
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim() || null,
        car_name: carName.trim(),
        car_number: carNumber.trim(),
        model_year: modelYear.trim() || null,
        reference: reference.trim() || null,
        customer_problems: problems.trim(),
        photos,
      });
      setToast("Intake logged");
      reset();
      setTimeout(() => {
        setToast(null);
        router.push(`/job/${job.job_id}`);
      }, 600);
    } catch (e: any) {
      setToast(e?.message || "Failed to save");
      setTimeout(() => setToast(null), 1800);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="add-job-screen">
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>NEW INTAKE</Text>
          <Text style={styles.title}>LOG A CAR</Text>
        </View>
        <Ionicons name="car-sport" size={32} color={colors.accent} />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={90}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 110 }}
        keyboardShouldPersistTaps="handled"
      >
        <SectionTitle>CUSTOMER</SectionTitle>
        <Field
          label="CUSTOMER NAME *"
          value={customerName}
          onChangeText={setCustomerName}
          placeholder="Full name"
          testID="input-customer-name"
        />
        <Field
          label="PHONE"
          value={customerPhone}
          onChangeText={setCustomerPhone}
          placeholder="+91 ..."
          keyboardType="phone-pad"
          testID="input-customer-phone"
        />
        <Field
          label="REFERENCE (BY WHO?)"
          value={reference}
          onChangeText={setReference}
          placeholder="Walk-in / Friend / Insurance ..."
          testID="input-reference"
        />

        <SectionTitle>VEHICLE</SectionTitle>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <View style={{ flex: 2 }}>
            <Field
              label="CAR NAME *"
              value={carName}
              onChangeText={setCarName}
              placeholder="e.g. Maruti Swift"
              testID="input-car-name"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="YEAR"
              value={modelYear}
              onChangeText={setModelYear}
              placeholder="2021"
              keyboardType="numeric"
              maxLength={4}
              testID="input-model-year"
            />
          </View>
        </View>
        <Field
          label="CAR NUMBER *"
          value={carNumber}
          onChangeText={(t) => setCarNumber(t.toUpperCase())}
          placeholder="DL 01 AB 1234"
          autoCapitalize="characters"
          testID="input-car-number"
        />

        <SectionTitle>PROBLEM REPORTED</SectionTitle>
        <Field
          label="CUSTOMER PROBLEMS *"
          value={problems}
          onChangeText={setProblems}
          placeholder="Describe what the customer is facing..."
          multiline
          numberOfLines={4}
          testID="input-problems"
        />

        <SectionTitle>PHOTOS</SectionTitle>
        <View style={styles.photosGrid}>
          {SLOTS.map((s) => (
            <TouchableOpacity
              key={s.key}
              testID={`photo-slot-${s.key}`}
              style={styles.photoTile}
              activeOpacity={0.85}
              onPress={() => setPickerOpen(s.key)}
            >
              {photos[s.key] ? (
                <Image
                  source={{ uri: photos[s.key] as string }}
                  style={StyleSheet.absoluteFillObject}
                />
              ) : (
                <Ionicons name="camera-outline" size={26} color={colors.textMuted} />
              )}
              <View style={styles.photoLabel}>
                <Text style={styles.photoLabelText}>{s.label}</Text>
                {photos[s.key] ? (
                  <View style={styles.photoCheck}>
                    <Ionicons name="checkmark" size={10} color="#000" />
                  </View>
                ) : null}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          testID="submit-intake"
          activeOpacity={0.85}
          onPress={submit}
          disabled={!valid || submitting}
          style={[
            styles.submit,
            (!valid || submitting) && { opacity: 0.4 },
          ]}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="save-outline" size={18} color="#000" />
              <Text style={styles.submitText}>SAVE INTAKE</Text>
            </>
          )}
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      {/* Photo source picker */}
      <Modal
        transparent
        visible={pickerOpen !== null}
        animationType="fade"
        onRequestClose={() => setPickerOpen(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalBackdrop}
          onPress={() => setPickerOpen(null)}
        >
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>ADD PHOTO</Text>
            <TouchableOpacity
              style={styles.sheetBtn}
              testID="picker-camera"
              onPress={() => pickerOpen && setSlot(pickerOpen, "camera")}
            >
              <Ionicons name="camera" size={20} color={colors.accent} />
              <Text style={styles.sheetBtnText}>TAKE PHOTO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetBtn}
              testID="picker-library"
              onPress={() => pickerOpen && setSlot(pickerOpen, "library")}
            >
              <Ionicons name="images" size={20} color={colors.accent} />
              <Text style={styles.sheetBtnText}>CHOOSE FROM GALLERY</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.sheetBtn, { borderColor: colors.border }]}
              onPress={() => setPickerOpen(null)}
            >
              <Text style={[styles.sheetBtnText, { color: colors.textDim }]}>
                CANCEL
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {toast ? (
        <View style={styles.toast} testID="toast">
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
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
  testID,
  multiline,
  ...rest
}: any) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...rest}
        testID={testID}
        multiline={multiline}
        placeholderTextColor={colors.textMuted}
        style={[styles.input, multiline && styles.inputMulti]}
      />
    </View>
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
    paddingBottom: 14,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 2.5,
  },
  title: { color: colors.text, fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  section: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 18,
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
    fontFamily: undefined,
  },
  inputMulti: { minHeight: 100, textAlignVertical: "top" },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  photoTile: {
    width: "48%",
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoLabel: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  photoLabelText: {
    color: colors.text,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  photoCheck: {
    width: 16,
    height: 16,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  submit: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 22,
  },
  submitText: { color: "#000", fontWeight: "900", letterSpacing: 2 },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 30,
  },
  sheetTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 12,
  },
  sheetBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  sheetBtnText: { color: colors.text, fontWeight: "900", letterSpacing: 1.5, fontSize: 13 },

  toast: {
    position: "absolute",
    bottom: 100,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  toastText: { color: colors.text, fontWeight: "800", fontSize: 12, letterSpacing: 1 },
});
