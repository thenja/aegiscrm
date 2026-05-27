import * as XLSX from "xlsx"
import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { requireEventManageAccess } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import {
  buildRowFromRawRecord,
  detectDuplicateRows,
  type ImportPreviewResult,
} from "@/lib/events-import"

const REQUIRED_COLUMN_HINTS = ["Guest Name"]

export async function POST(request: Request) {
  try {
    await requireAuth()

    const formData = await request.formData()
    const eventId = String(formData.get("event_id") ?? "").trim()
    const file = formData.get("file")

    if (!eventId) {
      return NextResponse.json({ error: "event_id is required" }, { status: 400 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Excel file is required" }, { status: 400 })
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

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: "array" })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      return NextResponse.json({ error: "Workbook has no sheets" }, { status: 400 })
    }

    const sheet = workbook.Sheets[sheetName]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
      raw: false,
      blankrows: false,
    })

    const parsedRows: ReturnType<typeof buildRowFromRawRecord>[] = []
    const invalidRowsInfo: Array<{ row_number: number; error: string }> = []

    rawRows.forEach((rawRow, index) => {
      try {
        parsedRows.push(buildRowFromRawRecord(rawRow))
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid row"
        invalidRowsInfo.push({ row_number: index + 2, error: message })
      }
    })

    const { data: existingGuests, error: existingGuestsError } = await supabase
      .from("event_guests")
      .select("guest_name, company, email, phone")
      .eq("event_id", eventId)

    if (existingGuestsError) {
      return NextResponse.json({ error: existingGuestsError.message }, { status: 500 })
    }

    const duplicateRowsInfo = detectDuplicateRows({
      rows: parsedRows,
      existingRows: (existingGuests ?? []) as Array<{
        guest_name: string
        company: string | null
        email: string | null
        phone: string | null
      }>,
    })

    const preview: ImportPreviewResult = {
      file_name: file.name,
      total_rows: rawRows.length,
      valid_rows: parsedRows.length,
      invalid_rows: invalidRowsInfo.length,
      duplicate_rows: duplicateRowsInfo.length,
      required_columns_missing: parsedRows.length === 0 && rawRows.length > 0 ? REQUIRED_COLUMN_HINTS : [],
      rows: parsedRows,
      duplicate_rows_info: duplicateRowsInfo,
      invalid_rows_info: invalidRowsInfo,
    }

    return NextResponse.json(preview)
  } catch {
    return NextResponse.json({ error: "Failed to preview import" }, { status: 500 })
  }
}
