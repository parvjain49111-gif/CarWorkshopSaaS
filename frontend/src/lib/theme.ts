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
};

export const statusColor = (status: string) => {
  if (status === "in_progress") return colors.warning;
  if (status === "completed") return colors.success;
  return colors.danger;
};

export const statusLabel = (status: string) => {
  if (status === "in_progress") return "IN PROGRESS";
  if (status === "completed") return "COMPLETED";
  return "PENDING";
};

export const radius = {
  sm: 4,
  md: 6,
};

export const spacing = (n: number) => n * 4;
