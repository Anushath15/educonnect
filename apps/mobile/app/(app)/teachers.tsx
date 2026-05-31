import React, { useEffect, useState } from "react"
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from "react-native"
import { router } from "expo-router"
import { api } from "../../src/api/client"

interface Teacher {
  id: string
  name: string
  email: string
  role: string
  isActive: boolean
}

const ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: "Principal",
  VICE_PRINCIPAL: "Vice Principal",
  COORDINATOR: "Coordinator",
  ADMINISTRATOR: "Administrator",
  CLASS_TEACHER: "Class Teacher",
  SUBJECT_TEACHER: "Subject Teacher",
  TEMP_TEACHER: "Temp Teacher",
  INTERN: "Intern",
  OFFICE_STAFF: "Office Staff",
}

export default function TeachersScreen() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.get("/v1/teachers")
      .then((res) => setTeachers(res.data.data))
      .catch(() => setError("Failed to load teachers"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6366F1" />
    </View>
  )

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Teachers</Text>
        <Text style={styles.count}>{teachers.length} staff</Text>
      </View>
      <FlatList
        data={teachers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{item.name.charAt(0)}</Text>
            </View>
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.role}>{ROLE_LABELS[item.role] ?? item.role}</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
            <View style={[styles.badge, item.isActive ? styles.badgeActive : styles.badgeInactive]}>
              <Text style={styles.badgeText}>{item.isActive ? "Active" : "Inactive"}</Text>
            </View>
          </View>
        )}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 20, backgroundColor: "#1E293B" },
  back: { color: "#6366F1", fontSize: 15, fontWeight: "600" },
  title: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  count: { fontSize: 13, color: "#64748B" },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#1E293B", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#6366F1", justifyContent: "center", alignItems: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  role: { fontSize: 12, color: "#6366F1", marginTop: 2 },
  email: { fontSize: 12, color: "#64748B", marginTop: 2 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeActive: { backgroundColor: "#14532D" },
  badgeInactive: { backgroundColor: "#450A0A" },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#FFFFFF" },
  errorText: { color: "#F87171", fontSize: 15 },
})
