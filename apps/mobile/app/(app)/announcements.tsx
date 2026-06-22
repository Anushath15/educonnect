import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, ActivityIndicator, RefreshControl,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { api } from "../../src/api/client"
import { useAuthStore } from "../../src/stores/authStore"
import { useToast } from "../../src/components/Toast"
import { ScreenHeader } from "../../src/components/ScreenHeader"
import { LoadingView, ErrorView, EmptyView } from "../../src/components/StatusView"
import { colors, spacing, radius, typography } from "../../src/theme"
import { ANNOUNCEMENT_CREATE_ROLES, ROLE_LABELS } from "@educonnect/shared"

type Announcement = {
  id: string
  title: string
  body: string
  targetRole: string | null
  createdAt: string
  author: { id: string; name: string; role: string }
}

const ROLE_OPTIONS = [
  { label: "Everyone", value: null },
  { label: "Principal", value: "PRINCIPAL" },
  { label: "Vice Principal", value: "VICE_PRINCIPAL" },
  { label: "Coordinator", value: "COORDINATOR" },
  { label: "Class Teacher", value: "CLASS_TEACHER" },
  { label: "Subject Teacher", value: "SUBJECT_TEACHER" },
  { label: "Office Staff", value: "OFFICE_STAFF" },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function AnnouncementsScreen() {
  const { user } = useAuthStore()
  const showToast = useToast()
  const canCreate = ANNOUNCEMENT_CREATE_ROLES.includes((user?.role ?? "") as any)
  const canDelete = (item: Announcement) =>
    item.author.id === user?.id || user?.role === "PRINCIPAL" || user?.role === "VICE_PRINCIPAL"

  const [items, setItems] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targetRole, setTargetRole] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchItems = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    api.get("/v1/announcements", { params: { limit: 50 } })
      .then((res) => setItems(res.data.data))
      .catch(() => setError("Failed to load announcements. Check your connection."))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const openCreate = () => {
    setTitle(""); setBody(""); setTargetRole(null)
    setModalOpen(true)
  }

  const submitCreate = () => {
    if (!title.trim() || !body.trim()) {
      showToast("Title and message are required.", "error")
      return
    }
    setSaving(true)
    api.post("/v1/announcements", {
      title: title.trim(),
      body: body.trim(),
      targetRole: targetRole ?? undefined,
    })
      .then(() => {
        setModalOpen(false)
        showToast("Announcement posted")
        fetchItems()
      })
      .catch((err) => showToast(err?.response?.data?.error?.message ?? "Could not post.", "error"))
      .finally(() => setSaving(false))
  }

  const deleteItem = (id: string) => {
    setDeletingId(id)
    api.delete(`/v1/announcements/${id}`)
      .then(() => { showToast("Deleted"); fetchItems() })
      .catch(() => showToast("Could not delete.", "error"))
      .finally(() => setDeletingId(null))
  }

  if (loading) return <LoadingView label="Loading announcements..." />
  if (error) return <ErrorView message={error} onRetry={() => fetchItems()} />

  return (
    <View style={s.container}>
      <ScreenHeader
        title="Announcements"
        showBack={false}
        rightAction={canCreate ? { icon: "add", onPress: openCreate } : undefined}
      />

      {items.length === 0 ? (
        <EmptyView
          icon="megaphone-outline"
          title="No announcements yet"
          subtitle={canCreate ? "Tap + to post one" : undefined}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => fetchItems(true)} tintColor={colors.primary} />
          }
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.cardTitle}>{item.title}</Text>
                  <Text style={s.cardMeta}>
                    {item.author.name} · {timeAgo(item.createdAt)}
                    {item.targetRole ? ` · ${ROLE_LABELS[item.targetRole] ?? item.targetRole} only` : ""}
                  </Text>
                </View>
                {canDelete(item) && (
                  <TouchableOpacity
                    onPress={() => deleteItem(item.id)}
                    disabled={deletingId === item.id}
                    hitSlop={12}
                  >
                    {deletingId === item.id
                      ? <ActivityIndicator size="small" color={colors.danger} />
                      : <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    }
                  </TouchableOpacity>
                )}
              </View>
              <Text style={s.cardBody}>{item.body}</Text>
              {item.targetRole && (
                <View style={s.targetBadge}>
                  <Text style={s.targetBadgeText}>{ROLE_LABELS[item.targetRole] ?? item.targetRole} only</Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>New Announcement</Text>
            <TextInput
              style={s.input} placeholder="Title" placeholderTextColor={colors.textFaint}
              value={title} onChangeText={setTitle}
            />
            <TextInput
              style={[s.input, s.inputMulti]} placeholder="Message" placeholderTextColor={colors.textFaint}
              value={body} onChangeText={setBody} multiline numberOfLines={4} textAlignVertical="top"
            />
            <Text style={s.fieldLabel}>Visible to</Text>
            <View style={s.roleGrid}>
              {ROLE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={String(opt.value)}
                  style={[s.roleChip, targetRole === opt.value && s.roleChipActive]}
                  onPress={() => setTargetRole(opt.value)}
                >
                  <Text style={[s.roleChipText, targetRole === opt.value && s.roleChipTextActive]}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={s.modalActions}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setModalOpen(false)} disabled={saving}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.saveBtn} onPress={submitCreate} disabled={saving}>
                {saving
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.saveBtnText}>Post</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.sm },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  cardTitle: { ...typography.body, fontWeight: "700", color: colors.textPrimary },
  cardMeta: { ...typography.caption, marginTop: 2 },
  cardBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  targetBadge: { alignSelf: "flex-start", backgroundColor: colors.primaryMuted, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 3 },
  targetBadgeText: { fontSize: 11, color: colors.primary, fontWeight: "700" },
  modalOverlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xxl, gap: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  input: { backgroundColor: colors.bg, borderRadius: radius.md, padding: spacing.md, color: colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: colors.border },
  inputMulti: { minHeight: 100, textAlignVertical: "top" },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.xs },
  roleGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  roleChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.bg, borderWidth: 1, borderColor: colors.border },
  roleChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleChipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  roleChipTextActive: { color: "#fff" },
  modalActions: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  cancelBtn: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textMuted, fontWeight: "600" },
  saveBtn: { flex: 1, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", backgroundColor: colors.primary },
  saveBtnText: { color: "#fff", fontWeight: "700" },
})