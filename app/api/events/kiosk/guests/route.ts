import { NextResponse } from "next/server"

import { createClient } from "@/lib/supabase/server"

type SortMode = "table" | "company" | "name"
type StatusFilter = "all" | "Not Arrived" | "Attended"

function normalizeSort(value: string | null): SortMode {
  if (value === "table" || value === "company" || value === "name") return value
  return "name"
}

function normalizeStatus(value: string | null): StatusFilter {
  if (value === "Not Arrived" || value === "Attended") return value
  return "all"
}

function compareTable(a: string | null, b: string | null) {
  const aNum = Number.parseInt((a ?? "").trim(), 10)
  const bNum = Number.parseInt((b ?? "").trim(), 10)
  const aValid = Number.isFinite(aNum)
  const bValid = Number.isFinite(bNum)
  if (aValid && bValid && aNum !== bNum) return aNum - bNum
  if (aValid && !bValid) return -1
  if (!aValid && bValid) return 1
  return (a ?? "").localeCompare(b ?? "", undefined, { sensitivity: "base" })
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  const eventCode = url.searchParams.get("event_code")?.trim() ?? ""
  const sort = normalizeSort(url.searchParams.get("sort"))
  const status = normalizeStatus(url.searchParams.get("status"))
  const category = (url.searchParams.get("category") ?? "all").trim()

  if (!eventCode) {
    return NextResponse.json({ error: "Event code is required." }, { status: 400 })
  }

  try {
    const supabase = await createClient()
    const { data: eventRows, error: eventError } = await supabase
      .from("events")
      .select("event_id, seating_mode, status")
      .ilike("event_code", eventCode)
      .limit(1)

    if (eventError) {
      return NextResponse.json({ error: eventError.message }, { status: 500 })
    }

    const event = eventRows?.[0]
    if (!event || event.status !== "Active") {
      return NextResponse.json({ error: "Event not found or not active." }, { status: 404 })
    }

    let query = supabase
      .from("event_guests")
      .select(
        "guest_id,event_id,guest_name,company,designation,category,table_no,attendance_status,checked_in_at,checked_in_by_nickname"
      )
      .eq("event_id", event.event_id)
      .limit(1000)

    if (status !== "all") {
      query = query.eq("attendance_status", status)
    }
    if (category !== "all") {
      query = query.eq("category", category)
    }

    const { data: guests, error: guestsError } = await query
    if (guestsError) {
      return NextResponse.json({ error: guestsError.message }, { status: 500 })
    }

    const rows = [...(guests ?? [])]
    rows.sort((a, b) => {
      const nameCompare = (a.guest_name ?? "").localeCompare(b.guest_name ?? "", undefined, { sensitivity: "base" })
      if (sort === "table") {
        const tableCompare = compareTable(a.table_no, b.table_no)
        if (tableCompare !== 0) return tableCompare
        return nameCompare
      }
      if (sort === "company") {
        const companyCompare = (a.company ?? "").localeCompare(b.company ?? "", undefined, { sensitivity: "base" })
        if (companyCompare !== 0) return companyCompare
        return nameCompare
      }
      return nameCompare
    })

    return NextResponse.json({
      guests: rows,
      seating_mode: event.seating_mode,
    })
  } catch {
    return NextResponse.json({ error: "Failed to load kiosk attendance list." }, { status: 500 })
  }
}
