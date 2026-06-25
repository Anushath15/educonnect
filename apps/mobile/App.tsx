import React, { useEffect } from "react"
import { View, ActivityIndicator, StyleSheet } from "react-native"
import { StatusBar } from "expo-status-bar"
import { useAuthStore } from "./src/stores/authStore"
import LoginScreen from "./src/screens/auth/LoginScreen"
import DashboardScreen from "./src/screens/dashboard/DashboardScreen"

export default function App() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore()

  useEffect(() => {
    loadFromStorage()
  }, [])

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    )
  }

  return (
    <>
      <StatusBar style="light" />
      {isAuthenticated ? <DashboardScreen /> : <LoginScreen />}
    </>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: "#0F172A",
    justifyContent: "center",
    alignItems: "center",
  },
})
