export const colors = {
  bg: "#0A0A0A",
  surface: "#171717",
  surface2: "#1F1F1F",
  border: "#262626",
  borderStrong: "#3A3A3A",
  text: "#FFFFFF",
  textDim: "#A3A3A3",
  textMuted: "#737373",
  accent: "#FFD600",
  accentHover: "#FACC15",
  danger: "#FF3B30",
  warning: "#FF9100",
  success: "#00E676",
  info: "#3B82F6",
  violet: "#A855F7",
  cyan: "#22D3EE",
};

// Legacy 3-state statuses map to new 7-state flow
const STATUS_MAP: Record<string, string> = {
  pending: "vehicle_received",
  in_progress: "repair_started",
  completed: "delivered",
};

export const JOB_STATUSES = [
  "vehicle_received",
  "inspection",
  "approval_pending",
  "repair_started",
  "quality_check",
  "ready_for_delivery",
  "delivered",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const STATUS_META: Record<
  string,
  { label: string; short: string; color: string; step: number }
> = {
  vehicle_received: { label: "VEHICLE RECEIVED", short: "RECEIVED", color: colors.info, step: 1 },
  inspection: { label: "INSPECTION", short: "INSPECT", color: colors.cyan, step: 2 },
  approval_pending: { label: "APPROVAL PENDING", short: "APPROVAL", color: colors.violet, step: 3 },
  repair_started: { label: "REPAIR STARTED", short: "REPAIRING", color: colors.warning, step: 4 },
  quality_check: { label: "QUALITY CHECK", short: "QC", color: colors.accent, step: 5 },
  ready_for_delivery: { label: "READY FOR DELIVERY", short: "READY", color: colors.success, step: 6 },
  delivered: { label: "DELIVERED", short: "DELIVERED", color: colors.textDim, step: 7 },
};

export function normalizeStatus(s: string | undefined | null): JobStatus {
  if (!s) return "vehicle_received";
  if ((JOB_STATUSES as readonly string[]).includes(s)) return s as JobStatus;
  return (STATUS_MAP[s] as JobStatus) || "vehicle_received";
}

export const statusColor = (status: string) =>
  STATUS_META[normalizeStatus(status)]?.color || colors.textDim;

export const statusLabel = (status: string) =>
  STATUS_META[normalizeStatus(status)]?.label || status.toUpperCase();

export const statusShort = (status: string) =>
  STATUS_META[normalizeStatus(status)]?.short || status.toUpperCase();

export const PAYMENT_META: Record<string, { label: string; color: string }> = {
  unpaid: { label: "UNPAID", color: colors.danger },
  partial: { label: "PARTIAL", color: colors.warning },
  paid: { label: "PAID", color: colors.success },
};

export const ROLES = [
  { key: "owner", label: "OWNER", color: colors.accent },
  { key: "manager", label: "MANAGER", color: colors.violet },
  { key: "service_advisor", label: "SERVICE ADVISOR", color: colors.info },
  { key: "mechanic", label: "MECHANIC", color: colors.success },
  { key: "accountant", label: "ACCOUNTANT", color: colors.cyan },
];

export const roleLabel = (r: string) =>
  ROLES.find((x) => x.key === r)?.label || r.toUpperCase();

export const roleColor = (r: string) =>
  ROLES.find((x) => x.key === r)?.color || colors.textDim;

export const radius = {
  sm: 4,
  md: 6,
};

export const spacing = (n: number) => n * 4;
