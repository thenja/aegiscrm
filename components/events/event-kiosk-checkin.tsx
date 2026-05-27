"use client"

import Image from "next/image"
import { Search, CheckCircle2 } from "lucide-react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StatusBadge } from "@/components/ui/status-badge"
import { createClient } from "@/lib/supabase/browser"
import { formatDisplayDate } from "@/lib/date"

type KioskEvent = {
  event_id: string
  event_name: string
  event_date: string
  venue: string | null
  seating_mode: string
  status: string
  total_guests: number
  attended_guests: number
}

type KioskGuest = {
  guest_id: string
  event_id: string
  guest_name: string
  company: string | null
  designation: string | null
  category: string
  table_no: string | null
  attendance_status: string
  checked_in_at: string | null
  checked_in_by_nickname: string | null
}

function sessionId() {
  if (typeof window === "undefined") return "kiosk-session"
  const key = "aegis-kiosk-session-id"
  const existing = window.localStorage.getItem(key)
  if (existing) return existing
  const id = `kiosk-${Math.random().toString(36).slice(2, 10)}`
  window.localStorage.setItem(key, id)
  return id
}

export function EventKioskCheckin() {
  const searchParams = useSearchParams()
  const [eventCode, setEventCode] = useState("")
  const [staffNickname, setStaffNickname] = useState("")
  const [eventInfo, setEventInfo] = useState<KioskEvent | null>(null)
  const [guests, setGuests] = useState<KioskGuest[]>([])
  const [searchText, setSearchText] = useState("")
  const [loadingEvent, setLoadingEvent] = useState(false)
  const [loadingSearch, setLoadingSearch] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageTone, setMessageTone] = useState<"success" | "error" | "info">("info")
  const [activeGuestId, setActiveGuestId] = useState<string | null>(null)
  const latestSearchRef = useRef("")

  const attendanceLabel = useMemo(() => {
    if (!eventInfo) return "-"
    return `${eventInfo.attended_guests} / ${eventInfo.total_guests}`
  }, [eventInfo])

  useEffect(() => {
    const fromQuery = searchParams.get("event_code")
    if (fromQuery && fromQuery.trim().length > 0) {
      setEventCode(fromQuery.trim().toUpperCase())
    }
  }, [searchParams])

  const searchGuests = useCallback(async (query: string, providedEventCode?: string) => {
    const resolvedEventCode = (providedEventCode ?? eventCode).trim()
    if (!resolvedEventCode) {
      setGuests([])
      return
    }
    setLoadingSearch(true)
    try {
      const response = await fetch(
        `/api/events/kiosk/search?event_code=${encodeURIComponent(resolvedEventCode)}&q=${encodeURIComponent(query)}`
      )
      const payload = (await response.json()) as { guests?: KioskGuest[]; error?: string }
      if (!response.ok) {
        throw new Error(payload.error ?? "Search failed.")
      }
      setGuests(payload.guests ?? [])
    } catch {
      setGuests([])
    } finally {
      setLoadingSearch(false)
    }
  }, [eventCode])

  const loadEvent = useCallback(async () => {
    if (eventCode.trim().length < 4) {
      setMessage("Please enter a valid event code.")
      setMessageTone("error")
      return
    }

    if (staffNickname.trim().length < 2) {
      setMessage("Staff nickname is required.")
      setMessageTone("error")
      return
    }

    setLoadingEvent(true)
    setMessage(null)
    try {
      const response = await fetch(`/api/events/kiosk/event?event_code=${encodeURIComponent(eventCode.trim())}`)
      const payload = (await response.json()) as { event?: KioskEvent; error?: string }
      if (!response.ok || !payload.event) {
        throw new Error(payload.error ?? "Event not found.")
      }

      setEventInfo(payload.event)
      setMessage("Event loaded. Start searching guests to check in.")
      setMessageTone("info")
      await searchGuests("", eventCode.trim())
    } catch (error) {
      setEventInfo(null)
      setGuests([])
      setMessage(error instanceof Error ? error.message : "Failed to load event.")
      setMessageTone("error")
    } finally {
      setLoadingEvent(false)
    }
  }, [eventCode, searchGuests, staffNickname])

  const markAttended = useCallback(async (guestId: string) => {
    if (!eventInfo) return
    setActiveGuestId(guestId)
    setMessage(null)
    try {
      const response = await fetch("/api/events/kiosk/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_code: eventCode.trim(),
          staff_nickname: staffNickname.trim(),
          guest_id: guestId,
          session_id: sessionId(),
          device_info: typeof navigator !== "undefined" ? navigator.userAgent : null,
        }),
      })
      const payload = (await response.json()) as
        | { ok: true; message: string }
        | { ok: false; message: string; checked_in_by_nickname?: string; checked_in_at?: string }
        | { error: string }

      if (!response.ok || "error" in payload) {
        throw new Error("error" in payload ? payload.error : "Check-in failed.")
      }

      if ("ok" in payload && payload.ok) {
        setMessage("Check-in recorded successfully.")
        setMessageTone("success")
      } else if ("ok" in payload && !payload.ok) {
        if (payload.checked_in_by_nickname && payload.checked_in_at) {
          const at = new Date(payload.checked_in_at).toLocaleString("en-MY")
          setMessage(`Already checked in by ${payload.checked_in_by_nickname} at ${at}.`)
        } else {
          setMessage(payload.message)
        }
        setMessageTone("info")
      }

      await searchGuests(searchText.trim(), eventCode.trim())
      await loadEvent()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to mark attended.")
      setMessageTone("error")
    } finally {
      setActiveGuestId(null)
    }
  }, [eventCode, eventInfo, loadEvent, searchGuests, searchText, staffNickname])

  useEffect(() => {
    latestSearchRef.current = searchText
  }, [searchText])

  const eventIdForChannel = eventInfo?.event_id

  useEffect(() => {
    if (!eventIdForChannel) return
    const supabase = createClient()
    const channel = supabase
      .channel(`kiosk-event-${eventIdForChannel}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "event_guests", filter: `event_id=eq.${eventIdForChannel}` },
        () => {
          void searchGuests(latestSearchRef.current.trim())
          void loadEvent()
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventIdForChannel, loadEvent, searchGuests])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!eventInfo) return
      void searchGuests(searchText.trim(), eventCode.trim())
    }, 260)
    return () => window.clearTimeout(timer)
  }, [eventCode, eventInfo, searchGuests, searchText])

  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#f8fafc_0%,#eef2ff_50%,#ecfeff_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-5xl rounded-2xl border border-border/80 bg-white/95 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.12)] backdrop-blur-sm md:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="relative h-12 w-28 overflow-hidden rounded-md bg-white">
              <Image
                src="/logo.png"
                alt="Aegis logo"
                fill
                className="object-contain p-1"
                sizes="112px"
              />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-text-secondary">AEGIS COMMUNICATION</p>
              <h1 className="text-lg font-semibold text-navy md:text-xl">Event Registration</h1>
            </div>
          </div>
          {eventInfo ? (
            <div className="rounded-lg border border-border bg-slate-50 px-3 py-2 text-sm">
              <p className="text-xs text-text-secondary">Attended / Total</p>
              <p className="text-base font-semibold text-navy">{attendanceLabel}</p>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <Input
            value={eventCode}
            onChange={(event) => setEventCode(event.target.value.toUpperCase())}
            placeholder="Event Code"
            className="h-11 text-base"
          />
          <Input
            value={staffNickname}
            onChange={(event) => setStaffNickname(event.target.value)}
            placeholder="Staff Nickname"
            className="h-11 text-base"
          />
          <Button type="button" onClick={loadEvent} disabled={loadingEvent} className="h-11">
            {loadingEvent ? "Loading..." : "Start Check-in"}
          </Button>
        </div>

        {eventInfo ? (
          <div className="mt-4 rounded-lg border border-border bg-slate-50 p-3">
            <p className="text-sm font-semibold text-navy">{eventInfo.event_name}</p>
            <p className="text-sm text-text-secondary">
              {formatDisplayDate(eventInfo.event_date)}
              {eventInfo.venue ? ` | ${eventInfo.venue}` : ""}
              {" | "}Staff: <span className="font-medium text-text-primary">{staffNickname || "-"}</span>
            </p>
          </div>
        ) : null}

        <div className="mt-4 rounded-lg border border-border/80 bg-white p-3">
          <div className="flex items-center gap-2 rounded-md border border-border bg-white px-3">
            <Search size={18} className="text-text-secondary" />
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Search guest name, company, phone, table number, or category"
              className="h-12 w-full bg-transparent text-base outline-none"
              disabled={!eventInfo}
            />
          </div>
        </div>

        {message ? (
          <p
            className={`mt-3 rounded-md border px-3 py-2 text-sm ${
              messageTone === "success"
                ? "border-status-green/40 bg-status-green-bg text-status-green"
                : messageTone === "error"
                  ? "border-status-red/40 bg-status-red-bg text-status-red"
                  : "border-status-blue/40 bg-status-blue-bg text-status-blue"
            }`}
          >
            {message}
          </p>
        ) : null}

        <div className="mt-4 space-y-2">
          {loadingSearch ? <p className="text-sm text-text-secondary">Searching guests...</p> : null}
          {!loadingSearch && guests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border bg-slate-50 p-4 text-center">
              <p className="text-sm font-medium text-navy">No guests found.</p>
              <p className="mt-1 text-xs text-text-secondary">Try searching by guest name, company, phone, table number, or category.</p>
            </div>
          ) : null}

          {guests.map((guest) => (
            <article key={guest.guest_id} className="rounded-lg border border-border/80 bg-white p-3 shadow-[0_2px_8px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-base font-semibold text-navy">{guest.guest_name}</p>
                  <p className="text-sm text-text-secondary">
                    {guest.company ?? "-"}
                    {guest.designation ? ` | ${guest.designation}` : ""}
                    {" | "}{guest.category}
                    {eventInfo?.seating_mode === "With Table" ? ` | Table ${guest.table_no ?? "-"}` : ""}
                  </p>
                </div>
                <StatusBadge status={guest.attendance_status} compact />
              </div>

              {guest.attendance_status === "Attended" && guest.checked_in_at ? (
                <p className="mt-2 text-sm text-text-secondary">
                  Already checked in by{" "}
                  <span className="font-medium text-text-primary">{guest.checked_in_by_nickname ?? "-"}</span> at{" "}
                  <span className="font-medium text-text-primary">{new Date(guest.checked_in_at).toLocaleString("en-MY")}</span>.
                </p>
              ) : null}

              <div className="mt-3">
                {guest.attendance_status === "Attended" ? (
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-status-green/40 bg-status-green-bg px-2.5 py-1.5 text-sm font-medium text-status-green">
                    <CheckCircle2 size={15} />
                    Attended
                  </div>
                ) : (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void markAttended(guest.guest_id)}
                    disabled={activeGuestId === guest.guest_id || !eventInfo}
                  >
                    {activeGuestId === guest.guest_id ? "Marking..." : "Mark Attended"}
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  )
}
