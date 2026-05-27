import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import {
  detectDuplicateRows,
  filterRowsByDuplicateMode,
  type ParsedGuestImportRow,
} from "@/lib/events-import"
import { requireEventManageAccess } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { EVENT_DUPLICATE_MODES, type EventDuplicateMode } from "@/types/domain"

type CommitPayload = {
  event_id: string
  file_name: string
  duplicate_mode: EventDuplicateMode
  rows: ParsedGuestImportRow[]
}

function isDuplicateMode(value: string): value is EventDuplicateMode {
  return (EVENT_DUPLICATE_MODES as readonly string[]).includes(value)
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuth()
    const body = (await request.json()) as Partial<CommitPayload>

    const eventId = (body.event_id ?? "").trim()
    const fileName = (body.file_name ?? "").trim() || "event-import.xlsx"
    const duplicateMode = body.duplicate_mode
    const rows = Array.isArray(body.rows) ? body.rows : []

    if (!eventId) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 })
    }
    if (!duplicateMode || !isDuplicateMode(duplicateMode)) {
      return NextResponse.json({ error: "duplicate_mode is invalid" }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("event_id, client_id")
      .eq("event_id", eventId)
      .single<{ event_id: string; client_id: string }>()

    if (eventError || !event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    await requireEventManageAccess(event.client_id)

    const { data: existingGuests, error: existingGuestsError } = await supabase
      .from("event_guests")
      .select("guest_name, company, email, phone")
      .eq("event_id", eventId)

    if (existingGuestsError) {
      return NextResponse.json({ error: existingGuestsError.message }, { status: 500 })
    }

    const duplicateRowsInfo = detectDuplicateRows({
      rows,
      existingRows: (existingGuests ?? []) as Array<{
        guest_name: string
        company: string | null
        email: string | null
        phone: string | null
      }>,
    })

    const filteredRows = filterRowsByDuplicateMode({
      rows,
      duplicateRowsInfo,
      duplicateMode,
    })

    let importedRows = 0
    let skippedRows = rows.length - filteredRows.length
    let failedRows = 0
    const insertErrors: Array<{ index: number; message: string }> = []

    for (let index = 0; index < filteredRows.length; index += 1) {
      const row = filteredRows[index]
      const { error } = await supabase.from("event_guests").insert({
        event_id: eventId,
        guest_name: row.guest_name,
        company: row.company,
        designation: row.designation,
        category: row.category,
        email: row.email,
        phone: row.phone,
        rsvp_status: row.rsvp_status,
        table_no: row.table_no,
        seat_no: row.seat_no,
        remarks: row.remarks,
      })

      if (error) {
        failedRows += 1
        skippedRows += 1
        insertErrors.push({ index: index + 2, message: error.message })
        continue
      }

      importedRows += 1
    }

    const summary = {
      duplicate_mode: duplicateMode,
      duplicate_rows_info: duplicateRowsInfo,
      import_errors: insertErrors,
    }

    const { error: batchError } = await supabase.from("event_import_batches").insert({
      event_id: eventId,
      uploaded_by: auth.profile.user_id,
      file_name: fileName,
      status: failedRows > 0 ? "Failed" : "Imported",
      total_rows: rows.length,
      valid_rows: rows.length,
      duplicate_rows: duplicateRowsInfo.length,
      imported_rows: importedRows,
      skipped_rows: skippedRows,
      duplicate_mode: duplicateMode,
      summary,
    })

    if (batchError) {
      return NextResponse.json({ error: batchError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      event_id: eventId,
      imported_rows: importedRows,
      skipped_rows: skippedRows,
      duplicate_rows: duplicateRowsInfo.length,
      failed_rows: failedRows,
      duplicate_mode: duplicateMode,
    })
  } catch {
    return NextResponse.json({ error: "Failed to import guest rows" }, { status: 500 })
  }
}
