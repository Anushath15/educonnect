import React, { useState } from "react"
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../src/api/client"

// Error 1 fix: `token` does not exist on AuthState — the correct field is
// `accessToken`. But we don't need it here at all: the axios `api` client
// already adds the Bearer header automatically via its request interceptor.
// Removed the unused `useAuthStore` import and `authHeader` declaration.

// ── Types ─────────────────────────────────────────────────────────────────────

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "HALF_DAY"

interface ClassItem   { id: string; name: string; section?: string }
interface StudentItem { id: string; name: string; rollNumber?: string }
interface AttRecord   { studentId: string; status: AttendanceStatus }

const STATUS_COLORS: Record<AttendanceStatus, string> = {
  PRESENT:  "#10B981",
  ABSENT:   "#EF4444",
  LATE:     "#F59E0B",
  EXCUSED:  "#3B82F6",
  HALF_DAY: "#8B5CF6",
}

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  PRESENT:  "Present",
  ABSENT:   "Absent",
  LATE:     "Late",
  EXCUSED:  "Excused",
  HALF_DAY: "Half Day",
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AttendanceScreen() {
  const queryClient = useQueryClient()
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedDate]                    = useState(new Date().toISOString().split("T")[0])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({})

  const { data: classes } = useQuery<ClassItem[]>({
    queryKey: ["classes"],
    queryFn:  async () => {
      const res = await api.get<{ data: ClassItem[] }>("/v1/classes")
      return res.data.data
    },
  })

  const { data: students } = useQuery<StudentItem[]>({
    queryKey: ["students", selectedClass],
    enabled:  !!selectedClass,
    queryFn:  async () => {
      const res = await api.get<{ data: StudentItem[] }>(`/v1/students?classId=${selectedClass}`)
      return res.data.data
    },
  })

  const { data: existingAttendance } = useQuery<AttRecord[]>({
    queryKey: ["attendance", selectedClass, selectedDate],
    enabled:  !!selectedClass,
    queryFn:  async () => {
      const res = await api.get<{ data: AttRecord[] }>(
        `/v1/attendance/class/${selectedClass}?date=${selectedDate}`
      )
      return res.data.data
    },
  })

  const markMutation = useMutation({
    mutationFn: async (records: { studentId: string; status: AttendanceStatus }[]) =>
      api.post("/v1/attendance/bulk", {
        classId: selectedClass,
        date:    selectedDate,
        records,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance", selectedClass, selectedDate] })
    },
  })

  const toggleStatus = (studentId: string) => {
    const order: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]
    const current   = attendanceMap[studentId] ?? "PRESENT"
    const nextIndex = (order.indexOf(current) + 1) % order.length
    setAttendanceMap((prev) => ({ ...prev, [studentId]: order[nextIndex] }))
  }

  // Error 2 fix: parameter `a` was implicit `any` — added explicit `: AttRecord` type
  const getStatus = (studentId: string): AttendanceStatus => {
    if (attendanceMap[studentId]) return attendanceMap[studentId]
    const existing = existingAttendance?.find((a: AttRecord) => a.studentId === studentId)
    return existing?.status ?? "PRESENT"
  }

  const handleSave = () => {
    const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
      studentId,
      status,
    }))
    if (records.length > 0) markMutation.mutate(records)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Attendance</Text>
      <Text style={styles.date}>{selectedDate}</Text>

      {/* Class selector */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classRow}>
        {/* Error 3 fix: parameter `cls` was implicit `any` — added explicit `: ClassItem` type */}
        {classes?.map((cls: ClassItem) => (
          <TouchableOpacity
            key={cls.id}
            style={[styles.chip, selectedClass === cls.id && styles.chipActive]}
            onPress={() => setSelectedClass(cls.id)}
          >
            <Text style={[styles.chipText, selectedClass === cls.id && styles.chipTextActive]}>
              {cls.name}{cls.section ? ` ${cls.section}` : ""}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Student list */}
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const status = getStatus(item.id)
          return (
            <TouchableOpacity style={styles.row} onPress={() => toggleStatus(item.id)}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                {item.rollNumber ? (
                  <Text style={styles.roll}>Roll: {item.rollNumber}</Text>
                ) : null}
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[status] + "22" }]}>
                <View style={[styles.dot, { backgroundColor: STATUS_COLORS[status] }]} />
                <Text style={[styles.badgeText, { color: STATUS_COLORS[status] }]}>
                  {STATUS_LABELS[status]}
                </Text>
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {selectedClass ? "No students in this class" : "Select a class to begin"}
          </Text>
        }
        contentContainerStyle={styles.list}
      />

      {/* Save button — only shown when a class is selected */}
      {selectedClass ? (
        <TouchableOpacity
          style={[styles.saveBtn, markMutation.isPending && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={markMutation.isPending}
        >
          <Text style={styles.saveBtnText}>
            {markMutation.isPending ? "Saving…" : "Save Attendance"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </SafeAreaView>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: "#0F0F14", paddingHorizontal: 16, paddingTop: 16 },
  title:           { fontSize: 28, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  date:            { fontSize: 14, color: "#64748B", marginBottom: 12 },
  classRow:        { flexGrow: 0, marginBottom: 16 },
  chip:            { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1E1E2E", marginRight: 8 },
  chipActive:      { backgroundColor: "#7C6FFF" },
  chipText:        { fontSize: 14, color: "#64748B", fontWeight: "500" },
  chipTextActive:  { color: "#FFFFFF" },
  list:            { paddingBottom: 80 },
  row:             { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#1E1E2E", borderRadius: 12, marginBottom: 8 },
  studentInfo:     { flex: 1 },
  studentName:     { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  roll:            { fontSize: 13, color: "#64748B", marginTop: 2 },
  badge:           { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  dot:             { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  badgeText:       { fontSize: 13, fontWeight: "600" },
  empty:           { textAlign: "center", color: "#64748B", marginTop: 60, fontSize: 16 },
  saveBtn:         { position: "absolute", bottom: 16, left: 16, right: 16, backgroundColor: "#7C6FFF", paddingVertical: 16, borderRadius: 12, alignItems: "center" },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText:     { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
})