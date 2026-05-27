import { createClient } from "@/lib/supabase/server"

export type GlobalSearchResultType =
  | "Client"
  | "Contact"
  | "External Contact"
  | "Event"
  | "Event Guest"
  | "Deliverable"
  | "Task"
  | "Communication"

export type GlobalSearchResult = {
  id: string
  type: GlobalSearchResultType
  title: string
  clientName: string | null
  picName: string | null
  status: string | null
  href: string
}

const MIN_QUERY_LENGTH = 2
const PER_TYPE_LIMIT = 6

function toIlikeQuery(raw: string) {
  return `%${raw.replace(/[%_]/g, "").trim()}%`
}

export async function searchGlobal(rawQuery: string): Promise<GlobalSearchResult[]> {
  const query = rawQuery.trim()
  if (query.length < MIN_QUERY_LENGTH) return []

  const supabase = await createClient()
  const ilike = toIlikeQuery(query)

  const [clientsRes, contactsRes, externalContactsRes, eventsRes, eventGuestsRes, deliverablesRes, tasksRes, commRes, usersRes] = await Promise.all([
    supabase
      .from("clients")
      .select("client_id, client_name, status")
      .ilike("client_name", ilike)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("contacts")
      .select("contact_id, client_id, contact_name")
      .ilike("contact_name", ilike)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("external_contacts")
      .select("external_contact_id, name, organisation, contact_type")
      .or(`name.ilike.${ilike},organisation.ilike.${ilike},sector_beat.ilike.${ilike}`)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("events")
      .select("event_id, client_id, event_name, event_date, status, event_code")
      .or(`event_name.ilike.${ilike},event_code.ilike.${ilike},venue.ilike.${ilike}`)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("event_guests")
      .select("guest_id, event_id, guest_name, company, category, attendance_status")
      .or(`guest_name.ilike.${ilike},company.ilike.${ilike},phone.ilike.${ilike}`)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("deliverables")
      .select("deliverable_id, client_id, deliverable_name, pic_id, status")
      .ilike("deliverable_name", ilike)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("tasks")
      .select("task_id, client_id, task_title, pic_id, status")
      .ilike("task_title", ilike)
      .limit(PER_TYPE_LIMIT),
    supabase
      .from("client_communication_logs")
      .select("comm_log_id, client_id, summary, counterpart_name")
      .or(`summary.ilike.${ilike},counterpart_name.ilike.${ilike}`)
      .limit(PER_TYPE_LIMIT),
    supabase.from("users").select("user_id, full_name").eq("is_active", true),
  ])

  if (clientsRes.error) throw new Error(clientsRes.error.message)
  if (contactsRes.error) throw new Error(contactsRes.error.message)
  if (externalContactsRes.error) throw new Error(externalContactsRes.error.message)
  if (eventsRes.error) throw new Error(eventsRes.error.message)
  if (eventGuestsRes.error) throw new Error(eventGuestsRes.error.message)
  if (deliverablesRes.error) throw new Error(deliverablesRes.error.message)
  if (tasksRes.error) throw new Error(tasksRes.error.message)
  if (commRes.error) throw new Error(commRes.error.message)
  if (usersRes.error) throw new Error(usersRes.error.message)

  const clientIds = new Set<string>()
  ;(clientsRes.data ?? []).forEach((c) => clientIds.add(c.client_id as string))
  ;(contactsRes.data ?? []).forEach((c) => clientIds.add(c.client_id as string))
  ;(deliverablesRes.data ?? []).forEach((d) => clientIds.add(d.client_id as string))
  ;(eventsRes.data ?? []).forEach((e) => clientIds.add(e.client_id as string))
  ;(tasksRes.data ?? []).forEach((t) => {
    if (t.client_id) clientIds.add(t.client_id as string)
  })
  ;(commRes.data ?? []).forEach((c) => clientIds.add(c.client_id as string))

  const eventIdsFromGuests = new Set<string>()
  ;(eventGuestsRes.data ?? []).forEach((guest) => eventIdsFromGuests.add(guest.event_id as string))
  const eventIdsFromEvents = new Set<string>((eventsRes.data ?? []).map((event) => event.event_id as string))
  const allEventIds = Array.from(new Set([...eventIdsFromGuests, ...eventIdsFromEvents]))

  const { data: clientNames, error: clientNamesError } = clientIds.size
    ? await supabase
        .from("clients")
        .select("client_id, client_name")
        .in("client_id", Array.from(clientIds))
    : { data: [], error: null as null }

  if (clientNamesError) throw new Error(clientNamesError.message)

  const { data: eventRows, error: eventRowsError } = allEventIds.length
    ? await supabase
        .from("events")
        .select("event_id, event_name, client_id")
        .in("event_id", allEventIds)
    : { data: [], error: null as null }

  if (eventRowsError) throw new Error(eventRowsError.message)

  const clientMap = new Map<string, string>((clientNames ?? []).map((c) => [c.client_id as string, c.client_name as string]))
  const eventMap = new Map(
    (eventRows ?? []).map((event) => [
      event.event_id as string,
      {
        event_name: event.event_name as string,
        client_id: event.client_id as string,
      },
    ])
  )
  const userMap = new Map<string, string>((usersRes.data ?? []).map((u) => [u.user_id as string, u.full_name as string]))

  const results: GlobalSearchResult[] = []

  ;(clientsRes.data ?? []).forEach((client) => {
    const clientId = client.client_id as string
    results.push({
      id: clientId,
      type: "Client",
      title: client.client_name as string,
      clientName: client.client_name as string,
      picName: null,
      status: client.status as string,
      href: `/clients/${clientId}`,
    })
  })

  ;(contactsRes.data ?? []).forEach((contact) => {
    const clientId = contact.client_id as string
    results.push({
      id: contact.contact_id as string,
      type: "Contact",
      title: contact.contact_name as string,
      clientName: clientMap.get(clientId) ?? null,
      picName: null,
      status: null,
      href: `/clients/${clientId}?tab=contacts`,
    })
  })

  ;(externalContactsRes.data ?? []).forEach((externalContact) => {
    results.push({
      id: externalContact.external_contact_id as string,
      type: "External Contact",
      title: externalContact.name as string,
      clientName: (externalContact.organisation as string | null) ?? null,
      picName: null,
      status: externalContact.contact_type as string,
      href: `/external-contacts?external_contact_id=${externalContact.external_contact_id as string}`,
    })
  })

  ;(eventsRes.data ?? []).forEach((event) => {
    const eventId = event.event_id as string
    const clientId = event.client_id as string
    results.push({
      id: eventId,
      type: "Event",
      title: event.event_name as string,
      clientName: clientMap.get(clientId) ?? null,
      picName: null,
      status: `${event.status as string} | ${event.event_code as string}`,
      href: `/events/${eventId}`,
    })
  })

  ;(eventGuestsRes.data ?? []).forEach((guest) => {
    const eventId = guest.event_id as string
    const event = eventMap.get(eventId)
    const clientId = event?.client_id ?? null
    const guestTitle = `${guest.guest_name as string}${guest.company ? ` (${guest.company as string})` : ""}`
    results.push({
      id: guest.guest_id as string,
      type: "Event Guest",
      title: guestTitle,
      clientName: clientId ? clientMap.get(clientId) ?? null : null,
      picName: null,
      status: `${event?.event_name ?? "Event"} | ${guest.attendance_status as string}`,
      href: `/events/${eventId}?guest_id=${guest.guest_id as string}`,
    })
  })

  ;(deliverablesRes.data ?? []).forEach((deliverable) => {
    const clientId = deliverable.client_id as string
    results.push({
      id: deliverable.deliverable_id as string,
      type: "Deliverable",
      title: deliverable.deliverable_name as string,
      clientName: clientMap.get(clientId) ?? null,
      picName: userMap.get(deliverable.pic_id as string) ?? null,
      status: deliverable.status as string,
      href: `/clients/${clientId}?tab=deliverables`,
    })
  })

  ;(tasksRes.data ?? []).forEach((task) => {
    const clientId = (task.client_id as string | null) ?? null
    results.push({
      id: task.task_id as string,
      type: "Task",
      title: task.task_title as string,
      clientName: clientId ? clientMap.get(clientId) ?? null : "Global Internal",
      picName: userMap.get(task.pic_id as string) ?? null,
      status: task.status as string,
      href: clientId ? `/clients/${clientId}?tab=tasks` : "/tasks",
    })
  })

  ;(commRes.data ?? []).forEach((commLog) => {
    const clientId = commLog.client_id as string
    results.push({
      id: commLog.comm_log_id as string,
      type: "Communication",
      title: (commLog.summary as string) || (commLog.counterpart_name as string),
      clientName: clientMap.get(clientId) ?? null,
      picName: null,
      status: null,
      href: `/clients/${clientId}?tab=communication`,
    })
  })

  const typeOrder: Record<GlobalSearchResultType, number> = {
    Client: 0,
    Contact: 1,
    "External Contact": 2,
    Event: 3,
    "Event Guest": 4,
    Deliverable: 5,
    Task: 6,
    Communication: 7,
  }

  return results.sort((a, b) => {
    const orderDiff = typeOrder[a.type] - typeOrder[b.type]
    if (orderDiff !== 0) return orderDiff
    return a.title.localeCompare(b.title)
  })
}

export const searchConfig = {
  minQueryLength: MIN_QUERY_LENGTH,
  perTypeLimit: PER_TYPE_LIMIT,
}
