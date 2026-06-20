import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, RefreshControl,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { api } from "../../src/api/client"
import { useAuthStore } from "../../src/stores/authStore"
import { useToast } from "../../src/components/Toast"
import { ScreenHeader } from "../../src/components/ScreenHeader"
import { LoadingView, ErrorView, EmptyView } from "../../src/components/StatusView"
import { colors, spacing, radius, typography } from "../../src/theme"
import { SUBSTITUTION_ASSIGN_ROLES } from "@educonnect/shared"
import type { SubstitutionExpanded, AvailableTeacher, SubstitutionStatus, TimetableSlotExpanded } from "@educonnect/shared"

const STATUS_COLORS: Record<SubstitutionStatus, string> = {
  PENDING: colors.warning,
  REQUESTED: colors.primary,
  ACCEPTED: colors.success,
  DECLINED: colors.danger,
  CANCELLED: colors.textFaint,
  COMPLETED: colors.success,
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0]
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  date.setHours(0, 0, 0, 0)
  return date
}

const DAY_CODES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export default function SubstitutionsScreen() {
  const { user } = useAuthStore()
  const showToast = useToast()
  const canAssign = SUBSTITUTION_ASSIGN_ROLES.includes((user?.role ?? "") as any)

  const [items, setItems] = useState<SubstitutionExpanded[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [respondingId, setRespondingId] = useState<string | null>(null)

  // --- Mark Absent flow ---
  const [markOpen, setMarkOpen] = useState(false)
  const [teacherOptions, setTeacherOptions] = useState<{ id: string; name: string }[]>([])
  const [pickedTeacherId, setPickedTeacherId] = useState<string | null>(null)
  const [absentDate, setAbsentDate] = useState(todayISO())
  const [teacherSlots, setTeacherSlots] = useState<TimetableSlotExpanded[]>([])
  const [selectedSlotIds, setSelectedSlotIds] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [submittingAbsent, setSubmittingAbsent] = useState(false)

  // --- Assign Substitute flow ---
  const [assignTarget, setAssignTarget] = useState<SubstitutionExpanded | null>(null)
  const [availableTeachers, setAvailableTeachers] = useState<AvailableTeacher[]>([])
  const [loadingAvailable, setLoadingAvailable] = useState(false)
  const [assigningId, setAssigningId] = useState<string | null>(null)

  const fetchHistory = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    api.get("/v1/substitutions", { params: { page: 1, limit: 50 } })
      .then((res) => setItems(res.data.data))
      .catch(() => setError("Failed to load substitutions. Check your connection."))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const respond = (id: string, action: "accept" | "decline") => {
    setRespondingId(id)
    api.post(`/v1/substitutions/${id}/respond`, { action })
      .then(() => { showToast(action === "accept" ? "Accepted" : "Declined"); fetchHistory() })
      .catch((err) => showToast(err?.response?.data?.error?.message ?? "Could not respond.", "error"))
      .finally(() => setRespondingId(null))
  }

  // --- Mark Absent handlers ---

  const openMarkAbsent = () => {
    setPickedTeacherId(null)
    setAbsentDate(todayISO())
    setTeacherSlots([])
    setSelectedSlotIds([])
    setMarkOpen(true)
    api.get("/v1/teachers")
      .then((res) => setTeacherOptions(res.data.data.map((t: any) => ({ id: t.id, name: t.name }))))
      .catch(() => showToast("Could not load teachers.", "error"))
  }

  const loadSlotsForDate = useCallback((teacherId: string, dateStr: string) => {
    setLoadingSlots(true)
    setSelectedSlotIds([])
    const monday = getMonday(new Date(dateStr))
    const weekStartDate = monday.toISOString().split("T")[0]
    api.get("/v1/timetable", { params: { weekStartDate } })
      .then((res) => {
        const dayCode = DAY_CODES[new Date(dateStr).getDay()]
        const mine: TimetableSlotExpanded[] = res.data.data.filter(
          (s: TimetableSlotExpanded) => s.teacher.id === teacherId && s.dayOfWeek === dayCode
        )
        setTeacherSlots(mine)
      })
      .catch(() => showToast("Could not load that teacher's schedule.", "error"))
      .finally(() => setLoadingSlots(false))
  }, [showToast])

  useEffect(() => {
    if (pickedTeacherId && absentDate) loadSlotsForDate(pickedTeacherId, absentDate)
  }, [pickedTeacherId, absentDate, loadSlotsForDate])

  const toggleSlot = (slotId: string) => {
    setSelectedSlotIds((prev) => prev.includes(slotId) ? prev.filter((s) => s !== slotId) : [...prev, slotId])
  }

  const submitMarkAbsent = () => {
    if (!pickedTeacherId || selectedSlotIds.length === 0) {
      showToast("Pick a teacher and at least one period.", "error")
      return
    }
    setSubmittingAbsent(true)
    api.post("/v1/substitutions/mark-absent", {
      absentTeacherId: pickedTeacherId,
      date: absentDate,
      slotIds: selectedSlotIds,
    })
      .then(() => {
        setMarkOpen(false)
        showToast(`Marked absent for ${selectedSlotIds.length} period(s)`)
        fetchHistory()
      })
      .catch((err) => showToast(err?.response?.data?.error?.message ?? "Could not mark absent.", "error"))
      .finally(() => setSubmittingAbsent(false))
  }

  // --- Assign Substitute handlers ---

  const openAssign = (item: SubstitutionExpanded) => {
    setAssignTarget(item)
    setLoadingAvailable(true)
    api.get("/v1/substitutions/available-teachers", {
      params: { date: item.date.split("T")[0], periodId: item.timetableSlot.periodId },
    })
      .then((res) => setAvailableTeachers(res.data.data))
      .catch(() => showToast("Could not load available teachers.", "error"))
      .finally(() => setLoadingAvailable(false))
  }

  const submitAssign = (teacherId: string) => {
    if (!assignTarget) return
    setAssigningId(teacherId)
    api.post(`/v1/substitutions/${assignTarget.id}/assign`, { substituteTeacherId: teacherId })
      .then(() => { setAssignTarget(null); showToast("Substitute assigned"); fetchHistory() })
      .catch((err) => showToast(err?.response?.data?.error?.message ?? "Could not assign substitute.", "error"))
      .finally(() => setAssigningId(null))
  }

  if (loading) return <LoadingView label="Loading substitutions..." />
  if (error) return <ErrorView message={error} onRetry={() => fetchHistory()} />

  return (
    <View style={s.container}>
      <ScreenHeader
        title="Substitutions"
        showBack={false}
        rightAction={canAssign ? { icon: "add", onPress: openMarkAbsent } : undefined}
      />

      {items.length === 0 ? (
        <EmptyView title="No substitutions yet" subtitle="Marked absences will show up here." icon="swap-horizontal-outline" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchHistory(true)} tintColor={colors.primary} />}
          renderItem={({ item }) => {
            const isMyRequest = item.status === "REQUESTED" && item.substituteTeacherId === user?.id
            const canAssignThis = canAssign && item.status === "PENDING"
            return (
              <TouchableOpacity
                style={s.card}
                onPress={() => canAssignThis && openAssign(item)}
                activeOpacity={canAssignThis ? 0.7 : 1}
              >
                <View style={s.cardHeader}>
                  <Text style={s.subject}>{item.timetableSlot.subject.name}</Text>
                  <View style={[s.badge, { backgroundColor: STATUS_COLORS[item.status] }]}>
                    <Text style={s.badgeText}>{item.status}</Text>
                  </View>
                </View>
                <Text style={s.meta}>
                  {item.date.split("T")[0]} - {item.timetableSlot.period.startTime} to {item.timetableSlot.period.endTime}
                </Text>
                <Text style={s.meta}>Absent: {item.absentTeacher.name}</Text>
                <Text style={s.meta}>
                  Substitute: {item.substituteTeacher?.name ?? "Unassigned"}
                </Text>

                {canAssignThis && (
                  <Text style={s.tapHint}>Tap to find a substitute</Text>
                )}

                {isMyRequest && (
                  <View style={s.respondRow}>
                    <TouchableOpacity
                      style={[s.respondBtn, s.declineBtn]}
                      onPress={() => respond(item.id, "decline")}
                      disabled={respondingId === item.id}
                    >
                      <Text style={s.declineText}>Decline</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.respondBtn, s.acceptBtn]}
                      onPress={() => respond(item.id, "accept")}
                      disabled={respondingId === item.id}
                    >
                      {respondingId === item.id
                        ? <ActivityIndicator size="small" color={colors.textPrimary} />
                        : <Text style={s.acceptText}>Accept</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            )
          }}
        />
      )}

      {/* Mark Absent modal */}
      <Modal visible={markOpen} animationType="slide" transparent onRequestClose={() => setMarkOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Mark Teacher Absent</Text>
              <TouchableOpacity onPress={() => setMarkOpen(false)}>
                <Text style={s.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Teacher</Text>
            <FlatList
              horizontal
              data={teacherOptions}
              keyExtractor={(t) => t.id}
              showsHorizontalScrollIndicator={false}
              style={{ flexGrow: 0, marginBottom: spacing.sm }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.chip, pickedTeacherId === item.id && s.chipActive]}
                  onPress={() => setPickedTeacherId(item.id)}
                >
                  <Text style={[s.chipText, pickedTeacherId === item.id && s.chipTextActive]}>{item.name}</Text>
                </TouchableOpacity>
              )}
            />

            <Text style={s.fieldLabel}>Date</Text>
            <TextInput
              style={s.input}
              value={absentDate}
              onChangeText={setAbsentDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.textFaint}
            />

            {pickedTeacherId && (
              <>
                <Text style={s.fieldLabel}>Periods to cover</Text>
                {loadingSlots ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.md }} />
                ) : teacherSlots.length === 0 ? (
                  <Text style={s.emptyText}>No classes scheduled for this teacher on that date</Text>
                ) : (
                  <FlatList
                    data={teacherSlots}
                    keyExtractor={(item) => item.id}
                    style={{ maxHeight: 180 }}
                    renderItem={({ item }) => {
                      const selected = selectedSlotIds.includes(item.id)
                      return (
                        <TouchableOpacity style={[s.pickerRow, selected && s.pickerRowActive]} onPress={() => toggleSlot(item.id)}>
                          <Ionicons name={selected ? "checkbox" : "square-outline"} size={20} color={selected ? colors.primary : colors.textFaint} />
                          <Text style={s.pickerRowText}>
                            {item.period.startTime} - {item.subject.name} ({item.class.name} {item.class.section})
                          </Text>
                        </TouchableOpacity>
                      )
                    }}
                  />
                )}
              </>
            )}

            <TouchableOpacity
              style={[s.submitBtn, submittingAbsent && s.submitBtnDisabled]}
              onPress={submitMarkAbsent}
              disabled={submittingAbsent}
            >
              {submittingAbsent
                ? <ActivityIndicator size="small" color={colors.textPrimary} />
                : <Text style={s.submitBtnText}>Mark Absent</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Assign Substitute modal */}
      <Modal visible={!!assignTarget} animationType="slide" transparent onRequestClose={() => setAssignTarget(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Find a Substitute</Text>
              <TouchableOpacity onPress={() => setAssignTarget(null)}>
                <Text style={s.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {assignTarget && (
              <View style={s.targetCard}>
                <Text style={s.targetSubject}>{assignTarget.timetableSlot.subject.name}</Text>
                <Text style={s.meta}>
                  {assignTarget.date.split("T")[0]} - {assignTarget.timetableSlot.period.startTime} to {assignTarget.timetableSlot.period.endTime}
                </Text>
              </View>
            )}

            {loadingAvailable ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: spacing.lg }} />
            ) : availableTeachers.length === 0 ? (
              <Text style={s.emptyText}>No teachers are free for this period</Text>
            ) : (
              <FlatList
                data={availableTeachers}
                keyExtractor={(t) => t.id}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={s.pickerRow}
                    onPress={() => submitAssign(item.id)}
                    disabled={assigningId === item.id}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={s.pickerRowText}>{item.name}</Text>
                      <Text style={s.pickerRowSub}>{item.periodCount} periods this week</Text>
                    </View>
                    {assigningId === item.id && <ActivityIndicator size="small" color={colors.primary} />}
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
  list: { padding: spacing.xl, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: 2 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subject: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  badge: { borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  badgeText: { color: colors.textPrimary, fontSize: 10, fontWeight: "700" },
  meta: { ...typography.caption },
  tapHint: { color: colors.primary, fontSize: 12, fontWeight: "600", marginTop: spacing.xs },
  respondRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  respondBtn: { flex: 1, borderRadius: radius.sm, paddingVertical: spacing.sm, alignItems: "center" },
  acceptBtn: { backgroundColor: colors.success },
  declineBtn: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  acceptText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  declineText: { color: colors.textMuted, fontWeight: "700", fontSize: 13 },
  emptyText: { color: colors.textFaint, fontSize: 13, textAlign: "center", paddingVertical: spacing.md },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  modalTitle: { ...typography.title },
  modalClose: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginRight: spacing.xs },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: colors.textPrimary },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14 },
  pickerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm },
  pickerRowActive: { opacity: 1 },
  pickerRowText: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  pickerRowSub: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  targetCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  targetSubject: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.lg },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
})