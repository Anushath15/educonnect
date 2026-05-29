import { StatusBar } from "expo-status-bar"
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
} from "react-native"

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>EduConnect</Text>
        <Text style={styles.subtitle}>
          Smart School Management System
        </Text>
      </View>

      {/* Dashboard */}
      <ScrollView contentContainerStyle={styles.dashboard}>
        
        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>📚 Timetable</Text>
          <Text style={styles.cardText}>
            View and manage class schedules
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>👨‍🏫 Teachers</Text>
          <Text style={styles.cardText}>
            Manage teachers and assignments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>🎓 Students</Text>
          <Text style={styles.cardText}>
            Student records and attendance
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.card}>
          <Text style={styles.cardTitle}>🔄 Substitutions</Text>
          <Text style={styles.cardText}>
            Handle teacher substitutions
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0F172A",
  },

  header: {
    paddingTop: 40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },

  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#FFFFFF",
  },

  subtitle: {
    fontSize: 16,
    color: "#CBD5E1",
    marginTop: 6,
  },

  dashboard: {
    padding: 20,
    gap: 16,
  },

  card: {
    backgroundColor: "#1E293B",
    padding: 20,
    borderRadius: 16,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },

  cardText: {
    fontSize: 14,
    color: "#CBD5E1",
  },
})