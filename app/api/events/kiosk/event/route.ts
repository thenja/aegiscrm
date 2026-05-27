import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type KioskEventRpcRow = {
  event_id: string
  client_name: string | null
  event_name: string
  event_date: string
  venue: string | null
  seating_mode: string
  status: string
  total_guests: number
  attended_guests: number
}

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

    const eventRow = Array.isArray(data) && data.length > 0 ? (data[0] as KioskEventRpcRow) : null
    const event = eventRow
      ? {
          event_id: eventRow.event_id,
          client_name: eventRow.client_name,
          event_name: eventRow.event_name,
          event_date: eventRow.event_date,
          venue: eventRow.venue,
          seating_mode: eventRow.seating_mode,
          status: eventRow.status,
          total_guests: eventRow.total_guests,
          attended_guests: eventRow.attended_guests,
        }
      : null
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
