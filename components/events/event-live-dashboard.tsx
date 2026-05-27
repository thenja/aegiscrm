"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PillBadge, SectionCard } from "@/components/ui/patterns"
import { StatusBadge } from "@/components/ui/status-badge"
import { createClient } from "@/lib/supabase/browser"
import { formatDisplayDate } from "@/lib/date"
import type { EventLiveData } from "@/lib/data/events"

type LivePayload = EventLiveData

export function EventLiveDashboard({
  eventId,
  initialData,
}: {
  eventId: string
  initialData: LivePayload
}) {
  const [data, setData] = useState<LivePayload>(initialData)
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(false)
  const latestQueryRef = useRef("")

  useEffect(() => {
    latestQueryRef.current = query
  }, [query])

  const refreshLiveData = useCallback(async (searchText?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchText && searchText.trim().length > 0) params.set("query", searchText.trim())
      const response = await fetch(`/api/events/${eventId}/live?${params.toString()}`, {
        method: "GET",
        credentials: "same-origin",
      })
      if (!response.ok) throw new Error("Failed to refresh live data")
      const payload = (await response.json()) as LivePayload
      setData(payload)
    } catch {
      // no-op: keep last known state for event-day continuity
    } finally {
      setLoading(false)
    }
  }, [eventId])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (query.trim().length === 0) {
        void refreshLiveData("")
      } else {
        void refreshLiveData(query)
      }
    }, 280)
    return () => window.clearTimeout(timer)
  }, [query, refreshLiveData])

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`event-guests-live-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_guests", filter: `event_id=eq.${eventId}` },
        () => {
          void refreshLiveData(latestQueryRef.current)
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "event_guests", filter: `event_id=eq.${eventId}` },
        () => {
          void refreshLiveData(latestQueryRef.current)
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "event_guests", filter: `event_id=eq.${eventId}` },
        () => {
          void refreshLiveData(latestQueryRef.current)
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventId, refreshLiveData])

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshLiveData(latestQueryRef.current)
    }, 8000)
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void refreshLiveData(latestQueryRef.current)
      }
    }
    window.addEventListener("focus", onVisible)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", onVisible)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [refreshLiveData])

  const summaryCards = useMemo(
    () => [
      { label: "Total Guests", value: data.summary.totalGuests },
      { label: "Attended", value: data.summary.attendedGuests },
      { label: "Not Arrived", value: data.summary.notArrivedGuests },
      { label: "Attendance Rate", value: `${data.summary.attendanceRate}%` },
    ],
    [data.summary]
  )

  return (
    <div className="space-y-4">
      <SectionCard title="Live Attendance Summary">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          {summaryCards.map((card) => (
            <div key={card.label} className="rounded-md border border-border/80 bg-white/92 p-2.5">
              <p className="text-[11px] uppercase tracking-wide text-text-secondary">{card.label}</p>
              <p className="mt-1 text-base font-semibold text-navy">{card.value}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Guest Monitor" description="Search by guest, company, phone, table, or category.">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 md:flex-row">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search guest / company / phone / table / category"
              className="md:max-w-lg"
            />
            <Button type="button" variant="secondary" size="sm" onClick={() => void refreshLiveData(query)}>
              Refresh
            </Button>
            {loading ? <p className="text-xs text-text-secondary">Updating...</p> : null}
          </div>

          <div className="space-y-2">
            {data.guests.slice(0, 60).map((guest) => (
              <article key={guest.guest_id} className="rounded-md border border-border/80 bg-white/92 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{guest.guest_name}</p>
                    <p className="text-xs text-text-secondary">
                      {guest.company ?? "-"} | {guest.category}
                      {data.event.seating_mode === "With Table" ? ` | Table ${guest.table_no ?? "-"}` : ""}
                    </p>
                  </div>
                  <StatusBadge status={guest.attendance_status} compact />
                </div>
                {guest.attendance_status === "Attended" ? (
                  <p className="mt-1 text-xs text-text-secondary">
                    Checked in by <span className="font-medium text-text-primary">{guest.checked_in_by_nickname ?? "-"}</span>{" "}
                    at <span className="font-medium text-text-primary">{guest.checked_in_at ? new Date(guest.checked_in_at).toLocaleString("en-MY") : "-"}</span>
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Recent Check-ins">
        {data.recentLogs.length === 0 ? (
          <p className="text-sm text-text-secondary">No attendance actions yet.</p>
        ) : (
          <div className="space-y-2">
            {data.recentLogs.map((log) => (
              <article key={log.attendance_log_id} className="rounded-md border border-border/80 bg-white/92 p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-navy">{log.guest_name}</p>
                    <p className="text-xs text-text-secondary">
                      {log.action} by {log.staff_nickname} at {formatDisplayDate(log.acted_at.slice(0, 10))}
                    </p>
                  </div>
                  <PillBadge label={log.source} compact />
                </div>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
