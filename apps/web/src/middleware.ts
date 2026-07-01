import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
 
const PUBLIC = ["/login", "/_next", "/favicon.ico", "/api"]
 
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic = PUBLIC.some((p) => pathname.startsWith(p))
  const token    = request.cookies.get("educonnect_token")?.value
 
  if (!token && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }
  if (token && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/dashboard"
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}
 
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}