import { NextRequest, NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { searchConfig, searchGlobal } from "@/lib/data/search"

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
  if (query.length < searchConfig.minQueryLength) {
    return NextResponse.json({ query, results: [] })
  }

  try {
    const results = await searchGlobal(query.slice(0, 100))
    return NextResponse.json({ query, results })
  } catch {
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
