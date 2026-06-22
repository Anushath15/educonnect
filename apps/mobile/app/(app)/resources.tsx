import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, ActivityIndicator, RefreshControl, ScrollView,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { api } from "../../src/api/client"
import { useAuthStore } from "../../src/stores/authStore"
import { useToast } from "../../src/components/Toast"
import { ScreenHeader } from "../../src/components/ScreenHeader"
import { LoadingView, ErrorView, EmptyView } from "../../src/components/StatusView"
import { colors, spacing, radius, typography } from "../../src/theme"
import { WORKING_DAYS, DAY_LABELS } from "@educonnect/shared"

type Resource = { id: string; name: string; type: string; capacity: number | null }
type Period = { id: string; periodNumber: number; startTime: string; endTime: string; label: string | null }
type Booking = {
  id: string; dayOfWeek: string; purpose: string | null
  resource: { id: string; name: string; type: string }
  period: { periodNumber: number; startTime: string; endTime: string }
  bookedBy: { id: string; name: string }
}

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  date.setDate(date.getDate() - day + (day === 0 ? -6 : 1))
  date.setHours(0, 0, 0, 0)
  return date
}

function toISODate(d: Date): string { return d.toISOString().split("T")[0] }

export default function ResourcesScreen() {
  const { user } = useAuthStore()
  const showToast = useToast()

  const [weekStart] = useState(() => getMonday(new Date()))
  const [resources, setResources] = useState<Resource[]>([])
  const [periods, setPeriods] = useState<Period[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [bookingModal, setBookingModal] = useState(false)
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null)
  const [selectedDay, setSelectedDay] = useState<typeof WORKING_DAYS[number]>(WORKING_DAYS[0])
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)

  const fetchAll = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    Promise.all([
      api.get("/v1/resources"),
      api.get("/v1/resource-bookings", { params: { weekStartDate: toISODate(weekStart) } }),
      api.get("/v1/periods"),
    ])
      .then(([r, b, p]) => {
        setResources(r.data.data)
        setBookings(b.data.data)
        setPeriods(p.data.data.filter((pd: any) => !pd.isBreak))
      })
      .catch(() => setError("Failed to load resources. Check your connection."))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [weekStart])

  useEffect(() => { fetchAll() }, [fetchAll])

  const openBooking = (resource: Resource) => {
    setSelectedResource(resource)
    setSelectedDay(WORKING_DAYS[0])
    setSelectedPeriodId(null)
    setBookingModal(true)
  }

  const isBooked = (resourceId: string, periodId: string, day: string) =>
    bookings.some(b => b.resource.id === resourceId && b.period.periodNumber === periods.find(p => p.id === periodId)?.periodNumber && b.dayOfWeek === day)

  const submitBooking = () => {
    if (!selectedResource || !selectedPeriodId) {
      showToast("Select a period first.", "error")
      return
    }
    setSubmitting(true)
    api.post("/v1/resource-bookings", {
      resourceId: selectedResource.id,
      periodId: selectedPeriodId,
      dayOfWeek: selectedDay,
      weekStartDate: toISODate(weekStart),
    })
      .then(() => {
        setBookingModal(false)
        showToast(`${selectedResource.name} booked`)
        fetchAll()
      })
      .catch((err) => showToast(err?.response?.data?.error?.message ?? "Could not book.", "error"))
      .finally(() => setSubmitting(false))
  }

  const cancelBooking = (bookingId: string) => {
    setCancellingId(bookingId)
    api.delete(`/v1/resource-bookings/${bookingId}`)
      .then(() => { showToast("Booking cancelled"); fetchAll() })
      .catch(() => showToast("Could not cancel.", "error"))
      .finally(() => setCancellingId(null))
  }

  if (loading) return <LoadingView label="Loading resources..." />
  if (error) return <ErrorView message={error} onRetry={() => fetchAll()} />

  const myBookings = bookings.filter(b => b.bookedBy.id === user?.id)

  return (
    <View style={s.container}>
      <ScreenHeader title="Resources" showBack={false} />
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchAll(true)} tintColor={colors.primary} />}
        contentContainerStyle={s.scroll}
      >
        <Text style={s.sectionTitle}>Available This Week</Text>
        {resources.length === 0 ? (
          <EmptyView icon="cube-outline" title="No resources set up yet" />
        ) : (
          resources.map((r) => (
            <TouchableOpacity key={r.id} style={s.resourceCard} onPress={() => openBooking(r)}>
              <View style={s.resourceIcon}>
                <Ionicons
                  name={r.type === "lab" ? "flask-outline" : r.type === "equipment" ? "construct-outline" : "business-outline"}
                  size={22} color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.resourceName}>{r.name}</Text>
                <Text style={s.resourceMeta}>
                  {r.type}{r.capacity ? ` · Capacity ${r.capacity}` : ""}
                </Text>
              </View>
              <Text style={s.bookBtn}>Book</Text>
            </TouchableOpacity>
          ))
        )}

        {myBookings.length > 0 && (
          <>
            <Text style={[s.sectionTitle, { marginTop: spacing.xl }]}>Your Bookings This Week</Text>
            {myBookings.map((b) => (
              <View key={b.id} style={s.bookingCard}>
                <View style={{ flex: 1 }}>
                  <Text style={s.bookingResource}>{b.resource.name}</Text>
                  <Text style={s.bookingMeta}>
                    {DAY_LABELS[b.dayOfWeek]} · {b.period.startTime} - {b.period.endTime}
                  </Text>
                  {b.purpose && <Text style={s.bookingPurpose}>{b.purpose}</Text>}
                </View>
                <TouchableOpacity
                  onPress={() => cancelBooking(b.id)}
                  disabled={cancellingId === b.id}
                  hitSlop={12}
                >
                  {cancellingId === b.id
                    ? <ActivityIndicator size="small" color={colors.danger} />
                    : <Ionicons name="close-circle-outline" size={22} color={colors.danger} />
                  }
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <Modal visible={bookingModal} animationType="slide" transparent onRequestClose={() => setBookingModal(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{selectedResource?.name}</Text>
              <TouchableOpacity onPress={() => setBookingModal(false)}>
                <Text style={s.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Day</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
              <View style={s.dayRow}>
                {WORKING_DAYS.map((day) => (
                  <TouchableOpacity
                    key={day}
                    style={[s.dayChip, selectedDay === day && s.dayChipActive]}
                    onPress={() => { setSelectedDay(day); setSelectedPeriodId(null) }}
                  >
                    <Text style={[s.dayChipText, selectedDay === day && s.dayChipTextActive]}>
                      {DAY_LABELS[day]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={s.fieldLabel}>Period</Text>
            <FlatList
              data={periods}
              keyExtractor={(p) => p.id}
              style={{ maxHeight: 220 }}
              renderItem={({ item }) => {
                const booked = selectedResource ? isBooked(selectedResource.id, item.id, selectedDay) : false
                const mine = bookings.find(b => b.resource.id === selectedResource?.id && b.period.periodNumber === item.periodNumber && b.dayOfWeek === selectedDay)?.bookedBy.id === user?.id
                return (
                  <TouchableOpacity
                    style={[s.periodRow, selectedPeriodId === item.id && s.periodRowActive, booked && s.periodRowBooked]}
                    onPress={() => !booked && setSelectedPeriodId(item.id)}
                    disabled={booked}
                  >
                    <Text style={[s.periodText, booked && s.periodTextBooked]}>
                      {item.label ?? `Period ${item.periodNumber}`}  {item.startTime} - {item.endTime}
                    </Text>
                    {booked && <Text style={s.bookedLabel}>{mine ? "Your booking" : "Booked"}</Text>}
                    {selectedPeriodId === item.id && !booked && (
                      <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                )
              }}
            />

            <TouchableOpacity
              style={[s.submitBtn, submitting && s.submitBtnDisabled]}
              onPress={submitBooking}
              disabled={submitting || !selectedPeriodId}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Text style={s.submitBtnText}>Confirm Booking</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: spacing.lg, paddingBottom: 40 },
  sectionTitle: { ...typography.caption, color: colors.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.sm },
  resourceCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.sm },
  resourceIcon: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: colors.primaryMuted, justifyContent: "center", alignItems: "center" },
  resourceName: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  resourceMeta: { ...typography.caption, marginTop: 2, textTransform: "capitalize" },
  bookBtn: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  bookingCard: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  bookingResource: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  bookingMeta: { ...typography.caption, marginTop: 2 },
  bookingPurpose: { fontSize: 12, color: colors.textFaint, marginTop: 2, fontStyle: "italic" },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: "80%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  modalTitle: { ...typography.title },
  modalClose: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },
  dayRow: { flexDirection: "row", gap: spacing.xs, paddingBottom: spacing.xs },
  dayChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  dayChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  dayChipText: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  dayChipTextActive: { color: "#fff" },
  periodRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radius.sm, marginBottom: 4 },
  periodRowActive: { backgroundColor: colors.primaryMuted },
  periodRowBooked: { opacity: 0.4 },
  periodText: { fontSize: 13, color: colors.textPrimary },
  periodTextBooked: { color: colors.textFaint },
  bookedLabel: { fontSize: 11, color: colors.textFaint, fontStyle: "italic" },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.lg },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
})