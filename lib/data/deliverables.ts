import { createClient } from "@/lib/supabase/server"
import type { DeliverableRow } from "@/types/domain"

export type DeliverableFilters = {
  client_id?: string
  status?: string
  priority?: string
  pic_id?: string
}

export type DeliverableViewRow = DeliverableRow & {
  client_name: string
  pic_name: string
  reviewer_name: string | null
  sent_by_name: string | null
}

export async function listDeliverables(filters: DeliverableFilters) {
  const supabase = await createClient()

  let query = supabase.from("deliverables").select("*").order("due_date", { ascending: true })

  if (filters.client_id) query = query.eq("client_id", filters.client_id)
  if (filters.status) query = query.eq("status", filters.status)
  if (filters.priority) query = query.eq("priority", filters.priority)
  if (filters.pic_id) query = query.eq("pic_id", filters.pic_id)

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const deliverables = (data ?? []) as DeliverableRow[]

  const [usersRes, clientsRes] = await Promise.all([
    supabase.from("users").select("user_id, full_name"),
    supabase.from("clients").select("client_id, client_name"),
  ])

  const userMap = new Map<string, string>((usersRes.data ?? []).map((u) => [u.user_id as string, u.full_name as string]))
  const clientMap = new Map<string, string>((clientsRes.data ?? []).map((c) => [c.client_id as string, c.client_name as string]))

  return deliverables.map((item) => ({
    ...item,
    client_name: clientMap.get(item.client_id) ?? "-",
    pic_name: userMap.get(item.pic_id) ?? "-",
    reviewer_name: item.reviewer_id ? userMap.get(item.reviewer_id) ?? "-" : null,
    sent_by_name: item.sent_by_id ? userMap.get(item.sent_by_id) ?? "-" : null,
  })) as DeliverableViewRow[]
}

export async function getDeliverableById(deliverableId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("deliverables")
    .select("*")
    .eq("deliverable_id", deliverableId)
    .single<DeliverableRow>()

  if (error) throw new Error(error.message)
  return data
}
