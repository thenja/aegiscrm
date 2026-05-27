import { createClient } from "@/lib/supabase/server"
import type {
  EventAttendanceLogRow,
  EventGuestRow,
  EventRow,
  EventGuestCategory,
  EventGuestAttendanceStatus,
} from "@/types/domain"

type EventFilters = {
  client_id?: string
  status?: string
  query?: string
}

type EventGuestFilters = {
  query?: string
  category?: string
  attendance_status?: string
}

export type EventViewRow = EventRow & {
  client_name: string
  created_by_name: string
  total_guests: number
  attended_guests: number
}

export type EventGuestViewRow = EventGuestRow

export type EventAttendanceLogViewRow = EventAttendanceLogRow & {
  guest_name: string
}

export type EventAttendanceSummary = {
  totalGuests: number
  attendedGuests: number
  notArrivedGuests: number
  attendanceRate: number
  byCategory: Array<{
    category: EventGuestCategory
    total: number
    attended: number
  }>
  byTable: Array<{
    tableNo: string
    total: number
    attended: number
  }>
}

export type EventLiveData = {
  event: EventViewRow
  summary: EventAttendanceSummary
  guests: EventGuestViewRow[]
  recentLogs: EventAttendanceLogViewRow[]
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase()
}

function matchesGuestQuery(guest: EventGuestRow, rawQuery?: string) {
  const query = normalize(rawQuery)
  if (!query) return true

  const haystack = [
    guest.guest_name,
    guest.company ?? "",
    guest.designation ?? "",
    guest.phone ?? "",
    guest.table_no ?? "",
    guest.category,
  ]
    .join(" ")
    .toLowerCase()

  return haystack.includes(query)
}

function sortGuestsForOps(a: EventGuestRow, b: EventGuestRow) {
  if (a.attendance_status !== b.attendance_status) {
    return a.attendance_status === "Not Arrived" ? -1 : 1
  }

  const aTime = a.checked_in_at ?? ""
  const bTime = b.checked_in_at ?? ""
  if (aTime !== bTime) return bTime.localeCompare(aTime)
  return a.guest_name.localeCompare(b.guest_name)
}

function toAttendanceSummary(event: EventRow, guests: EventGuestRow[]): EventAttendanceSummary {
  const totalGuests = guests.length
  const attendedGuests = guests.filter((guest) => guest.attendance_status === "Attended").length
  const notArrivedGuests = totalGuests - attendedGuests

  const categoryMap = new Map<EventGuestCategory, { total: number; attended: number }>()
  const tableMap = new Map<string, { total: number; attended: number }>()

  guests.forEach((guest) => {
    const category = guest.category
    const categoryBucket = categoryMap.get(category) ?? { total: 0, attended: 0 }
    categoryBucket.total += 1
    if (guest.attendance_status === "Attended") categoryBucket.attended += 1
    categoryMap.set(category, categoryBucket)

    if (event.seating_mode === "With Table" && guest.table_no) {
      const tableKey = guest.table_no.trim()
      if (tableKey.length > 0) {
        const tableBucket = tableMap.get(tableKey) ?? { total: 0, attended: 0 }
        tableBucket.total += 1
        if (guest.attendance_status === "Attended") tableBucket.attended += 1
        tableMap.set(tableKey, tableBucket)
      }
    }
  })

  const byCategory = Array.from(categoryMap.entries())
    .map(([category, counts]) => ({
      category,
      total: counts.total,
      attended: counts.attended,
    }))
    .sort((a, b) => a.category.localeCompare(b.category))

  const byTable = Array.from(tableMap.entries())
    .map(([tableNo, counts]) => ({
      tableNo,
      total: counts.total,
      attended: counts.attended,
    }))
    .sort((a, b) => a.tableNo.localeCompare(b.tableNo))

  return {
    totalGuests,
    attendedGuests,
    notArrivedGuests,
    attendanceRate: totalGuests === 0 ? 0 : Math.round((attendedGuests / totalGuests) * 100),
    byCategory,
    byTable,
  }
}

export async function listEvents(filters: EventFilters) {
  const supabase = await createClient()

  let query = supabase.from("events").select("*").order("event_date", { ascending: false })
  if (filters.client_id) query = query.eq("client_id", filters.client_id)
  if (filters.status) query = query.eq("status", filters.status)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const events = (data ?? []) as EventRow[]
  const filteredByQuery = filters.query
    ? events.filter((event) => {
        const q = normalize(filters.query)
        const text = [event.event_name, event.event_code, event.venue ?? "", event.event_type].join(" ").toLowerCase()
        return text.includes(q)
      })
    : events

  const clientIds = Array.from(new Set(filteredByQuery.map((event) => event.client_id)))
  const creatorIds = Array.from(new Set(filteredByQuery.map((event) => event.created_by)))
  const eventIds = filteredByQuery.map((event) => event.event_id)

  const [clientsRes, usersRes, guestsRes] = await Promise.all([
    clientIds.length
      ? supabase.from("clients").select("client_id, client_name").in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null as null }),
    creatorIds.length
      ? supabase.from("users").select("user_id, full_name").in("user_id", creatorIds)
      : Promise.resolve({ data: [], error: null as null }),
    eventIds.length
      ? supabase.from("event_guests").select("event_id, attendance_status").in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null as null }),
  ])

  if (clientsRes.error) throw new Error(clientsRes.error.message)
  if (usersRes.error) throw new Error(usersRes.error.message)
  if (guestsRes.error) throw new Error(guestsRes.error.message)

  const clientMap = new Map((clientsRes.data ?? []).map((row) => [row.client_id as string, row.client_name as string]))
  const userMap = new Map((usersRes.data ?? []).map((row) => [row.user_id as string, row.full_name as string]))
  const eventGuestCounts = new Map<string, { total: number; attended: number }>()

  ;(guestsRes.data ?? []).forEach((row) => {
    const eventId = row.event_id as string
    const status = row.attendance_status as EventGuestAttendanceStatus
    const bucket = eventGuestCounts.get(eventId) ?? { total: 0, attended: 0 }
    bucket.total += 1
    if (status === "Attended") bucket.attended += 1
    eventGuestCounts.set(eventId, bucket)
  })

  return filteredByQuery.map((event) => {
    const counts = eventGuestCounts.get(event.event_id) ?? { total: 0, attended: 0 }
    return {
      ...event,
      client_name: clientMap.get(event.client_id) ?? "-",
      created_by_name: userMap.get(event.created_by) ?? "-",
      total_guests: counts.total,
      attended_guests: counts.attended,
    }
  }) as EventViewRow[]
}

export async function getEventById(eventId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("event_id", eventId)
    .single<EventRow>()

  if (error) throw new Error(error.message)
  if (!data) return null

  const [clientRes, userRes, guestsRes] = await Promise.all([
    supabase.from("clients").select("client_name").eq("client_id", data.client_id).single<{ client_name: string }>(),
    supabase.from("users").select("full_name").eq("user_id", data.created_by).single<{ full_name: string }>(),
    supabase
      .from("event_guests")
      .select("attendance_status")
      .eq("event_id", eventId),
  ])

  if (clientRes.error) throw new Error(clientRes.error.message)
  if (userRes.error) throw new Error(userRes.error.message)
  if (guestsRes.error) throw new Error(guestsRes.error.message)

  const totalGuests = (guestsRes.data ?? []).length
  const attendedGuests = (guestsRes.data ?? []).filter((row) => row.attendance_status === "Attended").length

  return {
    ...data,
    client_name: clientRes.data?.client_name ?? "-",
    created_by_name: userRes.data?.full_name ?? "-",
    total_guests: totalGuests,
    attended_guests: attendedGuests,
  } as EventViewRow
}

export async function listEventGuests(eventId: string, filters?: EventGuestFilters) {
  const supabase = await createClient()
  let query = supabase
    .from("event_guests")
    .select("*")
    .eq("event_id", eventId)

  if (filters?.category) query = query.eq("category", filters.category)
  if (filters?.attendance_status) query = query.eq("attendance_status", filters.attendance_status)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const rows = ((data ?? []) as EventGuestRow[]).filter((guest) => matchesGuestQuery(guest, filters?.query))
  return rows.sort(sortGuestsForOps)
}

export async function listRecentAttendanceLogs(eventId: string, limit = 20) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("event_attendance_logs")
    .select("*")
    .eq("event_id", eventId)
    .order("acted_at", { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)

  const logs = (data ?? []) as EventAttendanceLogRow[]
  if (logs.length === 0) return [] as EventAttendanceLogViewRow[]

  const guestIds = Array.from(new Set(logs.map((log) => log.guest_id)))
  const { data: guests, error: guestsError } = await supabase
    .from("event_guests")
    .select("guest_id, guest_name")
    .in("guest_id", guestIds)

  if (guestsError) throw new Error(guestsError.message)
  const guestMap = new Map((guests ?? []).map((guest) => [guest.guest_id as string, guest.guest_name as string]))

  return logs.map((log) => ({
    ...log,
    guest_name: guestMap.get(log.guest_id) ?? "-",
  })) as EventAttendanceLogViewRow[]
}

export async function getEventAttendanceSummary(eventId: string) {
  const supabase = await createClient()

  const [{ data: event, error: eventError }, { data: guests, error: guestsError }] = await Promise.all([
    supabase.from("events").select("*").eq("event_id", eventId).single<EventRow>(),
    supabase.from("event_guests").select("*").eq("event_id", eventId),
  ])

  if (eventError) throw new Error(eventError.message)
  if (!event) throw new Error("Event not found")
  if (guestsError) throw new Error(guestsError.message)

  return toAttendanceSummary(event, (guests ?? []) as EventGuestRow[])
}

export async function getEventLiveData(eventId: string, guestFilters?: EventGuestFilters) {
  const [event, guests, recentLogs] = await Promise.all([
    getEventById(eventId),
    listEventGuests(eventId, guestFilters),
    listRecentAttendanceLogs(eventId, 15),
  ])

  if (!event) {
    throw new Error("Event not found")
  }

  return {
    event,
    summary: toAttendanceSummary(event, guests),
    guests,
    recentLogs,
  } as EventLiveData
}
