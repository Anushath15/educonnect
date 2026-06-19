import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Switch, FlatList,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { api } from "../../../src/api/client"
import { useAuthStore } from "../../../src/stores/authStore"
import { ROLE_LABELS, ROLE_COLORS, DAY_LABELS, WORKING_DAYS, STAFF_EDIT_ROLES } from "@educonnect/shared"
import type { TeacherWithSubjects, Subject, DayOfWeek, TeacherConfig } from "@educonnect/shared"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const canEdit = STAFF_EDIT_ROLES.includes((user?.role ?? "") as any)

  const [teacher, setTeacher] = useState<TeacherWithSubjects | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [allSubjects, setAllSubjects] = useState<Subject[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [busySubjectId, setBusySubjectId] = useState<string | null>(null)

  const [maxPerDay, setMaxPerDay] = useState("")
  const [maxPerWeek, setMaxPerWeek] = useState("")
  const [maxConsecutive, setMaxConsecutive] = useState("3")
  const [daysOff, setDaysOff] = useState<DayOfWeek[]>([])
  const [overrideActive, setOverrideActive] = useState(true)
  const [savingConfig, setSavingConfig] = useState(false)

  const loadTeacher = useCallback(() => {
    setLoading(true)
    setError(null)
    api.get(`/v1/teachers/${id}`)
      .then((res) => {
        const t: TeacherWithSubjects = res.data.data
        setTeacher(t)
        const cfg = (t.teacherConfig ?? {}) as Partial<TeacherConfig>
        setMaxPerDay(cfg.maxPeriodsPerDay != null ? String(cfg.maxPeriodsPerDay) : "")
        setMaxPerWeek(cfg.maxPeriodsPerWeek != null ? String(cfg.maxPeriodsPerWeek) : "")
        setMaxConsecutive(cfg.maxConsecutivePeriods != null ? String(cfg.maxConsecutivePeriods) : "3")
        setDaysOff(cfg.preferredDaysOff ?? [])
        setOverrideActive(cfg.isOverrideActive ?? true)
      })
      .catch(() => setError("Failed to load teacher. Check your connection."))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { loadTeacher() }, [loadTeacher])

  const openPicker = () => {
    api.get("/v1/subjects")
      .then((res) => setAllSubjects(res.data.data))
      .catch(() => Alert.alert("Error", "Could not load subjects."))
    setPickerOpen(true)
  }

  const assignSubject = (subjectId: string) => {
    setBusySubjectId(subjectId)
    api.post(`/v1/teachers/${id}/subjects`, { subjectId, isPrimary: false, canSubstitute: true })
      .then(() => { setPickerOpen(false); loadTeacher() })
      .catch((err) => {
        const message = err?.response?.data?.error?.message ?? "Could not assign subject."
        Alert.alert("Error", message)
      })
      .finally(() => setBusySubjectId(null))
  }

  const removeSubject = (subjectId: string, subjectName: string) => {
    Alert.alert(`Remove ${subjectName}?`, "This teacher will no longer be assigned to this subject.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => {
          setBusySubjectId(subjectId)
          api.delete(`/v1/teachers/${id}/subjects/${subjectId}`)
            .then(() => loadTeacher())
            .catch(() => Alert.alert("Error", "Could not remove subject."))
            .finally(() => setBusySubjectId(null))
        },
      },
    ])
  }

  const toggleDayOff = (day: DayOfWeek) => {
    setDaysOff((prev) => prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day])
  }

  const saveConfig = () => {
    setSavingConfig(true)
    const body: any = {
      maxConsecutivePeriods: parseInt(maxConsecutive, 10) || 3,
      preferredDaysOff: daysOff,
      isOverrideActive: overrideActive,
    }
    if (maxPerDay.trim()) body.maxPeriodsPerDay = parseInt(maxPerDay, 10)
    if (maxPerWeek.trim()) body.maxPeriodsPerWeek = parseInt(maxPerWeek, 10)

    api.put(`/v1/teachers/${id}/config`, body)
      .then(() => Alert.alert("Saved", "Workload settings updated."))
      .catch((err) => {
        const message = err?.response?.data?.error?.message ?? "Could not save settings."
        Alert.alert("Error", message)
      })
      .finally(() => setSavingConfig(false))
  }

  if (loading) return (
    <View style={s.center}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={s.loadingText}>Loading teacher...</Text>
    </View>
  )

  if (error || !teacher) return (
    <View style={s.center}>
      <Text style={s.errorText}>{error ?? "Teacher not found"}</Text>
      <TouchableOpacity style={s.retryBtn} onPress={loadTeacher}>
        <Text style={s.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  )

  const assignedIds = new Set(teacher.taughtSubjects.map((ts) => ts.subject.id))
  const availableSubjects = allSubjects.filter((sub) => !assignedIds.has(sub.id))
  const roleColor = ROLE_COLORS[teacher.role] ?? "#6366F1"

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.back}>Back</Text>
        </TouchableOpacity>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.profile}>
          <View style={[s.avatar, { backgroundColor: roleColor }]}>
            <Text style={s.avatarText}>{getInitials(teacher.name)}</Text>
          </View>
          <Text style={s.name}>{teacher.name}</Text>
          <Text style={[s.role, { color: roleColor }]}>
            {ROLE_LABELS[teacher.role] ?? teacher.role}
          </Text>
          <Text style={s.email}>{teacher.email}</Text>
        </View>

        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Text style={s.sectionTitle}>Subjects Taught</Text>
            {canEdit && (
              <TouchableOpacity onPress={openPicker}>
                <Text style={s.addLink}>+ Assign</Text>
              </TouchableOpacity>
            )}
          </View>

          {teacher.taughtSubjects.length === 0 ? (
            <Text style={s.emptyText}>No subjects assigned yet</Text>
          ) : (
            teacher.taughtSubjects.map((ts) => (
              <View key={ts.subject.id} style={s.subjectRow}>
                <View style={[s.subjectDot, { backgroundColor: ts.subject.colorHex }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.subjectName}>{ts.subject.name}</Text>
                  <Text style={s.subjectMeta}>
                    {ts.subject.code}
                    {ts.isPrimary ? " • Primary" : ""}
                    {ts.canSubstitute ? " • Can substitute" : ""}
                  </Text>
                </View>
                {canEdit && (
                  <TouchableOpacity
                    onPress={() => removeSubject(ts.subject.id, ts.subject.name)}
                    disabled={busySubjectId === ts.subject.id}
                  >
                    {busySubjectId === ts.subject.id
                      ? <ActivityIndicator size="small" color="#EF4444" />
                      : <Text style={s.removeLink}>Remove</Text>}
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Workload Settings</Text>

          <Text style={s.fieldLabel}>Max periods per day</Text>
          <TextInput
            style={[s.input, !canEdit && s.inputDisabled]}
            value={maxPerDay}
            onChangeText={setMaxPerDay}
            keyboardType="number-pad"
            placeholder="No limit"
            placeholderTextColor="#64748B"
            editable={canEdit}
          />

          <Text style={s.fieldLabel}>Max periods per week</Text>
          <TextInput
            style={[s.input, !canEdit && s.inputDisabled]}
            value={maxPerWeek}
            onChangeText={setMaxPerWeek}
            keyboardType="number-pad"
            placeholder="No limit"
            placeholderTextColor="#64748B"
            editable={canEdit}
          />

          <Text style={s.fieldLabel}>Max consecutive periods</Text>
          <TextInput
            style={[s.input, !canEdit && s.inputDisabled]}
            value={maxConsecutive}
            onChangeText={setMaxConsecutive}
            keyboardType="number-pad"
            editable={canEdit}
          />

          <Text style={s.fieldLabel}>Preferred days off</Text>
          <View style={s.dayRow}>
            {WORKING_DAYS.map((day) => {
              const active = daysOff.includes(day)
              return (
                <TouchableOpacity
                  key={day}
                  style={[s.dayChip, active && s.dayChipActive]}
                  onPress={() => canEdit && toggleDayOff(day)}
                  disabled={!canEdit}
                >
                  <Text style={[s.dayChipText, active && s.dayChipTextActive]}>
                    {DAY_LABELS[day]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          <View style={s.switchRow}>
            <Text style={s.fieldLabel}>Active</Text>
            <Switch
              value={overrideActive}
              onValueChange={canEdit ? setOverrideActive : undefined}
              disabled={!canEdit}
              trackColor={{ false: "#334155", true: "#6366F1" }}
            />
          </View>

          {canEdit && (
            <TouchableOpacity
              style={[s.saveBtn, savingConfig && s.saveBtnDisabled]}
              onPress={saveConfig}
              disabled={savingConfig}
            >
              {savingConfig
                ? <ActivityIndicator size="small" color="#FFFFFF" />
                : <Text style={s.saveBtnText}>Save Settings</Text>}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      <Modal visible={pickerOpen} animationType="slide" transparent onRequestClose={() => setPickerOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Assign Subject</Text>
              <TouchableOpacity onPress={() => setPickerOpen(false)}>
                <Text style={s.modalClose}>Close</Text>
              </TouchableOpacity>
            </View>
            {availableSubjects.length === 0 ? (
              <Text style={s.emptyText}>All subjects are already assigned</Text>
            ) : (
              <FlatList
                data={availableSubjects}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.pickerRow}
                    onPress={() => assignSubject(item.id)}
                    disabled={busySubjectId === item.id}
                  >
                    <View style={[s.subjectDot, { backgroundColor: item.colorHex }]} />
                    <Text style={s.pickerRowText}>{item.name} ({item.code})</Text>
                    {busySubjectId === item.id && <ActivityIndicator size="small" color="#6366F1" />}
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  center: { flex: 1, backgroundColor: "#0F172A", justifyContent: "center", alignItems: "center", gap: 12 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: "#1E293B" },
  backBtn: { width: 48 },
  back: { color: "#6366F1", fontSize: 15, fontWeight: "600" },
  scroll: { padding: 20, gap: 16 },
  profile: { alignItems: "center", paddingVertical: 12 },
  avatar: { width: 72, height: 72, borderRadius: 36, justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { color: "#FFFFFF", fontSize: 24, fontWeight: "700" },
  name: { fontSize: 20, fontWeight: "700", color: "#FFFFFF" },
  role: { fontSize: 14, fontWeight: "600", marginTop: 4 },
  email: { fontSize: 13, color: "#64748B", marginTop: 4 },
  section: { backgroundColor: "#1E293B", borderRadius: 14, padding: 16, gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  addLink: { color: "#6366F1", fontSize: 13, fontWeight: "600" },
  emptyText: { color: "#64748B", fontSize: 13, textAlign: "center", paddingVertical: 12 },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: "#334155" },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectName: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  subjectMeta: { fontSize: 11, color: "#64748B", marginTop: 2 },
  removeLink: { color: "#EF4444", fontSize: 12, fontWeight: "600" },
  fieldLabel: { fontSize: 12, color: "#94A3B8", marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: "#0F172A", borderRadius: 8, borderWidth: 1, borderColor: "#334155", color: "#FFFFFF", paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  inputDisabled: { opacity: 0.5 },
  dayRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  dayChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  dayChipActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  dayChipText: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  dayChipTextActive: { color: "#FFFFFF" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 12 },
  saveBtn: { backgroundColor: "#6366F1", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 16 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  loadingText: { color: "#64748B", fontSize: 14 },
  errorText: { color: "#F87171", fontSize: 15, textAlign: "center", paddingHorizontal: 40 },
  retryBtn: { backgroundColor: "#6366F1", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  modalSheet: { backgroundColor: "#1E293B", borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: "#FFFFFF" },
  modalClose: { color: "#6366F1", fontSize: 14, fontWeight: "600" },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#334155" },
  pickerRowText: { flex: 1, color: "#FFFFFF", fontSize: 14 },
})