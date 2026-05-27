import { createClient } from "@/lib/supabase/server"
import type {
  ExternalContactRow,
  ExternalInvolvementPurpose,
  ExternalInvolvementStatus,
  ExternalContactType,
} from "@/types/domain"

function toIlikeQuery(raw: string) {
  return `%${raw.replace(/[%_]/g, "").trim()}%`
}

export type ExternalContactFilters = {
  query?: string
  contact_type?: string
  is_active?: string
}

export type ExternalContactViewRow = ExternalContactRow & {
  linked_work_count: number
}

export type ExternalContactSelectOption = {
  external_contact_id: string
  name: string
  organisation: string | null
  contact_type: ExternalContactType
  is_active: boolean
}

export type PeopleInvolvedRow = {
  link_id: string
  client_id: string
  external_contact_id: string
  external_contact_name: string
  external_contact_organisation: string | null
  external_contact_type: ExternalContactType
  deliverable_id: string | null
  task_id: string | null
  purpose: ExternalInvolvementPurpose
  involvement_status: ExternalInvolvementStatus
  scheduled_date: string | null
  completed_date: string | null
  outcome: string | null
  notes: string | null
}

export type ExternalContactRelatedWorkRow = {
  link_id: string
  client_id: string
  client_name: string
  item_type: "Deliverable" | "Task"
  item_id: string
  item_name: string
  item_status: string
  due_date: string | null
  purpose: ExternalInvolvementPurpose
  involvement_status: ExternalInvolvementStatus
  scheduled_date: string | null
  completed_date: string | null
  notes: string | null
  href: string
}

async function buildRelatedWorkRows(links: Array<{
  link_id: string
  external_contact_id: string
  client_id: string
  deliverable_id: string | null
  task_id: string | null
  purpose: ExternalInvolvementPurpose
  involvement_status: ExternalInvolvementStatus
  scheduled_date: string | null
  completed_date: string | null
  notes: string | null
}>) {
  const supabase = await createClient()

  const deliverableIds = links
    .map((row) => row.deliverable_id)
    .filter((value): value is string => Boolean(value))
  const taskIds = links
    .map((row) => row.task_id)
    .filter((value): value is string => Boolean(value))
  const clientIds = Array.from(new Set(links.map((row) => row.client_id)))

  const [deliverablesRes, tasksRes, clientsRes] = await Promise.all([
    deliverableIds.length
      ? supabase
          .from("deliverables")
          .select("deliverable_id, deliverable_name, status, due_date, client_id")
          .in("deliverable_id", deliverableIds)
      : Promise.resolve({ data: [], error: null as null }),
    taskIds.length
      ? supabase
          .from("tasks")
          .select("task_id, task_title, status, due_date, client_id")
          .in("task_id", taskIds)
      : Promise.resolve({ data: [], error: null as null }),
    clientIds.length
      ? supabase
          .from("clients")
          .select("client_id, client_name")
          .in("client_id", clientIds)
      : Promise.resolve({ data: [], error: null as null }),
  ])

  if (deliverablesRes.error) throw new Error(deliverablesRes.error.message)
  if (tasksRes.error) throw new Error(tasksRes.error.message)
  if (clientsRes.error) throw new Error(clientsRes.error.message)

  const deliverableMap = new Map(
    (deliverablesRes.data ?? []).map((row) => [
      row.deliverable_id as string,
      {
        item_name: row.deliverable_name as string,
        item_status: row.status as string,
        due_date: (row.due_date as string | null) ?? null,
        client_id: row.client_id as string,
      },
    ])
  )
  const taskMap = new Map(
    (tasksRes.data ?? []).map((row) => [
      row.task_id as string,
      {
        item_name: row.task_title as string,
        item_status: row.status as string,
        due_date: (row.due_date as string | null) ?? null,
        client_id: (row.client_id as string | null) ?? null,
      },
    ])
  )
  const clientMap = new Map((clientsRes.data ?? []).map((row) => [row.client_id as string, row.client_name as string]))

  const grouped: Record<string, ExternalContactRelatedWorkRow[]> = {}

  links.forEach((row) => {
    if (row.deliverable_id) {
      const deliverable = deliverableMap.get(row.deliverable_id)
      if (!deliverable) return
      if (!grouped[row.external_contact_id]) grouped[row.external_contact_id] = []
      grouped[row.external_contact_id].push({
        link_id: row.link_id,
        client_id: deliverable.client_id,
        client_name: clientMap.get(deliverable.client_id) ?? "-",
        item_type: "Deliverable",
        item_id: row.deliverable_id,
        item_name: deliverable.item_name,
        item_status: deliverable.item_status,
        due_date: deliverable.due_date,
        purpose: row.purpose,
        involvement_status: row.involvement_status,
        scheduled_date: row.scheduled_date,
        completed_date: row.completed_date,
        notes: row.notes,
        href: `/clients/${deliverable.client_id}?tab=deliverables`,
      })
      return
    }

    if (row.task_id) {
      const task = taskMap.get(row.task_id)
      if (!task || !task.client_id) return
      if (!grouped[row.external_contact_id]) grouped[row.external_contact_id] = []
      grouped[row.external_contact_id].push({
        link_id: row.link_id,
        client_id: task.client_id,
        client_name: clientMap.get(task.client_id) ?? "-",
        item_type: "Task",
        item_id: row.task_id,
        item_name: task.item_name,
        item_status: task.item_status,
        due_date: task.due_date,
        purpose: row.purpose,
        involvement_status: row.involvement_status,
        scheduled_date: row.scheduled_date,
        completed_date: row.completed_date,
        notes: row.notes,
        href: `/clients/${task.client_id}?tab=tasks`,
      })
    }
  })

  return grouped
}

function workKey(type: "Deliverable" | "Task", id: string) {
  return `${type}-${id}`
}

export async function listExternalContacts(filters: ExternalContactFilters) {
  const supabase = await createClient()
  let query = supabase.from("external_contacts").select("*").order("name", { ascending: true })

  if (filters.contact_type) {
    query = query.eq("contact_type", filters.contact_type)
  }
  if (filters.is_active === "true") {
    query = query.eq("is_active", true)
  }
  if (filters.is_active === "false") {
    query = query.eq("is_active", false)
  }
  if (filters.query) {
    const ilike = toIlikeQuery(filters.query)
    query = query.or(`name.ilike.${ilike},organisation.ilike.${ilike},email.ilike.${ilike},phone.ilike.${ilike}`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const contacts = (data ?? []) as ExternalContactRow[]

  const contactIds = contacts.map((row) => row.external_contact_id)
  const { data: links, error: linksError } = contactIds.length
    ? await supabase
        .from("work_item_external_contacts")
        .select("external_contact_id")
        .in("external_contact_id", contactIds)
    : { data: [], error: null as null }

  if (linksError) throw new Error(linksError.message)

  const counts = new Map<string, number>()
  ;(links ?? []).forEach((row) => {
    const id = row.external_contact_id as string
    counts.set(id, (counts.get(id) ?? 0) + 1)
  })

  return contacts.map((row) => ({
    ...row,
    linked_work_count: counts.get(row.external_contact_id) ?? 0,
  })) as ExternalContactViewRow[]
}

export async function listExternalContactsForSelect() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("external_contacts")
    .select("external_contact_id, name, organisation, contact_type, is_active")
    .eq("is_active", true)
    .order("name", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as ExternalContactSelectOption[]
}

export async function getExternalContactById(externalContactId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("external_contacts")
    .select("*")
    .eq("external_contact_id", externalContactId)
    .single<ExternalContactRow>()

  if (error) throw new Error(error.message)
  return data
}

export async function listPeopleInvolvedByWorkItems({
  deliverableIds,
  taskIds,
}: {
  deliverableIds: string[]
  taskIds: string[]
}) {
  const supabase = await createClient()
  const rows: Array<{
    link_id: string
    client_id: string
    external_contact_id: string
    deliverable_id: string | null
    task_id: string | null
    purpose: ExternalInvolvementPurpose
    involvement_status: ExternalInvolvementStatus
    scheduled_date: string | null
    completed_date: string | null
    outcome: string | null
    notes: string | null
  }> = []

  if (deliverableIds.length > 0) {
    const { data, error } = await supabase
      .from("work_item_external_contacts")
      .select("link_id, client_id, external_contact_id, deliverable_id, task_id, purpose, involvement_status, scheduled_date, completed_date, outcome, notes")
      .in("deliverable_id", deliverableIds)
      .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)
    rows.push(
      ...((data ?? []) as Array<{
        link_id: string
        client_id: string
        external_contact_id: string
        deliverable_id: string | null
        task_id: string | null
        purpose: ExternalInvolvementPurpose
        involvement_status: ExternalInvolvementStatus
        scheduled_date: string | null
        completed_date: string | null
        outcome: string | null
        notes: string | null
      }>)
    )
  }

  if (taskIds.length > 0) {
    const { data, error } = await supabase
      .from("work_item_external_contacts")
      .select("link_id, client_id, external_contact_id, deliverable_id, task_id, purpose, involvement_status, scheduled_date, completed_date, outcome, notes")
      .in("task_id", taskIds)
      .order("created_at", { ascending: false })

    if (error) throw new Error(error.message)
    rows.push(
      ...((data ?? []) as Array<{
        link_id: string
        client_id: string
        external_contact_id: string
        deliverable_id: string | null
        task_id: string | null
        purpose: ExternalInvolvementPurpose
        involvement_status: ExternalInvolvementStatus
        scheduled_date: string | null
        completed_date: string | null
        outcome: string | null
        notes: string | null
      }>)
    )
  }

  const contactIds = Array.from(new Set(rows.map((row) => row.external_contact_id)))
  const { data: contacts, error: contactsError } = contactIds.length
    ? await supabase
        .from("external_contacts")
        .select("external_contact_id, name, organisation, contact_type")
        .in("external_contact_id", contactIds)
    : { data: [], error: null as null }

  if (contactsError) throw new Error(contactsError.message)

  const contactMap = new Map<
    string,
    {
      name: string
      organisation: string | null
      contact_type: ExternalContactType
    }
  >(
    (contacts ?? []).map((row) => [
      row.external_contact_id as string,
      {
        name: row.name as string,
        organisation: (row.organisation as string | null) ?? null,
        contact_type: row.contact_type as ExternalContactType,
      },
    ])
  )

  const byWorkItem: Record<string, PeopleInvolvedRow[]> = {}

  rows.forEach((row) => {
    const contact = contactMap.get(row.external_contact_id)
    if (!contact) return

    const key = row.deliverable_id
      ? workKey("Deliverable", row.deliverable_id)
      : row.task_id
        ? workKey("Task", row.task_id)
        : null

    if (!key) return

    if (!byWorkItem[key]) byWorkItem[key] = []
    byWorkItem[key].push({
      ...row,
      external_contact_name: contact.name,
      external_contact_organisation: contact.organisation,
      external_contact_type: contact.contact_type,
    })
  })

  return byWorkItem
}

export async function listRelatedWorkByExternalContact(externalContactId: string) {
  const supabase = await createClient()
  const { data: links, error: linksError } = await supabase
    .from("work_item_external_contacts")
    .select("link_id, client_id, deliverable_id, task_id, purpose, involvement_status, scheduled_date, completed_date, notes")
    .eq("external_contact_id", externalContactId)
    .order("created_at", { ascending: false })
    .limit(100)

  if (linksError) throw new Error(linksError.message)

  const typedLinks = (links ?? []).map((row) => ({
    ...(row as {
      link_id: string
      client_id: string
      deliverable_id: string | null
      task_id: string | null
      purpose: ExternalInvolvementPurpose
      involvement_status: ExternalInvolvementStatus
      scheduled_date: string | null
      completed_date: string | null
      notes: string | null
    }),
    external_contact_id: externalContactId,
  }))

  const grouped = await buildRelatedWorkRows(typedLinks)
  return grouped[externalContactId] ?? []
}

export async function listRelatedWorkByExternalContactIds(externalContactIds: string[]) {
  if (externalContactIds.length === 0) return {} as Record<string, ExternalContactRelatedWorkRow[]>

  const supabase = await createClient()
  const { data: links, error: linksError } = await supabase
    .from("work_item_external_contacts")
    .select("link_id, external_contact_id, client_id, deliverable_id, task_id, purpose, involvement_status, scheduled_date, completed_date, notes")
    .in("external_contact_id", externalContactIds)
    .order("created_at", { ascending: false })
    .limit(400)

  if (linksError) throw new Error(linksError.message)

  const typedLinks = (links ?? []) as Array<{
    link_id: string
    external_contact_id: string
    client_id: string
    deliverable_id: string | null
    task_id: string | null
    purpose: ExternalInvolvementPurpose
    involvement_status: ExternalInvolvementStatus
    scheduled_date: string | null
    completed_date: string | null
    notes: string | null
  }>
  return buildRelatedWorkRows(typedLinks)
}
