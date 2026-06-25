import { useEffect } from "react"
import { Stack, router } from "expo-router"
import { useAuthStore } from "../src/stores/authStore"
import { View, ActivityIndicator } from "react-native"
import { ToastProvider } from "../src/components/Toast"

export default function RootLayout() {
  const { isAuthenticated, loadFromStorage } = useAuthStore()
  useEffect(() => {
    loadFromStorage()
  }, [])
  useEffect(() => {
    if (isAuthenticated) {
      router.replace("/(app)/")
    } else {
      router.replace("/(auth)/login")
    }
  }, [isAuthenticated])
  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(app)" />
      </Stack>
    </ToastProvider>
  )
}