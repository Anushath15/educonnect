import { useEffect } from "react"
import { Stack, router } from "expo-router"
import { useAuthStore } from "../src/stores/authStore"
import { View, ActivityIndicator } from "react-native"
import { ToastProvider } from "../src/components/Toast"
import { ErrorBoundary } from "../src/components/ErrorBoundary"
 
export default function RootLayout() {
  const { isAuthenticated, isLoading, loadFromStorage } = useAuthStore()
 
  useEffect(() => {
    loadFromStorage()
  }, [])
 
  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) {
      router.replace("/(app)/")
    } else {
      router.replace("/(auth)/login")
    }
  }, [isAuthenticated, isLoading])
 
  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#0F0F14" }}>
        <ActivityIndicator size="large" color="#7C6FFF" />
      </View>
    )
  }
 
  return (
    <ErrorBoundary>
      <ToastProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
      </ToastProvider>
    </ErrorBoundary>
  )
}