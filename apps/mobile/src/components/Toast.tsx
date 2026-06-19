import React, { createContext, useCallback, useContext, useRef, useState } from "react"
import { Animated, Text, StyleSheet, View } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { colors, spacing } from "../theme"

type ToastType = "success" | "error"
type ToastState = { message: string; type: ToastType } | null

const ToastContext = createContext<(message: string, type?: ToastType) => void>(() => {})

export function useToast() {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null)
  const opacity = useRef(new Animated.Value(0)).current
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback((message: string, type: ToastType = "success") => {
    if (timer.current) clearTimeout(timer.current)
    setToast({ message, type })
    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start()
    timer.current = setTimeout(() => {
      Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => setToast(null))
    }, 2500)
  }, [opacity])

  return (
    <ToastContext.Provider value={show}>
      {children}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            { opacity, backgroundColor: toast.type === "success" ? colors.success : colors.danger },
          ]}
        >
          <Ionicons
            name={toast.type === "success" ? "checkmark-circle" : "alert-circle"}
            size={18} color="#FFFFFF"
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  )
}

const styles = StyleSheet.create({
  toast: {
    position: "absolute", bottom: 100, alignSelf: "center",
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderRadius: 12, elevation: 6, maxWidth: "90%",
  },
  toastText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600", flexShrink: 1 },
})