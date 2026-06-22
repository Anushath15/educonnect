import React, { useCallback, useEffect, useState } from "react"
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, TextInput, RefreshControl, Alert,
} from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { api } from "../../src/api/client"
import { useAuthStore } from "../../src/stores/authStore"
import { useToast } from "../../src/components/Toast"
import { ScreenHeader } from "../../src/components/ScreenHeader"
import { LoadingView, ErrorView, EmptyView } from "../../src/components/StatusView"
import { colors, spacing, radius, typography } from "../../src/theme"
import { ANNOUNCEMENT_CREATE_ROLES, ROLE_LABELS } from "@educonnect/shared"
import type { AnnouncementExpanded, UserRole } from "@educonnect/shared"

const ALL_ROLES: UserRole[] = [
  "PRINCIPAL", "VICE_PRINCIPAL", "COORDINATOR", "ADMINISTRATOR",
  "CLASS_TEACHER", "SUBJECT_TEACHER", "TEMP_TEACHER", "INTERN", "OFFICE_STAFF",
]

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
}

export default function AnnouncementsScreen() {
  const { user } = useAuthStore()
  const showToast = useToast()
  const canCreate = ANNOUNCEMENT_CREATE_ROLES.includes((user?.role ?? "") as any)

  const [items, setItems] = useState<AnnouncementExpanded[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [editorOpen, setEditorOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [targetRole, setTargetRole] = useState<UserRole | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchList = useCallback((isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    api.get("/v1/announcements", { params: { page: 1, limit: 50 } })
      .then((res) => setItems(res.data.data))
      .catch((err) => setError(
        err?.response?.status === 403
          ? "You do not have permission to view announcements."
          : "Failed to load announcements. Check your connection."
      ))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }, [])

  useEffect(() => { fetchList() }, [fetchList])

  const canModify = (item: AnnouncementExpanded) =>
    item.authorId === user?.id || user?.role === "PRINCIPAL" || user?.role === "VICE_PRINCIPAL"

  const openCreate = () => {
    setEditingId(null)
    setTitle("")
    setBody("")
    setTargetRole(null)
    setEditorOpen(true)
  }

  const openEdit = (item: AnnouncementExpanded) => {
    setEditingId(item.id)
    setTitle(item.title)
    setBody(item.body)
    setTargetRole(item.targetRole)
    setEditorOpen(true)
  }

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      showToast("Title and body are required.", "error")
      return
    }
    setSaving(true)
    const payload = { title: title.trim(), body: body.trim(), targetRole: targetRole ?? undefined }
    const call = editingId
      ? api.put(`/v1/announcements/${editingId}`, payload)
      : api.post("/v1/announcements", payload)

    call
      .then(() => {
        setEditorOpen(false)
        showToast(editingId ? "Announcement updated" : "Announcement posted")
        fetchList()
      })
      .catch((err) => showToast(err?.response?.data?.error?.message ?? "Could not save announcement.", "error"))
      .finally(() => setSaving(false))
  }

  const remove = (item: AnnouncementExpanded) => {
    Alert.alert("Delete announcement?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: () => {
          api.delete(`/v1/announcements/${item.id}`)
            .then(() => { showToast("Announcement deleted"); fetchList() })
            .catch((err) => showToast(err?.response?.data?.error?.message ?? "Could not delete.", "error"))
        },
      },
    ])
  }

  if (loading) return <LoadingView label="Loading announcements..." />
  if (error) return <ErrorView message={error} onRetry={() => fetchList()} />

  return (
    <View style={s.container}>
      <ScreenHeader
        title="Announcements"
        showBack={false}
        rightAction={canCreate ? { icon: "add", onPress: openCreate } : undefined}
      />

      {items.length === 0 ? (
        <EmptyView title="No announcements" subtitle="Posts from school staff will appear here." icon="megaphone-outline" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchList(true)} tintColor={colors.primary} />}
          renderItem={({ item }) => (
            <View style={s.card}>
              <View style={s.cardHeader}>
                <Text style={s.title}>{item.title}</Text>
                {canModify(item) && (
                  <View style={s.actions}>
                    <TouchableOpacity onPress={() => openEdit(item)} style={s.iconBtn}>
                      <Ionicons name="pencil" size={16} color={colors.textMuted} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => remove(item)} style={s.iconBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              <Text style={s.body}>{item.body}</Text>
              <View style={s.footer}>
                <Text style={s.meta}>{item.author.name} - {ROLE_LABELS[item.author.role] ?? item.author.role}</Text>
                <Text style={s.meta}>{timeAgo(item.createdAt)}</Text>
              </View>
              {item.targetRole && (
                <View style={s.targetBadge}>
                  <Text style={s.targetBadgeText}>For {ROLE_LABELS[item.targetRole] ?? item.targetRole}s</Text>
                </View>
              )}
            </View>
          )}
        />
      )}

      <Modal visible={editorOpen} animationType="slide" transparent onRequestClose={() => setEditorOpen(false)}>
        <View style={s.modalBackdrop}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>{editingId ? "Edit Announcement" : "New Announcement"}</Text>
              <TouchableOpacity onPress={() => setEditorOpen(false)}>
                <Text style={s.modalClose}>Cancel</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Title</Text>
            <TextInput
              style={s.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Announcement title"
              placeholderTextColor={colors.textFaint}
              maxLength={200}
            />

            <Text style={s.fieldLabel}>Message</Text>
            <TextInput
              style={[s.input, s.textArea]}
              value={body}
              onChangeText={setBody}
              placeholder="Write your announcement..."
              placeholderTextColor={colors.textFaint}
              multiline
              maxLength={5000}
            />

            <Text style={s.fieldLabel}>Audience</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={[null, ...ALL_ROLES]}
              keyExtractor={(item) => item ?? "everyone"}
              style={{ flexGrow: 0 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.chip, targetRole === item && s.chipActive]}
                  onPress={() => setTargetRole(item)}
                >
                  <Text style={[s.chipText, targetRole === item && s.chipTextActive]}>
                    {item === null ? "Everyone" : ROLE_LABELS[item] ?? item}
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity
              style={[s.submitBtn, saving && s.submitBtnDisabled]}
              onPress={submit}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color={colors.textPrimary} />
                : <Text style={s.submitBtnText}>{editingId ? "Save Changes" : "Post Announcement"}</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  list: { padding: spacing.xl, gap: spacing.sm },
  card: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  title: { ...typography.body, fontWeight: "700", color: colors.textPrimary, flex: 1, marginRight: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm },
  iconBtn: { padding: 2 },
  body: { ...typography.body, color: colors.textMuted, lineHeight: 20 },
  footer: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.xs },
  meta: { ...typography.caption },
  targetBadge: { alignSelf: "flex-start", backgroundColor: colors.surfaceAlt, borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 2, marginTop: spacing.xs },
  targetBadgeText: { fontSize: 10, color: colors.primary, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: "flex-end" },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, padding: spacing.xl, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing.md },
  modalTitle: { ...typography.title },
  modalClose: { color: colors.primary, fontSize: 14, fontWeight: "600" },
  fieldLabel: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, marginBottom: spacing.xs },
  input: { backgroundColor: colors.surfaceAlt, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, color: colors.textPrimary, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 14 },
  textArea: { minHeight: 100, textAlignVertical: "top" },
  chip: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderRadius: radius.full, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, marginRight: spacing.xs },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  chipTextActive: { color: colors.textPrimary },
  submitBtn: { backgroundColor: colors.primary, borderRadius: radius.md, paddingVertical: spacing.md, alignItems: "center", marginTop: spacing.lg },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: colors.textPrimary, fontSize: 14, fontWeight: "700" },
})