import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const eventCode = url.searchParams.get("event_code")?.trim() ?? ""
  const query = url.searchParams.get("q")?.trim() ?? ""

  if (!eventCode) {
    return NextResponse.json({ error: "Event code is required." }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase.rpc("kiosk_search_guests", {
      p_event_code: eventCode,
      p_query: query,
      p_limit: 40,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ guests: data ?? [] })
  } catch {
    return NextResponse.json({ error: "Failed to search guests." }, { status: 500 })
  }
}
