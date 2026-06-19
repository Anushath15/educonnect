import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { api } from "../../../src/api/client"
import { useAuthStore } from "../../../src/stores/authStore"
import { SCHOOL_CONFIG_ROLES, STUDENT_EDIT_ROLES, ROLE_LABELS } from "@educonnect/shared"
import type { ClassDetail, Student } from "@educonnect/shared"

type TeacherOption = { id: string; name: string; email: string; role: string }

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const canManageClass = SCHOOL_CONFIG_ROLES.includes((user?.role ?? "") as any)
  const canManageStudents = STUDENT_EDIT_ROLES.includes((user?.role ?? "") as any)

  const [cls, setCls] = useState<ClassDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [teacherPickerOpen, setTeacherPickerOpen] = useState(false)
  const [teacherOptions, setTeacherOptions] = useState<TeacherOption[]>([])
  const [teacherOptionsLoading, setTeacherOptionsLoading] = useState(false)
  const [assigningTeacherId, setAssigningTeacherId] = useState<string | null>(null)

  const [studentModalOpen, setStudentModalOpen] = useState(false)
  const [sName, setSName] = useState("")
  const [sRollNumber, setSRollNumber] = useState("")
  const [sParentName, setSParentName] = useState("")
  const [sParentPhone, setSParentPhone] = useState("")
  const [savingStudent, setSavingStudent] = useState(false)

  const fetchClass = useCallback(() => {
    setLoading(true)
    setError(null)
    api.get(`/v1/classes/${id}`)
      .then((res) => setCls(res.data.data))
      .catch((err) => {
        const message = err?.response?.status === 404 ? "Class not found." : "Failed to load class. Check your connection."
        setError(message)
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { fetchClass() }, [fetchClass])

  const openTeacherPicker = () => {
    setTeacherPickerOpen(true)
    setTeacherOptionsLoading(true)
    api.get("/v1/teachers")
      .then((res) => setTeacherOptions(res.data.data))
      .catch(() => Alert.alert("Error", "Could not load teacher list."))
      .finally(() => setTeacherOptionsLoading(false))
  }

  const assignTeacher = (teacherId: string | null) => {
    setAssigningTeacherId(teacherId ?? "none")
    api.patch(`/v1/classes/${id}/teacher`, { classTeacherId: teacherId })
      .then(() => {
        setTeacherPickerOpen(false)
        fetchClass()
      })
      .catch(() => Alert.alert("Error", "Could not update class teacher."))
      .finally(() => setAssigningTeacherId(null))
  }

  const openAddStudent = () => {
    setSName(""); setSRollNumber(""); setSParentName(""); setSParentPhone("")
    setStudentModalOpen(true)
  }

  const submitStudent = () => {
    if (!sName.trim()) {
      Alert.alert("Missing name", "Student name is required.")
      return
    }
    setSavingStudent(true)
    api.post("/v1/students", {
      classId: id,
      name: sName.trim(),
      rollNumber: sRollNumber.trim() || undefined,
      parentName: sParentName.trim() || undefined,
      parentPhone: sParentPhone.trim() || undefined,
    })
      .then(() => {
        setStudentModalOpen(false)
        fetchClass()
      })
      .catch((err) => {
        const message = err?.response?.data?.error?.message ?? "Could not add student."
        Alert.alert("Error", message)
      })
      .finally(() => setSavingStudent(false))
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading class...</Text>
    </View>
  )

  if (error || !cls) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error ?? "Class not found."}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => fetchClass()}>
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
          <Text style={styles.title}>{cls.name} - {cls.section}</Text>
          <Text style={styles.count}>{cls.academicYear}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <FlatList
        data={cls.students}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.teacherCard}>
            <View>
              <Text style={styles.teacherLabel}>Class Teacher</Text>
              <Text style={styles.teacherValue}>
                {cls.classTeacher ? cls.classTeacher.name : "Not assigned"}
              </Text>
              {cls.classTeacher && <Text style={styles.teacherEmail}>{cls.classTeacher.email}</Text>}
            </View>
            {canManageClass && (
              <TouchableOpacity style={styles.changeBtn} onPress={openTeacherPicker}>
                <Text style={styles.changeBtnText}>{cls.classTeacher ? "Change" : "Assign"}</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyRoster}>
            <Text style={styles.emptyText}>No students yet</Text>
          </View>
        }
        renderItem={({ item }: { item: Student }) => (
          <View style={styles.studentCard}>
            <View style={styles.studentAvatar}>
              <Text style={styles.studentInitial}>{item.name.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.studentName}>{item.name}</Text>
              <Text style={styles.studentMeta}>
                {item.rollNumber ? `Roll ${item.rollNumber}` : "No roll number"}
                {item.parentName ? `  -  ${item.parentName}` : ""}
              </Text>
              {item.parentPhone && <Text style={styles.studentPhone}>{item.parentPhone}</Text>}
            </View>
          </View>
        )}
      />

      {canManageStudents && (
        <TouchableOpacity style={styles.fab} onPress={openAddStudent}>
          <Text style={styles.fabText}>+ Add Student</Text>
        </TouchableOpacity>
      )}

      <Modal visible={teacherPickerOpen} animationType="slide" transparent onRequestClose={() => setTeacherPickerOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Assign Class Teacher</Text>
            {teacherOptionsLoading ? (
              <ActivityIndicator size="large" color="#6366F1" style={{ marginVertical: 24 }} />
            ) : (
              <FlatList
                data={teacherOptions}
                keyExtractor={(t) => t.id}
                style={{ maxHeight: 360 }}
                ListHeaderComponent={
                  cls.classTeacher ? (
                    <TouchableOpacity
                      style={styles.teacherOption}
                      disabled={assigningTeacherId !== null}
                      onPress={() => assignTeacher(null)}
                    >
                      <Text style={[styles.teacherOptionText, { color: "#EF4444" }]}>Remove class teacher</Text>
                      {assigningTeacherId === "none" && <ActivityIndicator size="small" color="#EF4444" />}
                    </TouchableOpacity>
                  ) : null
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.teacherOption}
                    disabled={assigningTeacherId !== null}
                    onPress={() => assignTeacher(item.id)}
                  >
                    <View>
                      <Text style={styles.teacherOptionText}>{item.name}</Text>
                      <Text style={styles.teacherOptionRole}>{ROLE_LABELS[item.role] ?? item.role}</Text>
                    </View>
                    {assigningTeacherId === item.id && <ActivityIndicator size="small" color="#6366F1" />}
                  </TouchableOpacity>
                )}
              />
            )}
            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setTeacherPickerOpen(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={studentModalOpen} animationType="slide" transparent onRequestClose={() => setStudentModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add Student</Text>
            <TextInput style={styles.input} placeholder="Full name" placeholderTextColor="#64748B" value={sName} onChangeText={setSName} />
            <TextInput style={styles.input} placeholder="Roll number (optional)" placeholderTextColor="#64748B" value={sRollNumber} onChangeText={setSRollNumber} />
            <TextInput style={styles.input} placeholder="Parent name (optional)" placeholderTextColor="#64748B" value={sParentName} onChangeText={setSParentName} />
            <TextInput style={styles.input} placeholder="Parent phone (optional)" placeholderTextColor="#64748B" value={sParentPhone} onChangeText={setSParentPhone} keyboardType="phone-pad" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtnInline} onPress={() => setStudentModalOpen(false)} disabled={savingStudent}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={submitStudent} disabled={savingStudent}>
                {savingStudent ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.modalSaveText}>Add</Text>}
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
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: "#1E293B" },
  backBtn: { width: 48 },
  back: { color: "#6366F1", fontSize: 15, fontWeight: "600" },
  headerCenter: { alignItems: "center" },
  title: { fontSize: 18, fontWeight: "700", color: "#FFFFFF" },
  count: { fontSize: 12, color: "#64748B", marginTop: 2 },
  list: { padding: 16, gap: 10, paddingBottom: 100 },
  teacherCard: { backgroundColor: "#1E293B", borderRadius: 14, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  teacherLabel: { fontSize: 12, color: "#64748B" },
  teacherValue: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  teacherEmail: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  changeBtn: { borderWidth: 1, borderColor: "#6366F1", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8 },
  changeBtnText: { color: "#6366F1", fontWeight: "600", fontSize: 13 },
  studentCard: { backgroundColor: "#1E293B", borderRadius: 12, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  studentAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#6366F133", justifyContent: "center", alignItems: "center" },
  studentInitial: { color: "#6366F1", fontWeight: "700" },
  studentName: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  studentMeta: { fontSize: 12, color: "#94A3B8", marginTop: 2 },
  studentPhone: { fontSize: 12, color: "#64748B", marginTop: 2 },
  emptyRoster: { paddingVertical: 40, alignItems: "center" },
  emptyText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  fab: { position: "absolute", bottom: 24, alignSelf: "center", backgroundColor: "#6366F1", paddingHorizontal: 24, paddingVertical: 14, borderRadius: 28, elevation: 4 },
  fabText: { color: "#FFFFFF", fontWeight: "700", fontSize: 14 },
  loadingText: { color: "#64748B", fontSize: 14, marginTop: 8 },
  errorText: { color: "#F87171", fontSize: 15, textAlign: "center", paddingHorizontal: 40 },
  retryBtn: { backgroundColor: "#6366F1", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "#00000099", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#1E293B", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, gap: 12, maxHeight: "80%" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: "#FFFFFF", marginBottom: 8 },
  input: { backgroundColor: "#0F172A", borderRadius: 10, padding: 14, color: "#FFFFFF", fontSize: 15, borderWidth: 1, borderColor: "#334155" },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  modalCancelBtn: { borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#334155", marginTop: 8 },
  modalCancelBtnInline: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", borderWidth: 1, borderColor: "#334155" },
  modalCancelText: { color: "#94A3B8", fontWeight: "600" },
  modalSaveBtn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: "center", backgroundColor: "#6366F1" },
  modalSaveText: { color: "#FFFFFF", fontWeight: "700" },
  teacherOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#334155" },
  teacherOptionText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  teacherOptionRole: { color: "#64748B", fontSize: 12, marginTop: 2 },
})