import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, Modal, TextInput, ActivityIndicator,
} from "react-native"
import { router } from "expo-router"
import { Ionicons } from "@expo/vector-icons"
import { api } from "../../../src/api/client"
import { useAuthStore } from "../../../src/stores/authStore"
import { useToast } from "../../../src/components/Toast"
import { LoadingView, ErrorView, EmptyView } from "../../../src/components/StatusView"
import { colors, spacing, radius } from "../../../src/theme"
import { SCHOOL_CONFIG_ROLES } from "@educonnect/shared"
import type { ClassListItem } from "@educonnect/shared"

export default function ClassesScreen() {
  const { user } = useAuthStore()
  const showToast = useToast()
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
      showToast("Name, section, and academic year are required.", "error")
      return
    }
    if (!/^\d{4}-\d{4}$/.test(academicYear.trim())) {
      showToast("Academic year must look like 2024-2025.", "error")
      return
    }
    setSaving(true)
    api.post("/v1/classes", { name: name.trim(), section: section.trim(), academicYear: academicYear.trim() })
      .then(() => {
        setModalOpen(false)
        showToast("Class created")
        fetchClasses()
      })
      .catch((err) => {
        const message = err?.response?.data?.error?.message ?? "Could not create class."
        showToast(message, "error")
      })
      .finally(() => setSaving(false))
  }

  if (loading) return <LoadingView label="Loading classes..." />
  if (error) return <ErrorView message={error} onRetry={() => fetchClasses()} />

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Classes</Text>
        <Text style={styles.count}>{classes.length} classes</Text>
      </View>

      {classes.length === 0 ? (
        <EmptyView icon="school-outline" title="No classes yet" subtitle={canManage ? "Tap + to add your first class" : undefined} />
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchClasses(true)} tintColor={colors.primary} />
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
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        />
      )}

      {canManage && (
        <TouchableOpacity style={styles.fab} onPress={openCreate}>
          <Ionicons name="add" size={26} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>New Class</Text>
            <TextInput style={styles.input} placeholder="Name (e.g. 9)" placeholderTextColor={colors.textFaint} value={name} onChangeText={setName} />
            <TextInput style={styles.input} placeholder="Section (e.g. A)" placeholderTextColor={colors.textFaint} value={section} onChangeText={setSection} />
            <TextInput style={styles.input} placeholder="Academic year (2024-2025)" placeholderTextColor={colors.textFaint} value={academicYear} onChangeText={setAcademicYear} />
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
  container: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 60, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg, backgroundColor: colors.surface },
  title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  count: { fontSize: 13, color: colors.textFaint, marginTop: 2 },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 100 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: spacing.sm },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: spacing.md, flex: 1 },
  classBadge: { width: 48, height: 48, borderRadius: radius.md, backgroundColor: colors.primaryMuted, justifyContent: "center", alignItems: "center" },
  classBadgeText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  className: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  classYear: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  cardRight: { alignItems: "flex-end" },
  studentCount: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
  teacherName: { fontSize: 12, color: colors.textFaint, marginTop: 2 },
  fab: { position: "absolute", bottom: 24, right: 24, width: 56, height: 56, borderRadius: radius.full, backgroundColor: colors.primary, justifyContent: "center", alignItems: "center", elevation: 4 },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, gap: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: spacing.sm },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  modalCancelBtn: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  modalCancelText: { color: colors.textMuted, fontWeight: "600" },
  modalSaveBtn: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", backgroundColor: colors.primary },
  modalSaveText: { color: "#FFFFFF", fontWeight: "700" },
})