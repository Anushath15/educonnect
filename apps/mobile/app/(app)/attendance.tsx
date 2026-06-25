import React, { useState } from "react"
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useAuthStore } from "@/stores/auth"

const STATUS_COLORS: Record<string, string> = { PRESENT: "#10B981", ABSENT: "#EF4444", LATE: "#F59E0B", EXCUSED: "#3B82F6", HALF_DAY: "#8B5CF6" }
const STATUS_LABELS: Record<string, string> = { PRESENT: "Present", ABSENT: "Absent", LATE: "Late", EXCUSED: "Excused", HALF_DAY: "Half Day" }
type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED" | "HALF_DAY"

export default function AttendanceScreen() {
  const { token } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedClass, setSelectedClass] = useState("")
  const [selectedDate] = useState(new Date().toISOString().split("T")[0])
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({})

  const { data: classes } = useQuery({ queryKey: ["classes"], queryFn: async () => { const res = await axios.get("/api/v1/classes", { headers: { Authorization: `Bearer ${token}` } }); return res.data.data } })
  const { data: students } = useQuery({ queryKey: ["students", selectedClass], enabled: !!selectedClass, queryFn: async () => { const res = await axios.get(`/api/v1/students?classId=${selectedClass}`, { headers: { Authorization: `Bearer ${token}` } }); return res.data.data } })
  const { data: existingAttendance } = useQuery({ queryKey: ["attendance", selectedClass, selectedDate], enabled: !!selectedClass, queryFn: async () => { const res = await axios.get(`/api/v1/attendance/class/${selectedClass}?date=${selectedDate}`, { headers: { Authorization: `Bearer ${token}` } }); return res.data.data } })

  const markMutation = useMutation({
    mutationFn: async (records: any[]) => { return axios.post("/api/v1/attendance/bulk", { classId: selectedClass, date: selectedDate, records }, { headers: { Authorization: `Bearer ${token}` } }) },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["attendance", selectedClass, selectedDate] }) }
  })

  const toggleStatus = (studentId: string) => {
    const current = attendanceMap[studentId] || "PRESENT"
    const statuses: AttendanceStatus[] = ["PRESENT", "ABSENT", "LATE", "EXCUSED", "HALF_DAY"]
    const nextIndex = (statuses.indexOf(current) + 1) % statuses.length
    setAttendanceMap((prev) => ({ ...prev, [studentId]: statuses[nextIndex] }))
  }

  const handleSave = () => {
    const records = Object.entries(attendanceMap).map(([studentId, status]) => ({ studentId, status }))
    markMutation.mutate(records)
  }

  const getStatus = (studentId: string): AttendanceStatus => {
    if (attendanceMap[studentId]) return attendanceMap[studentId]
    const existing = existingAttendance?.find((a: any) => a.studentId === studentId)
    return existing?.status || "PRESENT"
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Attendance</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.classRow}>
        {classes?.map((cls: any) => (
          <TouchableOpacity key={cls.id} style={[styles.classChip, selectedClass === cls.id && styles.classChipActive]} onPress={() => setSelectedClass(cls.id)}>
            <Text style={[styles.classChipText, selectedClass === cls.id && styles.classChipTextActive]}>{cls.name} {cls.section}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <Text style={styles.dateText}>{selectedDate}</Text>
      <FlatList
        data={students}
        keyExtractor={(item: any) => item.id}
        renderItem={({ item }) => {
          const status = getStatus(item.id)
          return (
            <TouchableOpacity style={styles.studentRow} onPress={() => toggleStatus(item.id)}>
              <View style={styles.studentInfo}><Text style={styles.studentName}>{item.name}</Text><Text style={styles.rollNumber}>Roll: {item.rollNumber}</Text></View>
              <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] + "20" }]}><View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[status] }]} /><Text style={[styles.statusText, { color: STATUS_COLORS[status] }]}>{STATUS_LABELS[status]}</Text></View>
            </TouchableOpacity>
          )
        }}
        ListEmptyComponent={<Text style={styles.emptyText}>Select a class to view students</Text>}
      />
      {selectedClass && (
        <TouchableOpacity style={[styles.saveButton, markMutation.isPending && styles.saveButtonDisabled]} onPress={handleSave} disabled={markMutation.isPending}>
          <Text style={styles.saveButtonText}>{markMutation.isPending ? "Saving..." : "Save Attendance"}</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC", padding: 16 },
  title: { fontSize: 28, fontWeight: "700", color: "#1E293B", marginBottom: 16 },
  classRow: { flexDirection: "row", marginBottom: 16, maxHeight: 50 },
  classChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: "#E2E8F0", marginRight: 8 },
  classChipActive: { backgroundColor: "#7C6FFF" },
  classChipText: { fontSize: 14, color: "#475569", fontWeight: "500" },
  classChipTextActive: { color: "#FFFFFF" },
  dateText: { fontSize: 16, color: "#64748B", marginBottom: 12, fontWeight: "500" },
  studentRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 16, backgroundColor: "#FFFFFF", borderRadius: 12, marginBottom: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 },
  studentInfo: { flex: 1 },
  studentName: { fontSize: 16, fontWeight: "600", color: "#1E293B" },
  rollNumber: { fontSize: 13, color: "#94A3B8", marginTop: 2 },
  statusBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 13, fontWeight: "600" },
  emptyText: { textAlign: "center", color: "#94A3B8", marginTop: 40, fontSize: 16 },
  saveButton: { backgroundColor: "#7C6FFF", paddingVertical: 16, borderRadius: 12, alignItems: "center", marginTop: 8 },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" }
})
