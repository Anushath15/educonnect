import React, { useEffect, useState, useMemo } from "react"
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
  TextInput, ScrollView,
} from "react-native"
import { router } from "expo-router"
import { api } from "../../src/api/client"

interface Subject {
  id: string
  name: string
  code: string
  colorHex: string
}

interface TeacherSubject {
  isPrimary: boolean
  canSubstitute: boolean
  subject: Subject
}

interface Teacher {
  id: string
  name: string
  email: string
  role: string
  taughtSubjects: TeacherSubject[]
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

const ROLE_COLORS: Record<string, string> = {
  PRINCIPAL: "#7C3AED",
  VICE_PRINCIPAL: "#6366F1",
  COORDINATOR: "#0EA5E9",
  CLASS_TEACHER: "#10B981",
  SUBJECT_TEACHER: "#F59E0B",
  TEMP_TEACHER: "#EF4444",
  INTERN: "#8B5CF6",
  OFFICE_STAFF: "#64748B",
}

const FILTERS = [
  { label: "All", value: "" },
  { label: "Principal", value: "PRINCIPAL" },
  { label: "Class Teacher", value: "CLASS_TEACHER" },
  { label: "Subject Teacher", value: "SUBJECT_TEACHER" },
  { label: "Temp", value: "TEMP_TEACHER" },
]

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function TeachersScreen() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [activeFilter, setActiveFilter] = useState("")

  useEffect(() => {
    api.get("/v1/teachers")
      .then((res) => setTeachers(res.data.data))
      .catch(() => setError("Failed to load teachers. Check your connection."))
      .finally(() => setLoading(false))
  }, [])

  const filtered = useMemo(() => {
    return teachers.filter((t) => {
      const matchesSearch =
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.email.toLowerCase().includes(search.toLowerCase())
      const matchesFilter = activeFilter === "" || t.role === activeFilter
      return matchesSearch && matchesFilter
    })
  }, [teachers, search, activeFilter])

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading teachers...</Text>
    </View>
  )

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => {
        setError(null)
        setLoading(true)
        api.get("/v1/teachers")
          .then((res) => setTeachers(res.data.data))
          .catch(() => setError("Failed to load teachers."))
          .finally(() => setLoading(false))
      }}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>Teachers</Text>
          <Text style={styles.count}>{filtered.length} of {teachers.length}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          placeholderTextColor="#475569"
          value={search}
          onChangeText={setSearch}
          autoCorrect={false}
        />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, activeFilter === f.value && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text style={[styles.filterText, activeFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No teachers found</Text>
          <Text style={styles.emptySubText}>Try a different search or filter</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/teachers/${item.id}` as any)}
            >
              <View style={[styles.avatar, { backgroundColor: ROLE_COLORS[item.role] ?? "#6366F1" }]}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={[styles.role, { color: ROLE_COLORS[item.role] ?? "#6366F1" }]}>
                  {ROLE_LABELS[item.role] ?? item.role}
                </Text>
                <Text style={styles.email}>{item.email}</Text>
                {item.taughtSubjects.length > 0 && (
                  <View style={styles.subjects}>
                    {item.taughtSubjects.slice(0, 3).map((ts) => (
                      <View
                        key={ts.subject.id}
                        style={[styles.subjectChip, { backgroundColor: ts.subject.colorHex + "33" }]}
                      >
                        <Text style={[styles.subjectText, { color: ts.subject.colorHex }]}>
                          {ts.subject.code}
                        </Text>
                      </View>
                    ))}
                    {item.taughtSubjects.length > 3 && (
                      <Text style={styles.moreSubjects}>+{item.taughtSubjects.length - 3}</Text>
                    )}
                  </View>
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center", gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: "#1E293B" },
  backBtn: { width: 48 },
  back: { color: "#6366F1", fontSize: 15, fontWeight: "600" },
  headerCenter: { alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  count: { fontSize: 12, color: "#64748B", marginTop: 2 },
  searchContainer: { padding: 16, paddingBottom: 8 },
  searchInput: { backgroundColor: "#1E293B", borderRadius: 12, padding: 12, fontSize: 14, color: "#FFFFFF", borderWidth: 1, borderColor: "#334155" },
  filterRow: { paddingHorizontal: 16, paddingBottom: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  filterChipActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  filterText: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  filterTextActive: { color: "#FFFFFF" },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#1E293B", borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, justifyContent: "center", alignItems: "center", flexShrink: 0 },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: "600", color: "#FFFFFF" },
  role: { fontSize: 12, marginTop: 2, fontWeight: "600" },
  email: { fontSize: 12, color: "#64748B", marginTop: 2 },
  subjects: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 },
  subjectChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  subjectText: { fontSize: 11, fontWeight: "600" },
  moreSubjects: { fontSize: 11, color: "#64748B", alignSelf: "center" },
  chevron: { color: "#334155", fontSize: 24, fontWeight: "300" },
  loadingText: { color: "#64748B", fontSize: 14, marginTop: 8 },
  errorText: { color: "#F87171", fontSize: 15, textAlign: "center", paddingHorizontal: 40 },
  retryBtn: { backgroundColor: "#6366F1", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  emptyText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  emptySubText: { color: "#64748B", fontSize: 14 },
})
