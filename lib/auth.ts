import { createClient } from "@/lib/supabase/server"
import type { AppRole, UserProfile } from "@/types/roles"

export async function getAuthUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const { data: profile } = await supabase
    .from("users")
    .select("user_id, full_name, email, role, department, is_active")
    .eq("user_id", user.id)
    .single<UserProfile>()

  if (!profile || !profile.is_active) {
    return null
  }

  return { user, profile }
}

export async function requireAuth() {
  const auth = await getAuthUser()
  if (!auth) {
    throw new Error("Not authenticated")
  }
  return auth
}

export async function requireRoleAuth(allowedRoles: AppRole[]) {
  const auth = await requireAuth()
  if (!allowedRoles.includes(auth.profile.role)) {
    throw new Error("Forbidden")
  }
  return auth
}

