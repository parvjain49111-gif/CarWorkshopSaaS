import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";
import { useLocalSearchParams, useRouter } from "expo-router";

import { api } from "@/src/lib/api";
import { useAuth } from "@/src/lib/auth";
import { colors, statusColor, statusLabel, statusShort, STATUS_META, PAYMENT_META } from "@/src/lib/theme";
import { StatusPill } from "@/src/components/ui";
import { storage } from "@/src/utils/storage";

type SparePart = {
  name: string;
  quantity: number;
  price?: number;
  status: "pending" | "ordered" | "installed";
};

type StatusHistoryEntry = {
  status: string;
  changed_at: string;
  changed_by: string;
  changed_by_name?: string | null;
  note?: string | null;
};

type Job = {
  job_id: string;
  job_card_no?: string | null;
  car_number: string;
  car_name: string;
  model_year?: string | null;
  odometer_km?: number | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  reference?: string | null;
  status: string;
  status_history?: StatusHistoryEntry[];
  mechanic_findings?: string | null;
  spare_parts: SparePart[];
  photos: { front?: string | null; back?: string | null; left?: string | null; right?: string | null };
  labour_charges?: number;
  discount?: number;
  gst_rate?: number;
  gst_amount?: number;
  parts_total?: number;
  total_amount?: number;
  payment_status?: "unpaid" | "partial" | "paid";
  assigned_mechanic?: string | null;
  assigned_service_advisor?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const STATUSES = [
  "vehicle_received",
  "inspection",
  "approval_pending",
  "repair_started",
  "quality_check",
  "ready_for_delivery",
  "delivered",
] as const;

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [findings, setFindings] = useState("");
  const [parts, setParts] = useState<SparePart[]>([]);
  const [newPartName, setNewPartName] = useState("");
  const [newPartQty, setNewPartQty] = useState("1");
  const [newPartPrice, setNewPartPrice] = useState("");
  const [photoView, setPhotoView] = useState<string | null>(null);
  const [savingFindings, setSavingFindings] = useState(false);
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Billing fields
  const [labour, setLabour] = useState("0");
  const [discount, setDiscount] = useState("0");
  const [gstRate, setGstRate] = useState("18");
  const [savingBilling, setSavingBilling] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1500);
  };

  const load = useCallback(async () => {
    try {
      const data = await api.getJob(id as string);
      setJob(data);
      setFindings(data.mechanic_findings || "");
      setParts(data.spare_parts || []);
      setLabour(String(data.labour_charges ?? 0));
      setDiscount(String(data.discount ?? 0));
      setGstRate(String(data.gst_rate ?? 18));
    } catch (e) {
      console.warn("load job", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (s: "pending" | "in_progress" | "completed") => {
    if (savingStatus) return;
    setSavingStatus(s);
    try {
      const updated = await api.updateJob(id as string, { status: s });
      setJob(updated);
      showToast(`Status → ${statusLabel(s)}`);
    } catch (e: any) {
      showToast(e?.message || "Failed");
    } finally {
      setSavingStatus(null);
    }
  };

  const saveFindings = async () => {
    if (savingFindings) return;
    setSavingFindings(true);
    try {
      const updated = await api.updateJob(id as string, {
        mechanic_findings: findings,
        spare_parts: parts,
      });
      setJob(updated);
      showToast("Saved");
    } catch (e: any) {
      showToast(e?.message || "Failed");
    } finally {
      setSavingFindings(false);
    }
  };

  const saveBilling = async () => {
    if (savingBilling) return;
    setSavingBilling(true);
    try {
      const updated = await api.updateJob(id as string, {
        labour_charges: parseFloat(labour || "0"),
        discount: parseFloat(discount || "0"),
        gst_rate: parseFloat(gstRate || "0"),
      });
      setJob(updated);
      showToast("Billing saved");
    } catch (e: any) {
      showToast(e?.message || "Failed");
    } finally {
      setSavingBilling(false);
    }
  };

  const setPaymentStatus = async (ps: "unpaid" | "partial" | "paid") => {
    if (savingBilling) return;
    setSavingBilling(true);
    try {
      const updated = await api.updateJob(id as string, { payment_status: ps });
      setJob(updated);
      showToast(`Payment: ${ps.toUpperCase()}`);
    } catch (e: any) {
      showToast(e?.message || "Failed");
    } finally {
      setSavingBilling(false);
    }
  };

  const downloadInvoice = async () => {
    if (downloadingInvoice) return;
    setDownloadingInvoice(true);
    try {
      const base = process.env.EXPO_PUBLIC_BACKEND_URL || "";
      const raw = Platform.OS === "web"
        ? await storage.getItem<string>("workshop_session_token", "")
        : await storage.secureGet<string>("workshop_session_token", "");
      const token = (raw as string) || "";
      const res = await fetch(`${base}/api/jobs/${id}/invoice.pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 5000);
        showToast("Invoice opened in new tab");
      } else {
        showToast("PDF ready — save via share sheet");
      }
    } catch (e: any) {
      showToast(e?.message || "Invoice failed");
    } finally {
      setDownloadingInvoice(false);
    }
  };

  const addPart = () => {
    if (!newPartName.trim()) return;
    setParts((p) => [
      ...p,
      {
        name: newPartName.trim(),
        quantity: Math.max(1, parseInt(newPartQty || "1", 10)),
        price: newPartPrice ? parseFloat(newPartPrice) : undefined,
        status: "pending",
      },
    ]);
    setNewPartName("");
    setNewPartQty("1");
    setNewPartPrice("");
  };

  const removePart = (idx: number) => {
    setParts((p) => p.filter((_, i) => i !== idx));
  };

  const cyclePartStatus = (idx: number) => {
    setParts((p) =>
      p.map((part, i) => {
        if (i !== idx) return part;
        const next =
          part.status === "pending"
            ? "ordered"
            : part.status === "ordered"
            ? "installed"
            : "pending";
        return { ...part, status: next };
      }),
    );
  };

  if (loading) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (!job) {
    return (
      <View style={[styles.root, { alignItems: "center", justifyContent: "center" }]}>
        <Text style={{ color: colors.textDim }}>Job not found</Text>
      </View>
    );
  }

  const photos = job.photos || {};
  const photoSlots: { key: string; label: string }[] = [
    { key: "front", label: "FRONT" },
    { key: "back", label: "BACK" },
    { key: "left", label: "LEFT" },
    { key: "right", label: "RIGHT" },
  ];

  const createdAt = job.created_at
    ? new Date(job.created_at).toLocaleString()
    : "";

  return (
    <SafeAreaView style={styles.root} edges={["top"]} testID="job-detail-screen">
      <View style={styles.headerBar}>
        <TouchableOpacity
          testID="back-button"
          onPress={() => router.back()}
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerEyebrow}>JOB · {job.job_id.slice(-6).toUpperCase()}</Text>
          <Text style={styles.headerTitle} testID="job-car-number">
            {job.car_number}
          </Text>
        </View>
        <StatusPill status={job.status} />
      </View>

      <KeyboardAwareScrollView
        bottomOffset={20}
        contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}
      >
        {/* Status switcher — 7 states */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WORKFLOW · TAP TO ADVANCE</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statusRow}
          >
            {STATUSES.map((s, idx) => {
              const active = job.status === s;
              const meta = STATUS_META[s];
              const c = meta.color;
              return (
                <TouchableOpacity
                  key={s}
                  testID={`set-status-${s}`}
                  onPress={() => updateStatus(s)}
                  style={[
                    styles.statusBtn,
                    {
                      borderColor: active ? c : colors.border,
                      backgroundColor: active ? `${c}1F` : colors.surface,
                    },
                  ]}
                  disabled={savingStatus !== null}
                  activeOpacity={0.85}
                >
                  {savingStatus === s ? (
                    <ActivityIndicator color={c} size="small" />
                  ) : (
                    <>
                      <Text style={[styles.statusStep, { color: active ? c : colors.textMuted }]}>
                        {idx + 1}
                      </Text>
                      <Text
                        style={[
                          styles.statusBtnText,
                          { color: active ? c : colors.textDim },
                        ]}
                      >
                        {meta.short}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Vehicle info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>VEHICLE</Text>
          <View style={styles.infoCard}>
            <InfoRow icon="car-sport" label="Model" value={`${job.car_name}${job.model_year ? ` · ${job.model_year}` : ""}`} />
            <InfoRow icon="finger-print" label="Plate" value={job.car_number} />
            <InfoRow icon="person" label="Customer" value={job.customer_name} />
            {job.customer_phone ? (
              <InfoRow icon="call" label="Phone" value={job.customer_phone} />
            ) : null}
            {job.reference ? (
              <InfoRow icon="people" label="Reference" value={job.reference} />
            ) : null}
            <InfoRow icon="time" label="Logged" value={createdAt} />
          </View>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>PHOTOS</Text>
          <View style={styles.photoRow}>
            {photoSlots.map((slot) => (
              <TouchableOpacity
                key={slot.key}
                testID={`photo-${slot.key}`}
                style={styles.photoBox}
                disabled={!photos[slot.key]}
                onPress={() => photos[slot.key] && setPhotoView(photos[slot.key])}
                activeOpacity={0.85}
              >
                {photos[slot.key] ? (
                  <Image
                    source={{ uri: photos[slot.key] }}
                    style={StyleSheet.absoluteFillObject}
                  />
                ) : (
                  <Ionicons name="image-outline" size={24} color={colors.textMuted} />
                )}
                <View style={styles.photoTag}>
                  <Text style={styles.photoTagText}>{slot.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Diagnosis comparison */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>DIAGNOSIS — CUSTOMER vs MECHANIC</Text>
          <View style={styles.compareRow}>
            <View style={[styles.compareCol, { borderRightWidth: 1, borderColor: colors.border }]}>
              <Text style={styles.compareLabel}>CUSTOMER SAID</Text>
              <Text style={styles.compareText} testID="customer-problems">
                {job.customer_problems || "—"}
              </Text>
            </View>
            <View style={styles.compareCol}>
              <Text style={[styles.compareLabel, { color: colors.accent }]}>
                MECHANIC FOUND
              </Text>
              <TextInput
                testID="mechanic-findings-input"
                multiline
                value={findings}
                onChangeText={setFindings}
                placeholder="Add diagnosis details…"
                placeholderTextColor={colors.textMuted}
                style={styles.compareInput}
              />
            </View>
          </View>
        </View>

        {/* Spare parts */}
        <View style={styles.section}>
          <View style={styles.partsHeader}>
            <Text style={styles.sectionTitle}>SPARE PARTS</Text>
            {parts.length > 0 ? (
              <Text style={styles.partsProgress} testID="parts-progress">
                {parts.filter((p) => p.status === "installed").length}/{parts.length} GIVEN
              </Text>
            ) : null}
          </View>

          <Text style={styles.partsHint}>
            Tap a status pill to cycle: <Text style={{ color: colors.danger }}>PENDING</Text> → <Text style={{ color: colors.warning }}>ORDERED</Text> → <Text style={{ color: colors.success }}>GIVEN</Text>. Each part is tracked individually.
          </Text>

          {parts.length === 0 ? (
            <Text style={styles.emptyParts}>No parts added yet.</Text>
          ) : (
            parts.map((p, i) => {
              const done = p.status === "installed";
              return (
                <View key={`${p.name}-${i}`} style={styles.partRow} testID={`part-${i}`}>
                  <TouchableOpacity
                    onPress={() => cyclePartStatus(i)}
                    style={[
                      styles.partStatus,
                      {
                        borderColor: done
                          ? colors.success
                          : p.status === "ordered"
                          ? colors.warning
                          : colors.danger,
                        backgroundColor: done ? `${colors.success}1F` : "transparent",
                      },
                    ]}
                    testID={`part-status-${i}`}
                  >
                    <Ionicons
                      name={done ? "checkmark-circle" : p.status === "ordered" ? "time" : "ellipse-outline"}
                      size={14}
                      color={done ? colors.success : p.status === "ordered" ? colors.warning : colors.danger}
                    />
                    <Text
                      style={[
                        styles.partStatusText,
                        {
                          color: done
                            ? colors.success
                            : p.status === "ordered"
                            ? colors.warning
                            : colors.danger,
                        },
                      ]}
                    >
                      {done ? "GIVEN" : p.status === "ordered" ? "ORDERED" : "PENDING"}
                    </Text>
                  </TouchableOpacity>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.partName,
                        done && { textDecorationLine: "line-through", color: colors.textMuted },
                      ]}
                    >
                      {p.name}
                    </Text>
                    <Text style={styles.partMeta}>
                      QTY {p.quantity}
                      {p.price !== undefined ? ` · ₹${p.price}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => removePart(i)}
                    hitSlop={10}
                    testID={`remove-part-${i}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                </View>
              );
            })
          )}

          <View style={styles.addPartRow}>
            <TextInput
              testID="part-name-input"
              value={newPartName}
              onChangeText={setNewPartName}
              placeholder="Part name"
              placeholderTextColor={colors.textMuted}
              style={[styles.partInput, { flex: 2 }]}
            />
            <TextInput
              testID="part-qty-input"
              value={newPartQty}
              onChangeText={setNewPartQty}
              placeholder="Qty"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
              style={[styles.partInput, { width: 56 }]}
            />
            <TextInput
              testID="part-price-input"
              value={newPartPrice}
              onChangeText={setNewPartPrice}
              placeholder="₹"
              keyboardType="numeric"
              placeholderTextColor={colors.textMuted}
              style={[styles.partInput, { width: 70 }]}
            />
            <TouchableOpacity
              onPress={addPart}
              style={styles.addPartBtn}
              testID="add-part-button"
            >
              <Ionicons name="add" size={20} color="#000" />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          testID="save-findings"
          onPress={saveFindings}
          disabled={savingFindings}
          style={[styles.saveBtn, savingFindings && { opacity: 0.6 }]}
          activeOpacity={0.85}
        >
          {savingFindings ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <Ionicons name="save" size={18} color="#000" />
              <Text style={styles.saveBtnText}>SAVE FINDINGS & PARTS</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Billing */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BILLING · INVOICE</Text>
          <View style={styles.billCard}>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>PARTS SUBTOTAL</Text>
              <Text style={styles.billValue}>₹{(job.parts_total ?? 0).toFixed(2)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>LABOUR CHARGES</Text>
              <TextInput
                testID="labour-input"
                value={labour}
                onChangeText={setLabour}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={styles.billInput}
              />
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>DISCOUNT (-)</Text>
              <TextInput
                testID="discount-input"
                value={discount}
                onChangeText={setDiscount}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={colors.textMuted}
                style={styles.billInput}
              />
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>GST %</Text>
              <TextInput
                testID="gst-input"
                value={gstRate}
                onChangeText={setGstRate}
                keyboardType="numeric"
                placeholder="18"
                placeholderTextColor={colors.textMuted}
                style={styles.billInput}
              />
            </View>
            <View style={[styles.billRow, styles.billDivider]}>
              <Text style={styles.billLabel}>GST AMOUNT</Text>
              <Text style={styles.billValue}>₹{(job.gst_amount ?? 0).toFixed(2)}</Text>
            </View>
            <View style={styles.billRow}>
              <Text style={styles.billTotalLabel}>GRAND TOTAL</Text>
              <Text style={styles.billTotal} testID="grand-total">
                ₹{(job.total_amount ?? 0).toFixed(2)}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            testID="save-billing"
            onPress={saveBilling}
            disabled={savingBilling}
            style={[styles.saveBillBtn, savingBilling && { opacity: 0.6 }]}
            activeOpacity={0.85}
          >
            {savingBilling ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <>
                <Ionicons name="calculator" size={16} color={colors.accent} />
                <Text style={styles.saveBillText}>RECALCULATE & SAVE</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID="download-invoice"
            onPress={downloadInvoice}
            disabled={downloadingInvoice}
            style={[styles.invoiceBtn, downloadingInvoice && { opacity: 0.6 }]}
            activeOpacity={0.85}
          >
            {downloadingInvoice ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <Ionicons name="document-text" size={18} color="#000" />
                <Text style={styles.invoiceBtnText}>GENERATE PDF INVOICE</Text>
              </>
            )}
          </TouchableOpacity>

          <Text style={styles.paymentLabel}>PAYMENT STATUS</Text>
          <View style={styles.paymentRow}>
            {(["unpaid", "partial", "paid"] as const).map((ps) => {
              const active = (job.payment_status || "unpaid") === ps;
              const c = PAYMENT_META[ps].color;
              return (
                <TouchableOpacity
                  key={ps}
                  testID={`payment-${ps}`}
                  onPress={() => setPaymentStatus(ps)}
                  disabled={savingBilling}
                  style={[
                    styles.paymentBtn,
                    {
                      borderColor: active ? c : colors.border,
                      backgroundColor: active ? `${c}1F` : colors.surface,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.paymentText,
                      { color: active ? c : colors.textDim },
                    ]}
                  >
                    {PAYMENT_META[ps].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Status History */}
        {job.status_history && job.status_history.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>WORKFLOW AUDIT · LATEST FIRST</Text>
            <View style={styles.historyList}>
              {[...(job.status_history || [])].reverse().map((h, i) => (
                <View key={i} style={styles.historyRow} testID={`history-${i}`}>
                  <View
                    style={[
                      styles.historyDot,
                      { backgroundColor: statusColor(h.status) },
                    ]}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyStatus, { color: statusColor(h.status) }]}>
                      {statusLabel(h.status)}
                    </Text>
                    <Text style={styles.historyMeta}>
                      {h.changed_by_name || "—"} · {(h.changed_at || "").slice(0, 16).replace("T", " ")}
                    </Text>
                    {h.note ? <Text style={styles.historyNote}>{h.note}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {job.job_card_no ? (
          <Text style={styles.jobCardFooter}>Job Card # {job.job_card_no}</Text>
        ) : null}
      </KeyboardAwareScrollView>

      <Modal
        transparent
        visible={!!photoView}
        animationType="fade"
        onRequestClose={() => setPhotoView(null)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setPhotoView(null)}
          style={styles.photoModal}
        >
          {photoView ? (
            <Image source={{ uri: photoView }} style={styles.fullPhoto} resizeMode="contain" />
          ) : null}
          <View style={[styles.closeBadge, { top: insets.top + 16 }]}>
            <Ionicons name="close" size={22} color={colors.text} />
          </View>
        </TouchableOpacity>
      </Modal>

      {toast ? (
        <View style={[styles.toast, { bottom: insets.bottom + 30 }]} testID="toast">
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function InfoRow({ icon, label, value }: any) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color={colors.accent} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bg,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: 1,
  },

  section: { paddingHorizontal: 20, marginTop: 22 },
  sectionTitle: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginBottom: 10,
  },

  statusRow: { flexDirection: "row", gap: 8, paddingRight: 20 },
  statusBtn: {
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 96,
    minHeight: 52,
  },
  statusStep: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 2,
  },
  statusBtnText: { fontSize: 10, fontWeight: "900", letterSpacing: 1.2 },

  infoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  infoLabel: { color: colors.textMuted, fontSize: 12, width: 84 },
  infoValue: { color: colors.text, fontSize: 13, flex: 1, fontWeight: "700" },

  photoRow: { flexDirection: "row", gap: 8 },
  photoBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoTag: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingVertical: 4,
  },
  photoTagText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.2,
    textAlign: "center",
  },

  compareRow: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  compareCol: { flex: 1, padding: 12, minHeight: 130 },
  compareLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  compareText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  compareInput: { color: colors.text, fontSize: 13, minHeight: 80, textAlignVertical: "top" },

  emptyParts: { color: colors.textMuted, fontSize: 13, marginBottom: 10 },
  partsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  partsProgress: {
    color: colors.success,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
  partsHint: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 12,
  },
  partRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginBottom: 8,
  },
  partStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderWidth: 1,
    minWidth: 92,
    justifyContent: "center",
  },
  partStatusText: { fontSize: 9, fontWeight: "900", letterSpacing: 1.2 },
  partName: { color: colors.text, fontWeight: "800", fontSize: 13 },
  partMeta: { color: colors.textMuted, fontSize: 11, marginTop: 2 },
  addPartRow: { flexDirection: "row", gap: 6, marginTop: 8 },
  partInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
  },
  addPartBtn: {
    width: 42,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
  },

  saveBtn: {
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 16,
    marginHorizontal: 20,
    marginTop: 22,
  },
  saveBtnText: { color: "#000", fontWeight: "900", letterSpacing: 2 },

  billCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  billDivider: {
    borderTopWidth: 1,
    borderColor: colors.border,
    marginTop: 6,
    paddingTop: 12,
  },
  billLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  billValue: { color: colors.text, fontSize: 14, fontWeight: "700" },
  billInput: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 14,
    minWidth: 100,
    textAlign: "right",
  },
  billTotalLabel: { color: colors.accent, fontSize: 12, fontWeight: "900", letterSpacing: 1.5 },
  billTotal: { color: colors.accent, fontSize: 22, fontWeight: "900", letterSpacing: -0.5 },

  saveBillBtn: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.accent,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  saveBillText: { color: colors.accent, fontWeight: "900", letterSpacing: 1.5, fontSize: 12 },
  invoiceBtn: {
    marginTop: 10,
    backgroundColor: colors.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 14,
  },
  invoiceBtnText: { color: "#000", fontWeight: "900", letterSpacing: 1.5, fontSize: 12 },

  paymentLabel: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2,
    marginTop: 18,
    marginBottom: 8,
  },
  paymentRow: { flexDirection: "row", gap: 8 },
  paymentBtn: {
    flex: 1,
    borderWidth: 1,
    paddingVertical: 12,
    alignItems: "center",
  },
  paymentText: { fontSize: 11, fontWeight: "900", letterSpacing: 1.4 },

  historyList: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  historyRow: {
    flexDirection: "row",
    gap: 12,
    padding: 12,
    borderBottomWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
  },
  historyDot: { width: 10, height: 10, marginTop: 4 },
  historyStatus: { fontSize: 11, fontWeight: "900", letterSpacing: 1.3 },
  historyMeta: { color: colors.textMuted, fontSize: 11, marginTop: 3 },
  historyNote: {
    color: colors.textDim,
    fontSize: 12,
    marginTop: 4,
    fontStyle: "italic",
  },

  jobCardFooter: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textAlign: "center",
    marginTop: 24,
    marginHorizontal: 20,
  },

  photoModal: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullPhoto: { width: "100%", height: "100%" },
  closeBadge: {
    position: "absolute",
    right: 16,
    width: 36,
    height: 36,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },

  toast: {
    position: "absolute",
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
