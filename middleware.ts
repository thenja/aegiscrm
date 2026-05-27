import { NextResponse, type NextRequest } from "next/server"

import { updateSession } from "@/lib/supabase/middleware"

const publicPaths = ["/login", "/events/check-in", "/api/events/kiosk"]

function pathStartsWith(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(path + "/")
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const { response, user } = await updateSession(request)

  const isPublicPath = publicPaths.some((path) => pathStartsWith(pathname, path))

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone()
    url.pathname = "/"
    return NextResponse.redirect(url)
  }

  if (user && pathname.startsWith("/admin")) {
    const role = user.app_metadata?.role as string | undefined
    if (role !== "Director" && role !== "Admin") {
      const url = request.nextUrl.clone()
      url.pathname = "/"
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
