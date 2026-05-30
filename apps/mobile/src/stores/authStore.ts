import { create } from "zustand"
import * as SecureStore from "expo-secure-store"
import { api } from "../api/client"

interface User {
  userId: string
  schoolId: string
  role: string
  name?: string
  email?: string
}

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadFromStorage: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true })
    try {
      const res = await api.post("/v1/auth/login", { email, password })
      const { accessToken, refreshToken } = res.data.data

      await SecureStore.setItemAsync("accessToken", accessToken)
      await SecureStore.setItemAsync("refreshToken", refreshToken)

      const meRes = await api.get("/v1/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const user = meRes.data.data

      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
        isLoading: false,
      })
    } catch (error: any) {
      set({ isLoading: false })
      const message =
        error?.response?.data?.error?.message ?? "Login failed. Check your credentials."
      throw new Error(message)
    }
  },

  logout: async () => {
    try {
      const { refreshToken } = get()
      if (refreshToken) {
        await api.post("/v1/auth/logout", { refreshToken }).catch(() => {})
      }
    } finally {
      await SecureStore.deleteItemAsync("accessToken")
      await SecureStore.deleteItemAsync("refreshToken")
      set({
        user: null,
        accessToken: null,
        refreshToken: null,
        isAuthenticated: false,
      })
    }
  },

  loadFromStorage: async () => {
    try {
      const accessToken = await SecureStore.getItemAsync("accessToken")
      const refreshToken = await SecureStore.getItemAsync("refreshToken")
      if (!accessToken || !refreshToken) return

      const meRes = await api.get("/v1/auth/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
      const user = meRes.data.data

      set({
        accessToken,
        refreshToken,
        user,
        isAuthenticated: true,
      })
    } catch {
      await SecureStore.deleteItemAsync("accessToken")
      await SecureStore.deleteItemAsync("refreshToken")
    }
  },
}))
