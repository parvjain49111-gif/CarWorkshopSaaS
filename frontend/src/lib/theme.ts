// -----------------------------------------------------------------------------
// Design tokens — single source of truth for the WorkshopOps app
// Palette: deep-navy background, indigo cards, energetic orange accents.
// Change any token here to cascade the entire app.
// -----------------------------------------------------------------------------

export const colors = {
  // Backgrounds
  bg: "#0B132B",
  bgElevated: "#0F1937",
  surface: "#1C2541",
  surface2: "#233158",
  surfaceHover: "#2A3663",

  // Borders / dividers
  border: "#334155",
  borderStrong: "#475569",

  // Text
  text: "#FFFFFF",
  textDim: "#94A3B8",
  textMuted: "#64748B",

  // Actions
  accent: "#FF6B35",
  accentHover: "#FF824F",
  accentSoft: "#FF6B3520",
  accentContrast: "#FFFFFF",

  // Status
  success: "#22C55E",
  successSoft: "#22C55E20",
  warning: "#FACC15",
  warningSoft: "#FACC1520",
  danger: "#EF4444",
  dangerSoft: "#EF444420",

  // Info accents (used for status pills only)
  info: "#3B82F6",
  violet: "#A855F7",
  cyan: "#22D3EE",
};

// -----------------------------------------------------------------------------
// Job Card 7-state flow — statuses + colors
// -----------------------------------------------------------------------------
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

export const statusColor = (s: string) => STATUS_META[normalizeStatus(s)]?.color || colors.textDim;
export const statusLabel = (s: string) => STATUS_META[normalizeStatus(s)]?.label || s.toUpperCase();
export const statusShort = (s: string) => STATUS_META[normalizeStatus(s)]?.short || s.toUpperCase();

// -----------------------------------------------------------------------------
// Payment + Roles
// -----------------------------------------------------------------------------
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

export const roleLabel = (r: string) => ROLES.find((x) => x.key === r)?.label || r.toUpperCase();
export const roleColor = (r: string) => ROLES.find((x) => x.key === r)?.color || colors.textDim;

// -----------------------------------------------------------------------------
// Radius / spacing / shadow / typography
// -----------------------------------------------------------------------------
export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const spacing = (n: number) => n * 4;

export const shadow = {
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  lg: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
} as const;

export const font = {
  h1: { fontSize: 32, fontWeight: "900" as const, letterSpacing: -1 },
  h2: { fontSize: 24, fontWeight: "900" as const, letterSpacing: -0.5 },
  h3: { fontSize: 18, fontWeight: "800" as const, letterSpacing: -0.3 },
  h4: { fontSize: 15, fontWeight: "800" as const, letterSpacing: 0 },
  body: { fontSize: 14, fontWeight: "500" as const },
  bodyStrong: { fontSize: 14, fontWeight: "700" as const },
  caption: { fontSize: 12, fontWeight: "600" as const, letterSpacing: 0.2 },
  micro: { fontSize: 10, fontWeight: "800" as const, letterSpacing: 1.5 },
};
