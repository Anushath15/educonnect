import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import * as SecureStore from "expo-secure-store"

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15_000,
  headers: { "Content-Type": "application/json" },
})

// ── Request interceptor: attach access token ─────────────────────────────────

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync("accessToken")
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Token refresh ─────────────────────────────────────────────────────────────

/**
 * Single in-flight refresh promise shared across all concurrent 401 responses.
 *
 * Fixed H-003: previously each failed request independently called
 * POST /v1/auth/refresh. The server uses refresh-token rotation, so only
 * the first call succeeded; subsequent calls received "token not found",
 * cleared stored credentials, and logged the user out mid-session.
 *
 * Now all concurrent 401 errors await the same promise. Only one refresh
 * call is made; the new access token is returned to every waiting request.
 */
let refreshPromise: Promise<string | null> | null = null

async function performRefresh(): Promise<string | null> {
  const refreshToken = await SecureStore.getItemAsync("refreshToken")
  if (!refreshToken) return null

  const res = await axios.post<{
    data: { accessToken: string; refreshToken: string }
  }>(`${API_BASE_URL}/v1/auth/refresh`, { refreshToken })

  const { accessToken, refreshToken: newRefresh } = res.data.data
  await Promise.all([
    SecureStore.setItemAsync("accessToken", accessToken),
    SecureStore.setItemAsync("refreshToken", newRefresh),
  ])
  return accessToken
}

async function clearSession(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync("accessToken"),
    SecureStore.deleteItemAsync("refreshToken"),
  ])
}

// ── Response interceptor: handle 401, retry once with new token ──────────────

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // Only handle 401s once per request (prevent infinite retry loops).
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error)
    }
    original._retry = true

    try {
      if (!refreshPromise) {
        refreshPromise = performRefresh().finally(() => {
          refreshPromise = null
        })
      }

      const newToken = await refreshPromise
      if (!newToken) throw new Error("No token returned from refresh")

      if (original.headers) {
        original.headers.Authorization = `Bearer ${newToken}`
      }
      return api(original)
    } catch {
      await clearSession()
      return Promise.reject(error)
    }
  }
)