"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FilterBar, PillBadge } from "@/components/ui/patterns"
import { withFeedback } from "@/lib/action-feedback"
import { EVENT_DUPLICATE_MODES, type EventDuplicateMode } from "@/types/domain"

type ImportPreviewResponse = {
  file_name: string
  total_rows: number
  valid_rows: number
  invalid_rows: number
  duplicate_rows: number
  rows: Array<{
    guest_name: string
    company: string | null
    designation: string | null
    category: string
    email: string | null
    phone: string | null
    rsvp_status: string
    table_no: string | null
    seat_no: string | null
    remarks: string | null
  }>
  duplicate_rows_info: Array<{
    row_number: number
    guest_name: string
    company: string | null
    reason: string
  }>
  invalid_rows_info: Array<{
    row_number: number
    error: string
  }>
}

export function EventImportPanel({
  eventId,
  returnTo,
}: {
  eventId: string
  returnTo: string
}) {
  const router = useRouter()
  const [file, setFile] = useState<File | null>(null)
  const [duplicateMode, setDuplicateMode] = useState<EventDuplicateMode>("Skip Duplicate")
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [loadingCommit, setLoadingCommit] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)

  const canCommit = useMemo(
    () => Boolean(preview && preview.rows.length > 0 && !loadingCommit),
    [preview, loadingCommit]
  )

  async function runPreview() {
    if (!file) {
      setPreviewError("Please select an Excel file.")
      return
    }

    setLoadingPreview(true)
    setPreviewError(null)
    setPreview(null)

    try {
      const formData = new FormData()
      formData.set("event_id", eventId)
      formData.set("file", file)

      const response = await fetch("/api/events/import/preview", {
        method: "POST",
        body: formData,
      })

      const payload = (await response.json()) as ImportPreviewResponse | { error: string }
      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Preview failed")
      }

      setPreview(payload)
    } catch (error) {
      setPreviewError(error instanceof Error ? error.message : "Failed to preview import.")
    } finally {
      setLoadingPreview(false)
    }
  }

  async function commitImport() {
    if (!preview) return
    setLoadingCommit(true)

    try {
      const response = await fetch("/api/events/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          file_name: preview.file_name,
          duplicate_mode: duplicateMode,
          rows: preview.rows,
        }),
      })
      const payload = (await response.json()) as
        | { ok: true; imported_rows: number; skipped_rows: number; duplicate_rows: number }
        | { error: string }

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Import failed")
      }

      const message = `Import completed. ${payload.imported_rows} row(s) imported, ${payload.skipped_rows} skipped.`
      window.location.href = withFeedback(returnTo, "success", message)
    } catch (error) {
      window.location.href = withFeedback(
        returnTo,
        "error",
        error instanceof Error ? error.message : "Failed to import guest list."
      )
    } finally {
      setLoadingCommit(false)
      router.refresh()
    }
  }

  return (
    <div className="space-y-3">
      <FilterBar>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            className="md:col-span-2"
          />
          <select
            value={duplicateMode}
            onChange={(event) => setDuplicateMode(event.target.value as EventDuplicateMode)}
            className="h-10 rounded-md border border-border px-3 text-sm"
          >
            {EVENT_DUPLICATE_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {mode}
              </option>
            ))}
          </select>
          <Button type="button" variant="secondary" onClick={runPreview} disabled={loadingPreview}>
            {loadingPreview ? "Previewing..." : "Preview Import"}
          </Button>
        </div>
      </FilterBar>

      {previewError ? (
        <p className="rounded-md border border-status-red/40 bg-status-red-bg px-3 py-2 text-sm text-status-red">
          {previewError}
        </p>
      ) : null}

      {preview ? (
        <div className="space-y-3 rounded-lg border border-border/90 bg-white/90 p-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <PillBadge label={`Total: ${preview.total_rows}`} compact />
            <PillBadge label={`Valid: ${preview.valid_rows}`} tone="green" compact />
            <PillBadge label={`Invalid: ${preview.invalid_rows}`} tone={preview.invalid_rows > 0 ? "red" : "neutral"} compact />
            <PillBadge label={`Duplicates: ${preview.duplicate_rows}`} tone={preview.duplicate_rows > 0 ? "amber" : "neutral"} compact />
          </div>

          {preview.duplicate_rows_info.length > 0 ? (
            <div className="rounded-md border border-status-amber/40 bg-status-amber-bg px-3 py-2 text-xs text-status-amber">
              <p className="font-semibold">Duplicate warning detected.</p>
              <p className="mt-1">Choose “Skip Duplicate” or “Import Anyway”. Showing first 8 rows:</p>
              <ul className="mt-1 list-disc pl-5">
                {preview.duplicate_rows_info.slice(0, 8).map((row) => (
                  <li key={`${row.row_number}-${row.reason}`}>
                    Row {row.row_number}: {row.guest_name}
                    {row.company ? ` (${row.company})` : ""} - {row.reason.replaceAll("_", " ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {preview.invalid_rows_info.length > 0 ? (
            <div className="rounded-md border border-status-red/40 bg-status-red-bg px-3 py-2 text-xs text-status-red">
              <p className="font-semibold">Invalid row(s) found.</p>
              <ul className="mt-1 list-disc pl-5">
                {preview.invalid_rows_info.slice(0, 8).map((row) => (
                  <li key={`${row.row_number}-${row.error}`}>
                    Row {row.row_number}: {row.error}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="flex items-center gap-2">
            <Button type="button" onClick={commitImport} disabled={!canCommit}>
              {loadingCommit ? "Importing..." : "Import Guest List"}
            </Button>
            <p className="text-xs text-text-secondary">Import uses fixed template columns and logs import batch record.</p>
          </div>
        </div>
      ) : null}
    </div>
  )
}
