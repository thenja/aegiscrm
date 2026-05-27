import { createClient } from "@/lib/supabase/server"
import type { UserRow } from "@/types/domain"

export async function listUsers() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("users")
    .select("user_id, full_name, email, role, department, is_active, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as UserRow[]
}

export async function listActiveUsersForSelect() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("users")
    .select("user_id, full_name, role")
    .eq("is_active", true)
    .order("full_name", { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

