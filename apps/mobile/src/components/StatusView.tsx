import React from "react"
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, spacing, radius } from "../theme"

export function LoadingView({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{label}</Text>
    </View>
  )
}

export function ErrorView({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.danger} />
      <Text style={styles.errorText}>{message}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )
}

export function EmptyView({ title, subtitle, icon = "file-tray-outline" }: { title: string; subtitle?: string; icon?: keyof typeof Ionicons.glyphMap }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={40} color={colors.textFaint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: colors.bg, justifyContent: "center", alignItems: "center", gap: spacing.sm, paddingHorizontal: 40 },
  muted: { color: colors.textFaint, fontSize: 14, textAlign: "center", marginTop: 4 },
  errorText: { color: colors.danger, fontSize: 15, textAlign: "center" },
  retryBtn: { backgroundColor: colors.primary, borderRadius: radius.sm, paddingHorizontal: 24, paddingVertical: 10, marginTop: 8 },
  retryText: { color: colors.textPrimary, fontSize: 14, fontWeight: "600" },
  emptyTitle: { color: colors.textPrimary, fontSize: 18, fontWeight: "600" },
})