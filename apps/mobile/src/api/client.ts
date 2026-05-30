import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"
import * as SecureStore from "expo-secure-store"

export const API_BASE_URL = "https://educonnect-api.loca.lt"

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    "bypass-tunnel-reminder": "true",
  },
})

api.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await SecureStore.getItemAsync("accessToken")
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      try {
        const refreshToken = await SecureStore.getItemAsync("refreshToken")
        if (!refreshToken) throw new Error("No refresh token")

        const res = await axios.post(`${API_BASE_URL}/v1/auth/refresh`, {
          refreshToken,
        })

        const { accessToken, refreshToken: newRefresh } = res.data.data
        await SecureStore.setItemAsync("accessToken", accessToken)
        await SecureStore.setItemAsync("refreshToken", newRefresh)

        if (original.headers) {
          original.headers.Authorization = `Bearer ${accessToken}`
        }
        return api(original)
      } catch {
        await SecureStore.deleteItemAsync("accessToken")
        await SecureStore.deleteItemAsync("refreshToken")
      }
    }
    return Promise.reject(error)
  }
)
