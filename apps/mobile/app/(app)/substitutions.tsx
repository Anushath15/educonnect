import React from "react"
import { View, Text, StyleSheet, TouchableOpacity } from "react-native"
import { router } from "expo-router"

export default function SubstitutionsScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Substitutions</Text>
        <View />
      </View>
      <View style={styles.center}>
        <Text style={styles.soon}>Coming soon</Text>
        <Text style={styles.desc}>Substitution management will appear here</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: "#1E293B" },
  back: { color: "#6366F1", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  soon: { fontSize: 24, fontWeight: "700", color: "#FFFFFF" },
  desc: { fontSize: 14, color: "#64748B", textAlign: "center", paddingHorizontal: 40 },
})
