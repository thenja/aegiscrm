import { daysSinceDateInSingapore, getTouchpointHealth } from "@/lib/date"
import { createClient } from "@/lib/supabase/server"
import type { ClientRow, UserRow } from "@/types/domain"

export type ClientFilters = {
  status?: string
  engagement_type?: string
  client_type?: string
  internal_pic_id?: string
  health_status?: string
}

export async function listClients(filters: ClientFilters) {
  const supabase = await createClient()

  let query = supabase
    .from("clients")
    .select("*")
    .order("client_name", { ascending: true })

  if (filters.status) query = query.eq("status", filters.status)
  if (filters.engagement_type) query = query.eq("engagement_type", filters.engagement_type)
  if (filters.client_type) query = query.eq("client_type", filters.client_type)
  if (filters.internal_pic_id) query = query.eq("internal_pic_id", filters.internal_pic_id)
  if (filters.health_status) query = query.eq("health_status", filters.health_status)

  const { data: clients, error } = await query

  if (error) {
    throw new Error(error.message)
  }

  const { data: users } = await supabase
    .from("users")
    .select("user_id, full_name")
    .eq("is_active", true)

  const userMap = new Map<string, string>((users ?? []).map((u) => [u.user_id as string, u.full_name as string]))

  return ((clients ?? []) as ClientRow[]).map((client) => ({
    ...client,
    internal_pic_name: userMap.get(client.internal_pic_id) ?? "-",
    backup_pic_name: client.backup_pic_id ? userMap.get(client.backup_pic_id) ?? "-" : "-",
    touchpoint_days_since: daysSinceDateInSingapore(client.last_client_touchpoint),
    touchpoint_health: getTouchpointHealth(client.last_client_touchpoint, client.touchpoint_overdue_days),
  }))
}

export async function getClientById(clientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("client_id", clientId)
    .single<ClientRow>()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

export async function listClientContacts(clientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("client_id", clientId)
    .order("is_primary", { ascending: false })
    .order("contact_name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function getUsersForClientAssignments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("users")
    .select("user_id, full_name, role")
    .eq("is_active", true)
    .order("full_name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Pick<UserRow, "user_id" | "full_name" | "role">[]
}
