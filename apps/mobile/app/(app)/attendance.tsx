import React, { useState } from "react"
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, ScrollView,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "../../src/api/client"
import { useAuthStore } from "../../src/stores/authStore"
 
const STATUS_COLORS: Record<string, string> = {
  PRESENT:  "#10B981",
  ABSENT:   "#EF4444",
  LATE:     "#F59E0B",
  EXCUSED:  "#3B82F6",
  HALF_DAY: "#8B5CF6",
}
const STATUS_LABELS: Record<string, string> = {
  PRESENT:  "Present",
  ABSENT:   "Absent",
  LATE:     "Late",
  EXCUSED:  "Excused",
  HALF_DAY: "Half Day",
}
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "HALF_DAY"
 
interface ClassItem   { id: string; name: string; section?: string }
interface StudentItem { id: string; name: string; rollNumber?: string }
interface AttRecord   { studentId: string; status: AttendanceStatus }
 
export default function AttendanceScreen() {
  const { token }      = useAuthStore()
  const queryClient    = useQueryClient()
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedDate]                    = useState(new Date().toISOString().split("T")[0])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({})
 
  const authHeader = { Authorization: `Bearer ${token}` }
 
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
    const statuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]
    const current   = attendanceMap[studentId] ?? "PRESENT"
    const nextIndex = (statuses.indexOf(current) + 1) % statuses.length
    setAttendanceMap((prev) => ({ ...prev, [studentId]: statuses[nextIndex] }))
  }
 
  const getStatus = (studentId: string): AttendanceStatus => {
    if (attendanceMap[studentId]) return attendanceMap[studentId]
    const existing = existingAttendance?.find((a) => a.studentId === studentId)
    return existing?.status ?? "PRESENT"
  }
 
  const handleSave = () => {
    const records = Object.entries(attendanceMap).map(([studentId, status]) => ({
      studentId,
      status,
    }))
    if (records.length > 0) markMutation.mutate(records)
  }
 
  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Attendance</Text>
 
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classRow}>
        {classes?.map((cls) => (
          <TouchableOpacity
            key={cls.id}
            style={[styles.classChip, selectedClass === cls.id && styles.classChipActive]}
            onPress={() => setSelectedClass(cls.id)}
          >
            <Text style={[styles.classChipText, selectedClass === cls.id && styles.classChipTextActive]}>
              {cls.name} {cls.section}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
 
      <Text style={styles.dateText}>{selectedDate}</Text>
 
      <FlatList
        data={students}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const status = getStatus(item.id)
          return (
            <TouchableOpacity style={styles.studentRow} onPress={() => toggleStatus(item.id)}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>{item.name}</Text>
                <Text style={styles.rollNumber}>Roll: {item.rollNumber}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] + "20" }]}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} />
                <Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>
                  {STATUS_LABELS[status]}
                </Text>
              </View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Select a class to view students</Text>
        }
      />
 
      {selectedClass && (
        <TouchableOpacity
          style={[styles.saveButton, markMutation.isPending && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={markMutation.isPending}
        >
          <Text style={styles.saveButtonText}>
            {markMutation.isPending ? "Saving..." : "Save Attendance"}
          </Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}
 
const styles = StyleSheet.create({
  container:            { flex: 1, backgroundColor: "#0F0F14", padding: 16 },
  title:                { fontSize: 28, fontWeight: "700", color: "#FFFFFF", marginBottom: 16 },
  classRow:             { flexDirection: "row", marginBottom: 16, maxHeight: 50 },
  classChip:            { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#1E1E2E", marginRight: 8 },
  classChipActive:      { backgroundColor: "#7C6FFF" },
  classChipText:        { fontSize: 14, color: "#94A3B8", fontWeight: "500" },
  classChipTextActive:  { color: "#FFFFFF" },
  dateText:             { fontSize: 16, color: "#64748B", marginBottom: 12, fontWeight: "500" },
  studentRow:           { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#1E1E2E", borderRadius: 12, marginBottom: 8 },
  studentInfo:          { flex: 1 },
  studentName:          { fontSize: 16, fontWeight: "600", color: "#FFFFFF" },
  rollNumber:           { fontSize: 13, color: "#64748B", marginTop: 2 },
  statusBadge:          { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusDot:            { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText:           { fontSize: 13, fontWeight: "600" },
  emptyText:            { textAlign: "center", color: "#64748B", marginTop: 40, fontSize: 16 },
  saveButton:           { backgroundColor: "#7C6FFF", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  saveButtonDisabled:   { opacity: 0.6 },
  saveButtonText:       { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
})