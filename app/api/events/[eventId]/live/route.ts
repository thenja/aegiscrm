import { NextRequest, NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { getEventLiveData } from "@/lib/data/events"

type Params = {
  params: Promise<{ eventId: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  try {
    await requireAuth()
    const { eventId } = await params
    const url = new URL(request.url)
    const query = (url.searchParams.get("query") ?? "").trim()
    const category = (url.searchParams.get("category") ?? "").trim()
    const attendanceStatus = (url.searchParams.get("attendance_status") ?? "").trim()

    const payload = await getEventLiveData(eventId, {
      query: query || undefined,
      category: category || undefined,
      attendance_status: attendanceStatus || undefined,
    })

    return NextResponse.json(payload)
  } catch {
    return NextResponse.json({ error: "Failed to load live event data" }, { status: 500 })
  }
}
