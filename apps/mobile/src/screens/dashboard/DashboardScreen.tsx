import React from "react"
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Alert } from "react-native"
import { useAuthStore } from "../../stores/authStore"

const ROLE_LABELS: Record<string, string> = {
  PRINCIPAL: "Principal",
  VICE_PRINCIPAL: "Vice Principal",
  COORDINATOR: "Coordinator",
  ADMINISTRATOR: "Administrator",
  CLASS_TEACHER: "Class Teacher",
  SUBJECT_TEACHER: "Subject Teacher",
  TEMP_TEACHER: "Temp Teacher",
  INTERN: "Intern",
  OFFICE_STAFF: "Office Staff",
}

const CARDS = [
  { title: "Timetable", desc: "View and manage class schedules" },
  { title: "Teachers", desc: "Manage teachers and assignments" },
  { title: "Students", desc: "Student records and attendance" },
  { title: "Substitutions", desc: "Handle teacher substitutions" },
  { title: "Swap Requests", desc: "Manage period swap requests" },
  { title: "Resources", desc: "Book classrooms and resources" },
]

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

export default function DashboardScreen() {
  const { user, logout } = useAuthStore()

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: logout },
    ])
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{user?.name ?? "User"}</Text>
          <Text style={styles.role}>{ROLE_LABELS[user?.role ?? ""] ?? user?.role}</Text>
          {user?.school && (<Text style={styles.school}>{user.school.name}</Text>)}
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.grid}>
        {CARDS.map((card) => (
          <TouchableOpacity key={card.title} style={styles.card}>
            <Text style={styles.cardTitle}>{card.title}</Text>
            <Text style={styles.cardDesc}>{card.desc}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 60, paddingHorizontal: 20, paddingBottom: 24, backgroundColor: "#1E293B" },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 14, color: "#94A3B8" },
  name: { fontSize: 22, fontWeight: "700", color: "#FFFFFF", marginTop: 2 },
  role: { fontSize: 13, color: "#6366F1", marginTop: 2, fontWeight: "600" },
  school: { fontSize: 12, color: "#64748B", marginTop: 2 },
  logoutBtn: { backgroundColor: "#0F172A", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#334155", marginLeft: 12 },
  logoutText: { color: "#94A3B8", fontSize: 13 },
  grid: { padding: 16, flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: { backgroundColor: "#1E293B", borderRadius: 16, padding: 20, width: "47%" },
  cardTitle: { fontSize: 15, fontWeight: "700", color: "#FFFFFF", marginBottom: 4 },
  cardDesc: { fontSize: 12, color: "#64748B", lineHeight: 16 },
})
