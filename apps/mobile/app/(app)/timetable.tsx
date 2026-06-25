import React, { useCallback, useEffect, useMemo, useState } from "react"
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, Modal, TextInput, FlatList,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { api } from "../../src/api/client"
import { useAuthStore } from "../../src/stores/authStore"
import { ScreenHeader } from "../../src/components/ScreenHeader"
import { LoadingView, ErrorView, EmptyView } from "../../src/components/StatusView"
import { colors, spacing, radius, typography } from "../../src/theme"
import { DAY_LABELS, WORKING_DAYS, SWAP_REQUEST_ROLES } from "@educonnect/shared"
import type { TimetableSlotExpanded, DayOfWeek } from "@educonnect/shared"

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function toISODate(d: Date): string {
  return d.toISOString().split("T")[0]
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d)
  copy.setDate(copy.getDate() + n)
  return copy
}

function formatWeekLabel(monday: Date): string {
  const sat = addDays(monday, 5)
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" }
  return `${monday.toLocaleDateString("en-IN", opts)} - ${sat.toLocaleDateString("en-IN", opts)}`
}

// Maps JS Date.getDay() (0=Sun..6=Sat) onto WORKING_DAYS (["MON"..."SAT"], no Sunday).
// Sunday falls back to Monday since there's no Sunday tab to select.
function todayAsWorkingDay(): DayOfWeek {
  const jsDay = new Date().getDay()
  const idx = jsDay === 0 ? 0 : jsDay - 1
  return WORKING_DAYS[idx]
}

export default function TimetableScreen() {
  const { user } = useAuthStore()
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))
  const [activeDay, setActiveDay] = useState<DayOfWeek>(() => todayAsWorkingDay())

  const [slots, setSlots] = useState<TimetableSlotExpanded[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const canRequestSwap = SWAP_REQUEST_ROLES.includes((user?.role ?? "") as any)
  const [swapTarget, setSwapTarget] = useState<TimetableSlotExpanded | null>(null)
  const [chosenMySlotId, setChosenMySlotId] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const loadWeek = useCallback(() => {
    setLoading(true)
    setError(null)
    api.get("/v1/timetable", { params: { weekStartDate: toISODate(weekStart) } })
      .then((res) => setSlots(res.data.data))
      .catch((err) => setError(err?.response?.status === 403 ? "You do not have permission to view the timetable." : "Failed to load timetable. Check your connection."))
      .finally(() => setLoading(false))
  }, [weekStart])

  useEffect(() => { loadWeek() }, [loadWeek])

  const daySlots = useMemo(
    () => slots
      .filter((s) => s.dayOfWeek === activeDay)
      .sort((a, b) => a.period.periodNumber - b.period.periodNumber),
    [slots, activeDay]
  )

  const mySlotsThisWeek = useMemo(
    () => slots.filter((s) => s.teacher.id === user?.id),
    [slots, user?.id]
  )

  const goToWeek = (delta: number) => setWeekStart((prev) => addDays(prev, delta * 7))

  const openSwapModal = (slot: TimetableSlotExpanded) => {
    if (slot.teacher.id === user?.id) return
    if (!canRequestSwap) { Alert.alert("Not available", "Your role cannot request class swaps."); return }
    if (mySlotsThisWeek.length === 0) {
      Alert.alert("No classes to offer", "You have no classes scheduled this week to offer in a swap.")
      return
    }
    setSwapTarget(slot)
    setChosenMySlotId(null)
    setMessage("")
  }

  const submitSwap = () => {
    if (!swapTarget || !chosenMySlotId) {
      Alert.alert("Pick a class", "Choose which of your classes you want to offer.")
      return
    }
    setSubmitting(true)
    api.post("/v1/swaps", {
      requesterSlotId: chosenMySlotId,
      receiverSlotId: swapTarget.id,
      message: message.trim() || undefined,
    })
      .then(() => {
        setSwapTarget(null)
        Alert.alert("Request sent", "Your swap request has been sent. Track it from Swap Requests.")
      })
      .catch((err) => {
        const msg = err?.response?.data?.error?.message ?? "Could not send swap request."
        Alert.alert("Error", msg)
      })
      .finally(() => setSubmitting(false))
  }

  return (
    <View style={s.container}>
      <ScreenHeader title="Timetable" subtitle={formatWeekLabel(weekStart)} showBack={false} />

      <View style={s.weekNav}>
        <TouchableOpacity onPress={() => goToWeek(-1)} style={s.weekNavBtn}>
          <Ionicons name="chevron-back" size={18} color={colors.primary} />
          <Text style={s.weekNavText}>Prev</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setWeekStart(getMonday(new Date()))}>
          <Text style={s.thisWeekLink}>This week</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => goToWeek(1)} style={s.weekNavBtn}>
          <Text style={s.weekNavText}>Next</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={s.dayTabs}>
        {WORKING_DAYS.map((day) => (
          <TouchableOpacity
            key={day}
            style={[s.dayTab, activeDay === day && s.dayTabActive]}
            onPress={() => setActiveDay(day)}
          >
            <Text style={[s.dayTabText, activeDay === day && s.dayTabTextActive]}>
              {DAY_LABELS[day]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingView label="Loading timetable..." />
      ) : error ? (
        <ErrorView message={error} onRetry={loadWeek} />
      ) : daySlots.length === 0 ? (
        <EmptyView title={`No classes for ${DAY_LABELS[activeDay]}`} icon="calendar-outline" />
      ) : (
        <ScrollView contentContainerStyle={s.scroll}>
          {daySlots.map((slot) => {
            const isMine = slot.teacher.id === user?.id
            return (
              <TouchableOpacity
                key={slot.id}
                style={[s.slotCard, isMine && s.slotCardMine]}
                onPress={() => openSwapModal(slot)}
                activeOpacity={isMine ? 1 : 0.7}
              >
                <View style={[s.subjectDot, { backgroundColor: slot.subject.colorHex }]} />
                <View style={{ flex: 1 }}>
                  <Text style={s.slotTime}>
                    {slot.period.startTime} - {slot.period.endTime}
                  </Text>
                  <Text style={s.slotSubject}>{slot.subject.name}</Text>
                  <Text style={s.slotMeta}>
                    {slot.class.name} {slot.class.section}
                    {slot.room ? ` - Room ${slot.room}` : ""}
                  </Text>
                  <Text style={[s.slotTeacher, isMine && s.slotTeacherMine]}>
                    {isMine ? "Your class" : slot.teacher.name}
                  </Text>
                </View>
                {!isMine && canRequestSwap && (
                  <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
                )}
              </TouchableOpacity>
            )
          })}
        </ScrollView>
      )}

      <Modal visible={!!swapTarget} animationType="slide" transparent onRequestClose={() => setSwapTarget(null)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Request Swap</Text>
              <TouchableOpacity onPress={() => setSwapTarget(null)}>
                <Text style={s.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            {swapTarget && (
              <View style={s.targetCard}>
                <Text style={s.targetLabel}>You want:</Text>
                <Text style={s.targetSubject}>{swapTarget.subject.name}</Text>
                <Text style={s.targetMeta}>
                  {DAY_LABELS[swapTarget.dayOfWeek]}, {swapTarget.period.startTime} -{" "}
                  {swapTarget.period.endTime} - {swapTarget.teacher.name}
                </Text>
              </View>
            )}

            <Text style={s.fieldLabel}>Offer one of your classes in return:</Text>
            <FlatList
              data={mySlotsThisWeek}
              keyExtractor={(item) => item.id}
              style={{ maxHeight: 200 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.pickerRow, chosenMySlotId === item.id && s.pickerRowActive]}
                  onPress={() => setChosenMySlotId(item.id)}
                >
                  <View style={[s.subjectDot, { backgroundColor: item.subject.colorHex }]} />
                  <Text style={s.pickerRowText}>
                    {item.subject.name} - {DAY_LABELS[item.dayOfWeek]} {item.period.startTime}
                  </Text>
                  {chosenMySlotId === item.id && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />

            <Text style={s.fieldLabel}>Message (optional)</Text>
            <TextInput
              style={s.input}
              value={message}
              onChangeText={setMessage}
              placeholder="Add a note for the other teacher"
              placeholderTextColor={colors.textFaint}
              multiline
            />

            <TouchableOpacity
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
              onPress={submitSwap}
              disabled={submitting}
            >
              {submitting
                ? <ActivityIndicator size="small" color={colors.textPrimary} />
                : <Text style={s.submitBtnText}>Send Request</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.xl, gap: spacing.sm },
  weekNav: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md, backgroundColor: colors.surface,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  weekNavBtn: { flexDirection: "row", alignItems: "center", gap: 2 },
  weekNavText: { color: colors.primary, fontSize: 13, fontWeight: "600" },
  thisWeekLink: { color: colors.textMuted, fontSize: 12, fontWeight: "600" },
  dayTabs: {
    flexDirection: "row", paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.surface, gap: spacing.xs,
  },
  dayTab: {
    flex: 1, paddingVertical: spacing.sm, borderRadius: radius.md,
    alignItems: "center", backgroundColor: colors.surfaceAlt,
  },
  dayTabActive: { backgroundColor: colors.primary },
  dayTabText: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
  dayTabTextActive: { color: colors.textPrimary },
  slotCard: {
    flexDirection: "row", alignItems: "center", gap: spacing.md,
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md,
    borderLeftWidth: 3, borderLeftColor: "transparent",
  },
  slotCardMine: { borderLeftColor: colors.primary },
  subjectDot: { width: 10, height: 10, borderRadius: 5 },
  slotTime: { ...typography.caption },
  slotSubject: { ...typography.body, fontWeight: "600", color: colors.textPrimary, marginTop: 2 },
  slotMeta: { ...typography.caption, marginTop: 2 },
  slotTeacher: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  slotTeacherMine: { color: colors.primary, fontWeight: "600" },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: {
    backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    padding: spacing.xl, maxHeight: "80%",
  },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  modalTitle: { ...typography.title },
  modalClose: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  targetCard: { backgroundColor: colors.surfaceAlt, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  targetLabel: { ...typography.caption },
  targetSubject: { ...typography.body, fontWeight: "700", color: colors.textPrimary, marginTop: 2 },
  targetMeta: { ...typography.caption, marginTop: 2 },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },
  pickerRow: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm, borderRadius: radius.sm,
  },
  pickerRowActive: { backgroundColor: colors.primaryMuted },
  pickerRowText: { flex: 1, color: colors.textPrimary, fontSize: 13 },
  input: {
    backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border,
    color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: 14, minHeight: 60, textAlignVertical: "top",
  },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.lg },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
})