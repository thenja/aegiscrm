import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const eventCode = new URL(request.url).searchParams.get("event_code")?.trim() ?? ""
  if (!eventCode) {
    return NextResponse.json({ error: "Event code is required." }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("kiosk_get_event", {
      p_event_code: eventCode,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const event = Array.isArray(data) && data.length > 0 ? data[0] : null
    if (!event) {
      return NextResponse.json({ error: "Event not found or not active." }, { status: 404 })
    }

    if (event.status !== "Active") {
      return NextResponse.json({ error: "This event is not active for check-in." }, { status: 403 })
    }

    return NextResponse.json({ event })
  } catch {
    return NextResponse.json({ error: "Failed to load event details." }, { status: 500 })
  }
}
