const TOKEN_KEY = "educonnect_token"
const USER_KEY  = "educonnect_user"
 
export function setAuthCookies(token: string, user: object): void {
  const exp  = new Date(Date.now() + 15 * 60 * 1000).toUTCString()
  const base = "path=/; SameSite=Strict"
  document.cookie = `${TOKEN_KEY}=${token}; expires=${exp}; ${base}`
  document.cookie = `${USER_KEY}=${encodeURIComponent(JSON.stringify(user))}; expires=${exp}; ${base}`
}
 
export function clearAuthCookies(): void {
  const past = "Thu, 01 Jan 1970 00:00:00 UTC"
  document.cookie = `${TOKEN_KEY}=; expires=${past}; path=/`
  document.cookie = `${USER_KEY}=; expires=${past}; path=/`
}
 
export function getTokenCookie(): string | null {
  return parseCookie(TOKEN_KEY)
}
 
export function getUserCookie<T = object>(): T | null {
  const raw = parseCookie(USER_KEY)
  if (!raw) return null
  try { return JSON.parse(decodeURIComponent(raw)) as T } catch { return null }
}
 
function parseCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`))
  return match ? match[1] : null
}