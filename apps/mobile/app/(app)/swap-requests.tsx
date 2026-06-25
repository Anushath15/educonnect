import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
  ScrollView, RefreshControl, Alert,
} from "react-native"
import { router } from "expo-router"
import { api } from "../../src/api/client"
import { useAuthStore } from "../../src/stores/authStore"

interface SlotInfo {
  id: string
  dayOfWeek: string
  class: { name: string; section: string }
  subject: { name: string; code: string; colorHex: string }
  period: { periodNumber: number; label: string | null; startTime: string; endTime: string }
}

interface SwapRequestItem {
  id: string
  requesterId: string
  receiverId: string
  status: "PENDING" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "CANCELLED"
  message: string | null
  declineReason: string | null
  expiresAt: string
  createdAt: string
  requester: { name: string; role: string }
  receiver: { name: string; role: string }
  requesterSlot: SlotInfo | null
  receiverSlot: SlotInfo | null
}

type ViewMode = "received" | "sent" | "all"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#F59E0B",
  ACCEPTED: "#10B981",
  DECLINED: "#EF4444",
  EXPIRED: "#64748B",
  CANCELLED: "#64748B",
}

const DAY_LABELS: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
}

const VIEWS: { label: string; value: ViewMode }[] = [
  { label: "Received", value: "received" },
  { label: "Sent", value: "sent" },
  { label: "All", value: "all" },
]

function formatSlot(slot: SlotInfo | null) {
  if (!slot) return "Slot no longer available"
  const day = DAY_LABELS[slot.dayOfWeek] ?? slot.dayOfWeek
  const periodLabel = slot.period.label ?? `Period ${slot.period.periodNumber}`
  return `${day} • ${periodLabel} • ${slot.subject.code} • ${slot.class.name}-${slot.class.section}`
}

export default function SwapRequestsScreen() {
  const { user } = useAuthStore()
  const [swaps, setSwaps] = useState<SwapRequestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>("received")
  const [actingOnId, setActingOnId] = useState<string | null>(null)

  const fetchSwaps = useCallback((mode: ViewMode, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    api.get(`/v1/swaps?view=${mode}`)
      .then((res) => setSwaps(res.data.data))
      .catch(() => setError("Failed to load swap requests. Check your connection."))
      .finally(() => {
        setLoading(false)
        setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    fetchSwaps(view)
  }, [view, fetchSwaps])

  const respond = (id: string, action: "accept" | "decline") => {
    const doRespond = () => {
      setActingOnId(id)
      api.post(`/v1/swaps/${id}/respond`, { action })
        .then(() => fetchSwaps(view))
        .catch((err) => {
          const message = err?.response?.data?.error?.message ?? "Could not respond to this request."
          Alert.alert("Error", message)
        })
        .finally(() => setActingOnId(null))
    }

    if (action === "decline") {
      Alert.alert("Decline swap?", "The requester will be notified.", [
        { text: "Cancel", style: "cancel" },
        { text: "Decline", style: "destructive", onPress: doRespond },
      ])
    } else {
      Alert.alert("Accept swap?", "Both timetable slots will be swapped immediately.", [
        { text: "Cancel", style: "cancel" },
        { text: "Accept", onPress: doRespond },
      ])
    }
  }

  const cancel = (id: string) => {
    Alert.alert("Cancel request?", "This will withdraw your swap request.", [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel request",
        style: "destructive",
        onPress: () => {
          setActingOnId(id)
          api.delete(`/v1/swaps/${id}`)
            .then(() => fetchSwaps(view))
            .catch(() => Alert.alert("Error", "Could not cancel this request."))
            .finally(() => setActingOnId(null))
        },
      },
    ])
  }

  if (loading) return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color="#6366F1" />
      <Text style={styles.loadingText}>Loading swap requests...</Text>
    </View>
  )

  if (error) return (
    <View style={styles.center}>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity style={styles.retryBtn} onPress={() => fetchSwaps(view)}>
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
          <Text style={styles.title}>Swap Requests</Text>
          <Text style={styles.count}>{swaps.length} {view}</Text>
        </View>
        <View style={{ width: 48 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {VIEWS.map((v) => (
          <TouchableOpacity
            key={v.value}
            style={[styles.filterChip, view === v.value && styles.filterChipActive]}
            onPress={() => setView(v.value)}
          >
            <Text style={[styles.filterText, view === v.value && styles.filterTextActive]}>
              {v.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {swaps.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No swap requests</Text>
          <Text style={styles.emptySubText}>
            {view === "received" ? "Requests sent to you will appear here" : "Requests you've sent will appear here"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={swaps}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchSwaps(view, true)} tintColor="#6366F1" />
          }
          renderItem={({ item }) => {
            const isReceiver = item.receiverId === user?.id
            const isRequester = item.requesterId === user?.id
            const otherPerson = isReceiver ? item.requester : item.receiver
            const busy = actingOnId === item.id

            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <Text style={styles.personName}>{otherPerson.name}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] ?? "#64748B") + "33" }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] ?? "#64748B" }]}>
                      {item.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.slotRow}>
                  <Text style={styles.slotLabel}>Their slot</Text>
                  <Text style={styles.slotValue}>{formatSlot(isReceiver ? item.requesterSlot : item.receiverSlot)}</Text>
                </View>
                <View style={styles.slotRow}>
                  <Text style={styles.slotLabel}>Your slot</Text>
                  <Text style={styles.slotValue}>{formatSlot(isReceiver ? item.receiverSlot : item.requesterSlot)}</Text>
                </View>

                {item.message && (
                  <Text style={styles.message}>&ldquo;{item.message}&rdquo;</Text>
                )}
                {item.status === "DECLINED" && item.declineReason && (
                  <Text style={styles.declineReason}>Declined: {item.declineReason}</Text>
                )}

                {item.status === "PENDING" && isReceiver && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.declineBtn]}
                      disabled={busy}
                      onPress={() => respond(item.id, "decline")}
                    >
                      {busy ? <ActivityIndicator size="small" color="#EF4444" /> : <Text style={styles.declineBtnText}>Decline</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.acceptBtn]}
                      disabled={busy}
                      onPress={() => respond(item.id, "accept")}
                    >
                      {busy ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.acceptBtnText}>Accept</Text>}
                    </TouchableOpacity>
                  </View>
                )}

                {item.status === "PENDING" && isRequester && (
                  <View style={styles.actions}>
                    <TouchableOpacity
                      style={[styles.actionBtn, styles.cancelBtn]}
                      disabled={busy}
                      onPress={() => cancel(item.id)}
                    >
                      {busy ? <ActivityIndicator size="small" color="#94A3B8" /> : <Text style={styles.cancelBtnText}>Cancel Request</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          }}
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
  count: { fontSize: 12, color: "#64748B", marginTop: 2, textTransform: "capitalize" },
  filterRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: "#1E293B", borderWidth: 1, borderColor: "#334155" },
  filterChipActive: { backgroundColor: "#6366F1", borderColor: "#6366F1" },
  filterText: { fontSize: 13, color: "#94A3B8", fontWeight: "500" },
  filterTextActive: { color: "#FFFFFF" },
  list: { padding: 16, gap: 12 },
  card: { backgroundColor: "#1E293B", borderRadius: 14, padding: 16, gap: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  personName: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: "700" },
  slotRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  slotLabel: { fontSize: 12, color: "#64748B", width: 70 },
  slotValue: { fontSize: 12, color: "#CBD5E1", flex: 1, textAlign: "right" },
  message: { fontSize: 13, color: "#94A3B8", fontStyle: "italic", marginTop: 2 },
  declineReason: { fontSize: 12, color: "#F87171", marginTop: 2 },
  actions: { flexDirection: "row", gap: 8, marginTop: 4 },
  actionBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  acceptBtn: { backgroundColor: "#6366F1" },
  acceptBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  declineBtn: { backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#EF4444" },
  declineBtnText: { color: "#EF4444", fontSize: 13, fontWeight: "700" },
  cancelBtn: { backgroundColor: "#0F172A", borderWidth: 1, borderColor: "#334155" },
  cancelBtnText: { color: "#94A3B8", fontSize: 13, fontWeight: "700" },
  loadingText: { color: "#64748B", fontSize: 14, marginTop: 8 },
  errorText: { color: "#F87171", fontSize: 15, textAlign: "center", paddingHorizontal: 40 },
  retryBtn: { backgroundColor: "#6366F1", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  retryText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
  emptyText: { color: "#FFFFFF", fontSize: 18, fontWeight: "600" },
  emptySubText: { color: "#64748B", fontSize: 14, textAlign: "center", paddingHorizontal: 40 },
})