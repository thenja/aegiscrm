import * as XLSX from "xlsx"
import { NextResponse } from "next/server"

import { requireAuth } from "@/lib/auth"
import { getEventById, getEventLiveData } from "@/lib/data/events"

type Params = {
  params: {
    eventId: string
  }
}

function csvEscape(value: string | number | null | undefined) {
  const text = value === null || value === undefined ? "" : String(value)
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`
  }
  return text
}

export async function GET(request: Request, { params }: Params) {
  try {
    await requireAuth()
    const event = await getEventById(params.eventId)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    const format = new URL(request.url).searchParams.get("format") === "xlsx" ? "xlsx" : "csv"
    const payload = await getEventLiveData(params.eventId)

    const guestsRows = payload.guests.map((guest) => ({
      "Event Name": payload.event.event_name,
      "Event Date": payload.event.event_date,
      "Client": payload.event.client_name,
      "Guest Name": guest.guest_name,
      Company: guest.company ?? "",
      Designation: guest.designation ?? "",
      Category: guest.category,
      Email: guest.email ?? "",
      Phone: guest.phone ?? "",
      "RSVP Status": guest.rsvp_status,
      "Table No": guest.table_no ?? "",
      "Seat No": guest.seat_no ?? "",
      "Attendance Status": guest.attendance_status,
      "Checked In At": guest.checked_in_at ?? "",
      "Checked In By": guest.checked_in_by_nickname ?? "",
      Remarks: guest.remarks ?? "",
    }))

    const attendedRows = guestsRows.filter((row) => row["Attendance Status"] === "Attended")
    const absentRows = guestsRows.filter((row) => row["Attendance Status"] !== "Attended")

    const categorySummaryRows = payload.summary.byCategory.map((row) => ({
      Category: row.category,
      Total: row.total,
      Attended: row.attended,
      Absent: row.total - row.attended,
    }))

    const tableSummaryRows = payload.summary.byTable.map((row) => ({
      "Table No": row.tableNo,
      Total: row.total,
      Attended: row.attended,
      Absent: row.total - row.attended,
    }))

    if (format === "xlsx") {
      const workbook = XLSX.utils.book_new()

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(guestsRows), "Full Guest List")
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(attendedRows), "Attended")
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(absentRows), "Absent")
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(categorySummaryRows), "By Category")
      if (tableSummaryRows.length > 0) {
        XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(tableSummaryRows), "By Table")
      }
      XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(
          payload.recentLogs.map((log) => ({
            "Guest Name": log.guest_name,
            Action: log.action,
            "Staff Nickname": log.staff_nickname,
            Source: log.source,
            "Checked At": log.acted_at,
            Notes: log.notes ?? "",
          }))
        ),
        "Check-in Audit"
      )

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer
      const fileName = `${payload.event.event_name.replace(/[^a-zA-Z0-9-_]+/g, "_")}_attendance.xlsx`
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${fileName}"`,
        },
      })
    }

    const headers = [
      "Event Name",
      "Event Date",
      "Client",
      "Guest Name",
      "Company",
      "Designation",
      "Category",
      "Email",
      "Phone",
      "RSVP Status",
      "Table No",
      "Seat No",
      "Attendance Status",
      "Checked In At",
      "Checked In By",
      "Remarks",
    ]
    const csvBody = [
      headers.join(","),
      ...guestsRows.map((row) =>
        [
          row["Event Name"],
          row["Event Date"],
          row.Client,
          row["Guest Name"],
          row.Company,
          row.Designation,
          row.Category,
          row.Email,
          row.Phone,
          row["RSVP Status"],
          row["Table No"],
          row["Seat No"],
          row["Attendance Status"],
          row["Checked In At"],
          row["Checked In By"],
          row.Remarks,
        ]
          .map(csvEscape)
          .join(",")
      ),
    ].join("\n")

    const fileName = `${payload.event.event_name.replace(/[^a-zA-Z0-9-_]+/g, "_")}_attendance.csv`
    return new NextResponse(csvBody, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    })
  } catch {
    return NextResponse.json({ error: "Failed to export event report" }, { status: 500 })
  }
}
