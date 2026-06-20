import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, Switch, FlatList,
} from "react-native"
import { useLocalSearchParams } from "expo-router"
import { api } from "../../../src/api/client"
import { useAuthStore } from "../../../src/stores/authStore"
import { useToast } from "../../../src/components/Toast"
import { ScreenHeader } from "../../../src/components/ScreenHeader"
import { LoadingView, ErrorView } from "../../../src/components/StatusView"
import { colors, spacing, radius, typography } from "../../../src/theme"
import { ROLE_LABELS, ROLE_COLORS, DAY_LABELS, WORKING_DAYS, STAFF_EDIT_ROLES } from "@educonnect/shared"
import type { TeacherWithSubjects, Subject, DayOfWeek, TeacherConfig } from "@educonnect/shared"

function getInitials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
}

export default function TeacherDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuthStore()
  const showToast = useToast()
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
      .catch(() => showToast("Could not load subjects.", "error"))
    setPickerOpen(true)
  }

  const assignSubject = (subjectId: string) => {
    setBusySubjectId(subjectId)
    api.post(`/v1/teachers/${id}/subjects`, { subjectId, isPrimary: false, canSubstitute: true })
      .then(() => {
        setPickerOpen(false)
        loadTeacher()
        showToast("Subject assigned")
      })
      .catch((err) => {
        const message = err?.response?.data?.error?.message ?? "Could not assign subject."
        showToast(message, "error")
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
            .then(() => { loadTeacher(); showToast("Subject removed") })
            .catch(() => showToast("Could not remove subject.", "error"))
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
      .then(() => showToast("Workload settings saved"))
      .catch((err) => {
        const message = err?.response?.data?.error?.message ?? "Could not save settings."
        showToast(message, "error")
      })
      .finally(() => setSavingConfig(false))
  }

  if (loading) return <LoadingView label="Loading teacher..." />
  if (error || !teacher) return <ErrorView message={error ?? "Teacher not found"} onRetry={loadTeacher} />

  const assignedIds = new Set(teacher.taughtSubjects.map((ts) => ts.subject.id))
  const availableSubjects = allSubjects.filter((sub) => !assignedIds.has(sub.id))
  const roleColor = ROLE_COLORS[teacher.role] ?? colors.primary

  return (
    <View style={s.container}>
      <ScreenHeader title={teacher.name} subtitle={ROLE_LABELS[teacher.role] ?? teacher.role} />

      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.profile}>
          <View style={[s.avatar, { backgroundColor: roleColor }]}>
            <Text style={s.avatarText}>{getInitials(teacher.name)}</Text>
          </View>
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
                    {ts.isPrimary ? " - Primary" : ""}
                    {ts.canSubstitute ? " - Can substitute" : ""}
                  </Text>
                </View>
                {canEdit && (
                  <TouchableOpacity
                    onPress={() => removeSubject(ts.subject.id, ts.subject.name)}
                    disabled={busySubjectId === ts.subject.id}
                  >
                    {busySubjectId === ts.subject.id
                      ? <ActivityIndicator size="small" color={colors.danger} />
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
            placeholderTextColor={colors.textFaint}
            editable={canEdit}
          />

          <Text style={s.fieldLabel}>Max periods per week</Text>
          <TextInput
            style={[s.input, !canEdit && s.inputDisabled]}
            value={maxPerWeek}
            onChangeText={setMaxPerWeek}
            keyboardType="number-pad"
            placeholder="No limit"
            placeholderTextColor={colors.textFaint}
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
              trackColor={{ false: colors.border, true: colors.primary }}
            />
          </View>

          {canEdit && (
            <TouchableOpacity
              style={[s.saveBtn, savingConfig && s.saveBtnDisabled]}
              onPress={saveConfig}
              disabled={savingConfig}
            >
              {savingConfig
                ? <ActivityIndicator size="small" color={colors.textPrimary} />
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
                    {busySubjectId === item.id && <ActivityIndicator size="small" color={colors.primary} />}
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
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, gap: spacing.lg },
  profile: { alignItems: "center", paddingVertical: spacing.md },
  avatar: { width: 72, height: 72, borderRadius: radius.full, justifyContent: "center", alignItems: "center", marginBottom: spacing.md },
  avatarText: { color: colors.textPrimary, fontSize: 24, fontWeight: "700" },
  email: { ...typography.subtitle },
  section: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { ...typography.title, fontSize: 15 },
  addLink: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  emptyText: { color: colors.textFaint, fontSize: 13, textAlign: "center", paddingVertical: spacing.md },
  subjectRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  subjectName: { ...typography.body, fontWeight: "600", color: colors.textPrimary },
  subjectMeta: { ...typography.caption, marginTop: 2 },
  removeLink: { color: colors.danger, fontSize: 12, fontWeight: "600" },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14 },
  inputDisabled: { opacity: 0.5 },
  dayRow: { flexDirection: "row", gap: spacing.xs, flexWrap: "wrap" },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: 12, color: colors.textMuted, fontWeight: "500" },
  dayChipTextActive: { color: colors.textPrimary },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: spacing.md },
  saveBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.lg },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: "70%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  modalTitle: { ...typography.title },
  modalClose: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerRowText: { flex: 1, color: colors.textPrimary, fontSize: 14 },
})