// Single source of truth for the app's visual language.
// Every hex value here was already in use across the existing screens -
// this just names them instead of repeating the literal string everywhere.

export const colors = {
  bg: "#0F172A",
  surface: "#1E293B",
  surfaceAlt: "#0F172A",
  border: "#334155",
  primary: "#6366F1",
  primaryMuted: "#6366F133",
  textPrimary: "#FFFFFF",
  textSecondary: "#CBD5E1",
  textMuted: "#94A3B8",
  textFaint: "#64748B",
  danger: "#EF4444",
  dangerMuted: "#EF444433",
  success: "#10B981",
  successMuted: "#10B98133",
  warning: "#F59E0B",
  overlay: "#00000099",
}

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 }
export const radius = { sm: 8, md: 12, lg: 14, xl: 20, full: 999 }

export const typography = {
  title: { fontSize: 18, fontWeight: "700" as const, color: colors.textPrimary },
  screenTitle: { fontSize: 22, fontWeight: "700" as const, color: colors.textPrimary },
  subtitle: { fontSize: 13, color: colors.textFaint },
  body: { fontSize: 14, color: colors.textSecondary },
  caption: { fontSize: 12, color: colors.textMuted },
}