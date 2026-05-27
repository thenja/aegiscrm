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
  client_name?: string | null
  client_logo_url?: string | null
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
  const [hasSearched, setHasSearched] = useState(false)
  const latestSearchRef = useRef("")

  const attendanceLabel = useMemo(() => {
    if (!eventInfo) return "-"
    return `${eventInfo.attended_guests} / ${eventInfo.total_guests}`
  }, [eventInfo])

  const notArrivedCount = useMemo(() => {
    if (!eventInfo) return 0
    return Math.max(eventInfo.total_guests - eventInfo.attended_guests, 0)
  }, [eventInfo])

  const attendancePercent = useMemo(() => {
    if (!eventInfo || eventInfo.total_guests <= 0) return "0%"
    return `${Math.round((eventInfo.attended_guests / eventInfo.total_guests) * 100)}%`
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
      setSearchText("")
      setGuests([])
      setHasSearched(false)
      setMessage("Event loaded. Start searching guests to check in.")
      setMessageTone("info")
    } catch (error) {
      setEventInfo(null)
      setGuests([])
      setHasSearched(false)
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
      const trimmed = searchText.trim()
      if (!trimmed) {
        setGuests([])
        setHasSearched(false)
        return
      }
      setHasSearched(true)
      void searchGuests(trimmed, eventCode.trim())
    }, 260)
    return () => window.clearTimeout(timer)
  }, [eventCode, eventInfo, searchGuests, searchText])

  const clearSession = useCallback(() => {
    setEventInfo(null)
    setGuests([])
    setSearchText("")
    setHasSearched(false)
    setMessage(null)
  }, [])

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#f8fafc_0%,#f8fbff_45%,#eef3fb_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-7">
        {eventInfo ? (
          <header className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 space-y-3">
                <div className="flex items-center gap-3">
                  {eventInfo.client_logo_url ? (
                    <div className="relative h-14 w-28 overflow-hidden rounded-md border border-slate-200 bg-white">
                      <Image src={eventInfo.client_logo_url} alt={`${eventInfo.client_name ?? "Client"} logo`} fill className="object-contain p-1" sizes="112px" />
                    </div>
                  ) : (
                    <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-navy">
                      {eventInfo.client_name ?? "Client"}
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Client</p>
                    <h1 className="text-xl font-semibold text-navy md:text-2xl">{eventInfo.client_name ?? "Event Check-in"}</h1>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Event</p>
                  <p className="text-lg font-semibold text-navy md:text-xl">{eventInfo.event_name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {formatDisplayDate(eventInfo.event_date)}
                    {eventInfo.venue ? ` | ${eventInfo.venue}` : ""}
                    {eventInfo.seating_mode ? ` | ${eventInfo.seating_mode}` : ""}
                  </p>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <p className="text-xs text-slate-500">Checking in as</p>
                <p className="font-semibold text-navy">{staffNickname || "-"}</p>
                <p className="text-xs text-slate-500">Event Code</p>
                <p className="font-semibold text-navy">{eventCode}</p>
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="ghost" size="sm" onClick={clearSession}>Switch Event</Button>
                  <Button type="button" variant="ghost" size="sm" onClick={clearSession}>Change Staff</Button>
                </div>
              </div>
            </div>
          </header>
        ) : (
          <header className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-24 overflow-hidden rounded-md bg-white">
                <Image src="/logo.png" alt="Aegis logo" fill className="object-contain p-1" sizes="96px" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Managed by AEGIS COMMUNICATION</p>
                <h1 className="text-xl font-semibold text-navy">Event Kiosk Check-in</h1>
              </div>
            </div>
          </header>
        )}

        {!eventInfo ? (
          <section className="rounded-xl border border-slate-200 bg-slate-50 p-4 md:p-5">
            <h2 className="text-lg font-semibold text-navy">Set Up Check-in Session</h2>
            <p className="mt-1 text-sm text-slate-600">Enter event code and staff nickname to start this kiosk session.</p>
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
              <Button type="button" onClick={loadEvent} disabled={loadingEvent} className="h-11 bg-navy hover:bg-navy/90">
                {loadingEvent ? "Loading..." : "Start Check-in"}
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-navy md:text-3xl">Search Guest</h2>
                  <p className="mt-1 text-sm text-slate-600">Search guest name, company, phone, table number or category</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Attended / Total</p>
                    <p className="text-base font-semibold text-navy">{attendanceLabel}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Not Arrived</p>
                    <p className="text-base font-semibold text-navy">{notArrivedCount}</p>
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">Attendance %</p>
                    <p className="text-base font-semibold text-navy">{attendancePercent}</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3">
                <div className="flex items-center gap-2">
                  <Search size={20} className="text-slate-500" />
                  <input
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value)}
                    placeholder="Search guest name, company, phone, table number or category"
                    className="h-14 w-full bg-transparent text-base outline-none md:text-lg"
                    disabled={!eventInfo}
                  />
                </div>
              </div>
            </section>

            <section className="mt-4 space-y-3">
              {loadingSearch ? <p className="text-sm text-slate-600">Searching guests...</p> : null}
              {!loadingSearch && !hasSearched ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-medium text-navy">Start by searching for a guest.</p>
                </div>
              ) : null}

              {!loadingSearch && hasSearched && guests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">
                  <p className="text-sm font-medium text-navy">No guests found.</p>
                  <p className="mt-1 text-xs text-slate-500">Try searching by guest name, company, phone, table number, or category.</p>
                </div>
              ) : null}

              {guests.map((guest) => (
                <article key={guest.guest_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,0.05)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-semibold text-navy">{guest.guest_name}</p>
                      <p className="mt-1 text-sm text-slate-600">{guest.company ?? "-"}</p>
                      {guest.designation ? <p className="text-sm text-slate-600">{guest.designation}</p> : null}
                      <div className="mt-2 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">{guest.category}</span>
                        {eventInfo?.seating_mode === "With Table" ? (
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-700">Table {guest.table_no ?? "-"}</span>
                        ) : null}
                      </div>
                    </div>
                    <StatusBadge status={guest.attendance_status} compact />
                  </div>

                  {guest.attendance_status === "Attended" && guest.checked_in_at ? (
                    <p className="mt-3 text-sm text-slate-600">
                      Already checked in by{" "}
                      <span className="font-medium text-navy">{guest.checked_in_by_nickname ?? "-"}</span> at{" "}
                      <span className="font-medium text-navy">{new Date(guest.checked_in_at).toLocaleString("en-MY")}</span>.
                    </p>
                  ) : null}

                  <div className="mt-4">
                    {guest.attendance_status === "Attended" ? (
                      <div className="inline-flex items-center gap-1.5 rounded-md border border-status-green/40 bg-status-green-bg px-3 py-2 text-sm font-medium text-status-green">
                        <CheckCircle2 size={15} />
                        Attended
                      </div>
                    ) : (
                      <Button
                        type="button"
                        onClick={() => void markAttended(guest.guest_id)}
                        disabled={activeGuestId === guest.guest_id || !eventInfo}
                        className="h-10 bg-navy px-4 text-sm hover:bg-navy/90"
                      >
                        {activeGuestId === guest.guest_id ? "Marking..." : "Check In Guest"}
                      </Button>
                    )}
                  </div>
                </article>
              ))}
            </section>
          </>
        )}

        {message ? (
          <p
            className={`mt-4 rounded-md border px-3 py-2 text-sm ${
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

        <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
          Managed by AEGIS COMMUNICATION
        </footer>
      </div>
    </div>
  )
}
