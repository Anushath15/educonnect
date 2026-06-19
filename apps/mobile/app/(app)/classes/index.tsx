import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, RefreshControl, Modal, TextInput, Alert,
} from "react-native"
import { router } from "expo-router"
import { api } from "../../../src/api/client"
import { useAuthStore } from "../../../src/stores/authStore"
import { SCHOOL_CONFIG_ROLES } from "@educonnect/shared"
import type { ClassListItem } from "@educonnect/shared"

export default function ClassesScreen() {
  const { user } = useAuthStore()
  const canManage = SCHOOL_CONFIG_ROLES.includes((user?.role ?? "") as any)

  const [classes, setClasses] = useState<ClassListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [name, setName] = useState("")
  const [section, setSection] = useState("")
  const [academicYear, setAcademicYear] = useState("")
  const [saving, setSaving] = useState(false)

  const fetchClasses = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    api.get("/v1/classes")
      .then((res) => setClasses(res.data.data))
      .catch(() => setError("Failed to load classes. Check your connection."))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])

  const openCreate = () => {
    setName(""); setSection(""); setAcademicYear("")
    setModalOpen(true)
  }

  const submitCreate = () => {
    if (!name.trim() || !section.trim() || !academicYear.trim()) {
      Alert.alert("Missing fields", "Name, section, and academic year are all required.")
      return
    }
    if (!/^\d{4}-\d{4}$/.test(academicYear.trim())) {
      Alert.alert("Invalid academic year", "Use the format 2024-2025.")
      return
    }
    setSaving(true)
    api.post("/v1/classes", { name: name.trim(), section: section.trim(), academicYear: academicYear.trim() })
      .then(() => {
        setModalOpen(false)
        fetchClasses()
      })
      .catch((err) => {
        const message = err?.response?.data?.error?.message ?? "Could not create class."
        Alert.alert("Error", message)
      })
      .finally(() => setSaving(false))
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading classes...</Text>
    </View>
  )

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => fetchClasses()}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Classes</Text>
        <Text style={styles.count}>{classes.length} classes</Text>
      </View>

      {classes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No classes yet</Text>
          {canManage && (
            <Text style={styles.emptySubText}>Tap the button below to add your first class</Text>
          )}
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchClasses(true)} tintColor="#6366F1" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => router.push(`/classes/${item.id}`)}>
              <View style={styles.cardLeft}>
                <View style={styles.classBadge}>
                  <Text style={styles.classBadgeText}>{item.name}{item.section}</Text>
                </View>
                <View>
                  <Text style={styles.className}>{item.name} - {item.section}</Text>
                  <Text style={styles.classYear}>{item.academicYear}</Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.studentCount}>{item.studentCount} students</Text>
                <Text style={styles.teacherName}>
                  {item.classTeacher ? item.classTeacher.name : "No class teacher"}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={openCreate}>
          <Text style={styles.fabText}>+ Add Class</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Class</Text>
            <TextInput
              style={styles.input} placeholder="Name (e.g. 9)" placeholderTextColor="#64748B"
              value={name} onChangeText={setName}
            />
            <TextInput
              style={styles.input} placeholder="Section (e.g. A)" placeholderTextColor="#64748B"
              value={section} onChangeText={setSection}
            />
            <TextInput
              style={styles.input} placeholder="Academic year (2024-2025)" placeholderTextColor="#64748B"
              value={academicYear} onChangeText={setAcademicYear}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setModalOpen(false)} disabled={saving}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={submitCreate} disabled={saving}>
                {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalSaveText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center", gap: 12 },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: "#1E293B" },
  title: { fontSize: 22, fontWeight: "700", color: "#FFFFFF" },
  count: { fontSize: 13, color: "#64748B", marginTop: 2 },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  card: { backgroundColor: "#1E293B", borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  classBadge: { width: 48, height: 48, borderRadius: 12, backgroundColor: "#6366F133", justifyContent: "center", alignItems: "center" },
  classBadgeText: { color: "#6366F1", fontWeight: "700", fontSize: 14 },
  className: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  classYear: { fontSize: 12, color: "#64748B", marginTop: 2 },
  cardRight: { alignItems: "flex-end" },
  studentCount: { fontSize: 13, color: "#CBD5E1", fontWeight: "600" },
  teacherName: { fontSize: 12, color: "#64748B", marginTop: 2 },
  fab: { position: "absolute", bottom: 24, alignSelf: "center", backgroundColor: "#6366F1", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28, elevation: 4 },
  fabText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  loadingText: { color: "#64748B", fontSize: 14, marginTop: 8 },
  errorText: { color: "#F87171", fontSize: 15, textAlign: "center", paddingHorizontal: 40 },
  retryBtn: { backgroundColor: "#6366F1", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  emptyText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  emptySubText: { color: "#64748B", fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
  modalOverlay: { flex: 1, backgroundColor: "#00000099", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#1E293B", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12 },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  input: { backgroundColor: "#0F172A", borderRadius: 10, padding: 14, color: "#FFFFFF", fontSize: 15, borderWidth: 1, borderColor: "#334155" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  modalCancelText: { color: "#94A3B8", fontWeight: "600" },
  modalSaveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", backgroundColor: "#6366F1" },
  modalSaveText: { color: "#FFFFFF", fontWeight: "700" },
})