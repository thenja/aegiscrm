import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type Body = {
  event_code?: string
  staff_nickname?: string
  guest_id?: string
  session_id?: string
  device_info?: string
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const eventCode = (body.event_code ?? "").trim()
    const staffNickname = (body.staff_nickname ?? "").trim()
    const guestId = (body.guest_id ?? "").trim()
    const sessionId = (body.session_id ?? "").trim() || null
    const deviceInfo = (body.device_info ?? "").trim() || null

    if (!eventCode || !staffNickname || !guestId) {
      return NextResponse.json(
        { error: "event_code, staff_nickname, and guest_id are required." },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc("kiosk_check_in_guest", {
      p_event_code: eventCode,
      p_staff_nickname: staffNickname,
      p_guest_id: guestId,
      p_session_id: sessionId,
      p_device_info: deviceInfo,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "Failed to process check-in." }, { status: 500 })
  }
}
