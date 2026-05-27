"use client"

import Image from "next/image"
import { Search, CheckCircle2, CircleCheck, Info, AlertCircle } from "lucide-react"
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

type KioskView = "search" | "list"
type ListSort = "table" | "company" | "name"
type ListStatus = "all" | "Not Arrived" | "Attended"

const KIOSK_EVENT_CODE_KEY = "aegis-kiosk-event-code"
const KIOSK_STAFF_NICKNAME_KEY = "aegis-kiosk-staff-nickname"
const CATEGORY_OPTIONS = ["all", "VIP", "Media", "Analyst", "Management", "Guest", "Staff", "Other"] as const

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
  const [activeView, setActiveView] = useState<KioskView>("search")
  const [listSort, setListSort] = useState<ListSort>("name")
  const [listStatus, setListStatus] = useState<ListStatus>("all")
  const [listCategory, setListCategory] = useState<(typeof CATEGORY_OPTIONS)[number]>("all")
  const [listGuests, setListGuests] = useState<KioskGuest[]>([])
  const [loadingList, setLoadingList] = useState(false)
  const latestSearchRef = useRef("")
  const latestViewRef = useRef<KioskView>("search")
  const latestListOptionsRef = useRef<{ sort: ListSort; status: ListStatus; category: (typeof CATEGORY_OPTIONS)[number] }>({
    sort: "name",
    status: "all",
    category: "all",
  })
  const searchInputRef = useRef<HTMLInputElement | null>(null)

  const attendanceLabel = useMemo(() => {
    if (!eventInfo) return "-"
    return `${eventInfo.attended_guests} / ${eventInfo.total_guests}`
  }, [eventInfo])

  useEffect(() => {
    latestViewRef.current = activeView
  }, [activeView])

  useEffect(() => {
    latestListOptionsRef.current = {
      sort: listSort,
      status: listStatus,
      category: listCategory,
    }
  }, [listSort, listStatus, listCategory])

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
      // Sync URL-provided event code into kiosk session bootstrap state.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const loadEvent = useCallback(async (options?: { preserveView?: boolean; silent?: boolean; explicitEventCode?: string; explicitStaffNickname?: string }) => {
    const resolvedEventCode = (options?.explicitEventCode ?? eventCode).trim()
    const resolvedStaffNickname = (options?.explicitStaffNickname ?? staffNickname).trim()

    if (resolvedEventCode.length < 4) {
      setMessage("Please enter a valid event code.")
      setMessageTone("error")
      return
    }

    if (resolvedStaffNickname.length < 2) {
      setMessage("Staff nickname is required.")
      setMessageTone("error")
      return
    }

    setLoadingEvent(true)
    if (!options?.silent) {
      setMessage(null)
    }
    try {
      const response = await fetch(`/api/events/kiosk/event?event_code=${encodeURIComponent(resolvedEventCode)}`)
      const payload = (await response.json()) as { event?: KioskEvent; error?: string }
      if (!response.ok || !payload.event) {
        throw new Error(payload.error ?? "Event not found.")
      }

      if (resolvedEventCode !== eventCode) {
        setEventCode(resolvedEventCode.toUpperCase())
      }
      if (resolvedStaffNickname !== staffNickname) {
        setStaffNickname(resolvedStaffNickname)
      }
      setEventInfo(payload.event)
      if (!options?.preserveView) {
        setSearchText("")
        setGuests([])
        setHasSearched(false)
        setListStatus("all")
        setListCategory("all")
        setListSort(payload.event.seating_mode === "With Table" ? "table" : "name")
      }
      if (!options?.silent) {
        setMessage("Event loaded. Start searching guests to check in.")
        setMessageTone("info")
      }
      if (typeof window !== "undefined") {
        window.localStorage.setItem(KIOSK_EVENT_CODE_KEY, resolvedEventCode.toUpperCase())
        window.localStorage.setItem(KIOSK_STAFF_NICKNAME_KEY, resolvedStaffNickname)
      }
    } catch (error) {
      setEventInfo(null)
      setGuests([])
      setHasSearched(false)
      if (!options?.silent) {
        setMessage(error instanceof Error ? error.message : "Failed to load event.")
        setMessageTone("error")
      }
    } finally {
      setLoadingEvent(false)
    }
  }, [eventCode, staffNickname])

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
        setSearchText("")
        setGuests([])
        setHasSearched(false)
      } else if ("ok" in payload && !payload.ok) {
        if (payload.checked_in_by_nickname && payload.checked_in_at) {
          const at = new Date(payload.checked_in_at).toLocaleString("en-MY")
          setMessage(`Already checked in by ${payload.checked_in_by_nickname} at ${at}.`)
        } else {
          setMessage(payload.message)
        }
        setMessageTone("info")
      }

      const currentQuery = searchText.trim()
      if (currentQuery && !("ok" in payload && payload.ok)) {
        await searchGuests(currentQuery, eventCode.trim())
      }
      await loadEvent({ preserveView: true, silent: true })
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

  useEffect(() => {
    if (!eventInfo) return
    const timer = window.setTimeout(() => {
      searchInputRef.current?.focus()
    }, 30)
    return () => window.clearTimeout(timer)
  }, [eventInfo])

  useEffect(() => {
    if (typeof window === "undefined") return
    const fromQuery = searchParams.get("event_code")?.trim().toUpperCase()
    const persistedEventCode = window.localStorage.getItem(KIOSK_EVENT_CODE_KEY)?.trim().toUpperCase()
    const persistedStaffNickname = window.localStorage.getItem(KIOSK_STAFF_NICKNAME_KEY)?.trim()
    const restoredEventCode = fromQuery || persistedEventCode

    if (restoredEventCode && persistedStaffNickname && persistedStaffNickname.length > 1) {
      // Sync persisted kiosk session back into local state on mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEventCode(restoredEventCode)
      setStaffNickname(persistedStaffNickname)
      void loadEvent({
        explicitEventCode: restoredEventCode,
        explicitStaffNickname: persistedStaffNickname,
        preserveView: true,
        silent: true,
      })
    }
  }, [loadEvent, searchParams])

  const eventIdForChannel = eventInfo?.event_id
  const loadListGuests = useCallback(
    async (options?: { sort?: ListSort; status?: ListStatus; category?: (typeof CATEGORY_OPTIONS)[number]; eventCodeOverride?: string }) => {
      const resolvedEventCode = (options?.eventCodeOverride ?? eventCode).trim()
      if (!resolvedEventCode) {
        setListGuests([])
        return
      }
      const sort = options?.sort ?? listSort
      const status = options?.status ?? listStatus
      const category = options?.category ?? listCategory
      setLoadingList(true)
      try {
        const response = await fetch(
          `/api/events/kiosk/guests?event_code=${encodeURIComponent(resolvedEventCode)}&sort=${encodeURIComponent(sort)}&status=${encodeURIComponent(status)}&category=${encodeURIComponent(category)}`
        )
        const payload = (await response.json()) as { guests?: KioskGuest[]; error?: string }
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load attendance list.")
        }
        setListGuests(payload.guests ?? [])
      } catch {
        setListGuests([])
      } finally {
        setLoadingList(false)
      }
    },
    [eventCode, listCategory, listSort, listStatus]
  )

  const refreshActiveView = useCallback(() => {
    const currentQuery = latestSearchRef.current.trim()
    if (latestViewRef.current === "search" && currentQuery) {
      void searchGuests(currentQuery, eventCode.trim())
    }
    if (latestViewRef.current === "list") {
      const options = latestListOptionsRef.current
      void loadListGuests({ sort: options.sort, status: options.status, category: options.category, eventCodeOverride: eventCode.trim() })
    }
    void loadEvent({ preserveView: true, silent: true })
  }, [eventCode, loadEvent, loadListGuests, searchGuests])

  useEffect(() => {
    if (!eventIdForChannel) return
    const supabase = createClient()
    const channel = supabase
      .channel(`kiosk-event-${eventIdForChannel}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_guests", filter: `event_id=eq.${eventIdForChannel}` },
        refreshActiveView
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "event_guests", filter: `event_id=eq.${eventIdForChannel}` },
        refreshActiveView
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "event_guests", filter: `event_id=eq.${eventIdForChannel}` },
        refreshActiveView
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [eventIdForChannel, refreshActiveView])

  useEffect(() => {
    if (!eventInfo) return
    const interval = window.setInterval(() => {
      refreshActiveView()
    }, 8000)
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        refreshActiveView()
      }
    }
    window.addEventListener("focus", refreshActiveView)
    document.addEventListener("visibilitychange", onVisible)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener("focus", refreshActiveView)
      document.removeEventListener("visibilitychange", onVisible)
    }
  }, [eventInfo, refreshActiveView])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!eventInfo) return
      if (activeView !== "search") return
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
  }, [activeView, eventCode, eventInfo, searchGuests, searchText])

  const clearSession = useCallback(() => {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(KIOSK_EVENT_CODE_KEY)
      window.localStorage.removeItem(KIOSK_STAFF_NICKNAME_KEY)
    }
    setEventCode("")
    setStaffNickname("")
    setEventInfo(null)
    setGuests([])
    setListGuests([])
    setSearchText("")
    setHasSearched(false)
    setMessage(null)
  }, [])

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#f8fafc_0%,#f4f8fb_45%,#ecf4f6_100%)] p-4 md:p-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_18px_40px_rgba(15,23,42,0.08)] md:p-7">
        {eventInfo ? (
          <header className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-2">
                <div className="flex items-center gap-3">
                  {eventInfo.client_logo_url ? (
                    <div className="relative h-14 w-28 overflow-hidden rounded-md border border-slate-200 bg-white">
                      <Image src={eventInfo.client_logo_url} alt={`${eventInfo.client_name ?? "Client"} logo`} fill className="object-contain p-1" sizes="112px" />
                    </div>
                  ) : null}
                  <div>
                    {eventInfo.client_name ? (
                      <p className="text-xl font-semibold text-navy md:text-2xl">{eventInfo.client_name}</p>
                    ) : null}
                    <h1 className="text-xl font-semibold text-navy md:text-2xl">{eventInfo.event_name}</h1>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-slate-600">
                    {formatDisplayDate(eventInfo.event_date)}
                    {eventInfo.venue ? ` · ${eventInfo.venue}` : ""}
                    {eventInfo.seating_mode === "With Table" ? " · With Table" : ""}
                  </p>
                </div>
              </div>
              <div className="sticky top-3 self-start rounded-full border border-slate-200 bg-slate-50/90 px-3 py-2 text-xs text-slate-700">
                <span className="font-medium text-slate-600">Checking in as:</span>{" "}
                <span className="font-semibold text-navy">{staffNickname || "-"}</span>
                <span className="mx-1.5 text-slate-400">·</span>
                <span className="font-medium text-slate-600">Event Code:</span>{" "}
                <span className="font-semibold text-navy">{eventCode}</span>
                <span className="mx-1.5 text-slate-400">·</span>
                <button type="button" onClick={clearSession} className="font-semibold text-navy hover:underline">Switch</button>
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
              <Button type="button" onClick={() => void loadEvent()} disabled={loadingEvent} className="h-11 bg-navy hover:bg-navy/90">
                {loadingEvent ? "Loading..." : "Start Check-in"}
              </Button>
            </div>
          </section>
        ) : (
          <>
            <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4 md:p-5">
              <div className="mb-4 inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setActiveView("search")}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeView === "search" ? "bg-white text-navy shadow-sm" : "text-slate-600 hover:text-navy"}`}
                >
                  Search Guest
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("list")
                    if (eventInfo) {
                      void loadListGuests()
                    }
                  }}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium ${activeView === "list" ? "bg-white text-navy shadow-sm" : "text-slate-600 hover:text-navy"}`}
                >
                  Attendance List
                </button>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-semibold text-navy md:text-3xl">{activeView === "search" ? "Guest Check-in" : "Attendance List"}</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {activeView === "search"
                      ? "Search by guest name, company, phone, table number or category."
                      : "Browse and update attendance by sort and filters."}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-700">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-navy">{attendanceLabel} Checked In</span>
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-medium text-navy">{notArrivedCount} Not Arrived</span>
                  <span className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1.5 font-medium text-navy">{attendancePercent} Attendance</span>
                </div>
              </div>

              {activeView === "search" ? (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-3 shadow-[inset_0_1px_2px_rgba(15,23,42,0.04)]">
                  <div className="flex items-center gap-2">
                    <Search size={20} className="text-slate-500" />
                    <input
                      ref={searchInputRef}
                      value={searchText}
                      onChange={(event) => setSearchText(event.target.value)}
                      placeholder="Search guest name, company, phone, table number or category"
                      className="h-14 w-full bg-transparent text-base outline-none md:text-lg"
                      disabled={!eventInfo}
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <select
                    value={listSort}
                    onChange={(event) => {
                      const nextSort = event.target.value as ListSort
                      setListSort(nextSort)
                      void loadListGuests({ sort: nextSort })
                    }}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    {eventInfo?.seating_mode === "With Table" ? <option value="table">Sort: Table No</option> : null}
                    <option value="company">Sort: Company</option>
                    <option value="name">Sort: A-Z Name</option>
                  </select>
                  <select
                    value={listStatus}
                    onChange={(event) => {
                      const nextStatus = event.target.value as ListStatus
                      setListStatus(nextStatus)
                      void loadListGuests({ status: nextStatus })
                    }}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="all">Status: All</option>
                    <option value="Not Arrived">Status: Not Arrived</option>
                    <option value="Attended">Status: Attended</option>
                  </select>
                  <select
                    value={listCategory}
                    onChange={(event) => {
                      const nextCategory = event.target.value as (typeof CATEGORY_OPTIONS)[number]
                      setListCategory(nextCategory)
                      void loadListGuests({ category: nextCategory })
                    }}
                    className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"
                  >
                    <option value="all">Category: All</option>
                    {CATEGORY_OPTIONS.filter((category) => category !== "all").map((category) => (
                      <option key={category} value={category}>
                        Category: {category}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>

            <section className="mt-4 space-y-3">
              {activeView === "search" && loadingSearch ? <p className="text-sm text-slate-600">Searching guests...</p> : null}
              {activeView === "search" && !loadingSearch && !hasSearched ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <p className="text-sm font-medium text-navy">Search for a guest to begin check-in.</p>
                </div>
              ) : null}

              {activeView === "search" && !loadingSearch && hasSearched && guests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <p className="text-sm font-medium text-navy">No matching guest found.</p>
                  <p className="mt-1 text-xs text-slate-500">Try searching by guest name, company, phone, table number, or category.</p>
                </div>
              ) : null}

              {activeView === "search"
                ? guests.map((guest) => (
                    <article key={guest.guest_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
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
                            {activeGuestId === guest.guest_id ? "Marking..." : "Mark Attended"}
                          </Button>
                        )}
                      </div>
                    </article>
                  ))
                : null}

              {activeView === "list" && loadingList ? <p className="text-sm text-slate-600">Loading attendance list...</p> : null}
              {activeView === "list" && !loadingList && listGuests.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center">
                  <p className="text-sm font-medium text-navy">No guests found for current filters.</p>
                </div>
              ) : null}

              {activeView === "list"
                ? listGuests.map((guest) => (
                <article key={guest.guest_id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_6px_18px_rgba(15,23,42,0.05)]">
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
                        {activeGuestId === guest.guest_id ? "Marking..." : "Mark Attended"}
                      </Button>
                    )}
                  </div>
                </article>
                  ))
                : null}
            </section>
          </>
        )}

        {message ? (
          <div
            className={`mt-4 flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
              messageTone === "success"
                ? "border-status-green/40 bg-status-green-bg text-status-green"
                : messageTone === "error"
                  ? "border-status-red/40 bg-status-red-bg text-status-red"
                  : "border-status-blue/40 bg-status-blue-bg text-status-blue"
            }`}
          >
            {messageTone === "success" ? <CircleCheck size={16} className="mt-0.5" /> : null}
            {messageTone === "error" ? <AlertCircle size={16} className="mt-0.5" /> : null}
            {messageTone === "info" ? <Info size={16} className="mt-0.5" /> : null}
            <p>{message}</p>
          </div>
        ) : null}

        <footer className="mt-6 border-t border-slate-200 pt-3 text-center text-xs text-slate-500">
          Powered by AEGIS COMMUNICATION
        </footer>
      </div>
    </div>
  )
}
