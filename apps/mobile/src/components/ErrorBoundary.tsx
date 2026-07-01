import React from "react"
import { View, Text, TouchableOpacity, StyleSheet } from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
 
interface Props  { children: React.ReactNode; onReset?: () => void }
interface State  { hasError: boolean; error: Error | null }
 
/**
 * Catches unhandled JS errors anywhere in the component tree below it.
 * Renders a recovery UI instead of a blank screen.
 *
 * Must be a class component — React does not support error boundaries
 * in function components (no hook equivalent as of React 18).
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false, error: null }
 
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
 
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, send to an error tracker (e.g. Sentry) here
    console.error("[ErrorBoundary] Caught error:", error.message, info.componentStack)
  }
 
  reset = () => {
    this.setState({ hasError: false, error: null })
    this.props.onReset?.()
  }
 
  render() {
    if (!this.state.hasError) return this.props.children
 
    return (
      <SafeAreaView style={s.container}>
        <View style={s.content}>
          <View style={s.iconBox}>
            <Text style={s.icon}>⚠</Text>
          </View>
          <Text style={s.title}>Something went wrong</Text>
          <Text style={s.message}>
            {this.state.error?.message ?? "An unexpected error occurred"}
          </Text>
          <TouchableOpacity style={s.button} onPress={this.reset} activeOpacity={0.8}>
            <Text style={s.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }
}
 
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F0F14" },
  content:   { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  iconBox:   {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#EF444420", alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },
  icon:       { fontSize: 28 },
  title:      { fontSize: 20, fontWeight: "700", color: "#FFFFFF", textAlign: "center", marginBottom: 8 },
  message:    { fontSize: 14, color: "#94A3B8", textAlign: "center", lineHeight: 20, marginBottom: 32 },
  button:     { backgroundColor: "#7C6FFF", paddingHorizontal: 32, paddingVertical: 14, borderRadius: 12 },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
})