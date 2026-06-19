import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { router } from "expo-router"
import { colors, spacing } from "../theme"

type Props = {
  title: string
  subtitle?: string
  showBack?: boolean
  rightAction?: { icon: keyof typeof Ionicons.glyphMap; onPress: () => void }
}

export function ScreenHeader({ title, subtitle, showBack = true, rightAction }: Props) {
  return (
    <View style={styles.header}>
      <View style={styles.side}>
        {showBack && (
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.center}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <View style={[styles.side, { alignItems: "flex-end" }]}>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} hitSlop={12}>
            <Ionicons name={rightAction.icon} size={22} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    backgroundColor: colors.surface,
  },
  side: { width: 48 },
  center: { flex: 1, alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  subtitle: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
})