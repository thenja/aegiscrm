import { createClient } from "@/lib/supabase/server"
import { requireRoleAuth } from "@/lib/auth"
import type { AppRole } from "@/types/roles"

const hierarchy: Record<AppRole, number> = {
  "Team Member": 1,
  "Team Lead": 2,
  Director: 3,
  Admin: 4,
}

export function hasRole(userRole: AppRole, allowedRoles: AppRole[]) {
  return allowedRoles.includes(userRole)
}

export function requireRole(userRole: AppRole, allowedRoles: AppRole[]) {
  if (!hasRole(userRole, allowedRoles)) {
    throw new Error("Forbidden")
  }
}

export function isDirectorOrAdmin(role: AppRole) {
  return hasRole(role, ["Director", "Admin"])
}

export function isTeamLeadOrAbove(role: AppRole) {
  return hierarchy[role] >= hierarchy["Team Lead"]
}

export function isOwnClient(userId: string, internalPicId: string | null, backupPicId: string | null) {
  return userId === internalPicId || userId === backupPicId
}

export function isOwnItem(userId: string, picId: string | null) {
  return userId === picId
}

export async function requireDirectorOrAdmin() {
  return requireRoleAuth(["Director", "Admin"])
}

export async function requireExternalContactManageAccess() {
  return requireRoleAuth(["Director", "Team Lead"])
}

export async function requireExternalContactReadAccess() {
  return requireRoleAuth(["Director", "Team Lead", "Team Member", "Admin"])
}

export async function requireClientWriteAccess(clientId: string) {
  const auth = await requireRoleAuth(["Director", "Team Lead", "Team Member", "Admin"])
  if (hasRole(auth.profile.role, ["Director", "Team Lead", "Admin"])) {
    return auth
  }

  const supabase = await createClient()
  const { data: client } = await supabase
    .from("clients")
    .select("internal_pic_id, backup_pic_id")
    .eq("client_id", clientId)
    .single<{ internal_pic_id: string; backup_pic_id: string | null }>()

  if (!client || !isOwnClient(auth.profile.user_id, client.internal_pic_id, client.backup_pic_id)) {
    throw new Error("Forbidden")
  }

  return auth
}

export async function requireClientCommunicationLogAccess(clientId: string) {
  const auth = await requireRoleAuth(["Director", "Team Lead", "Team Member", "Admin"])
  if (hasRole(auth.profile.role, ["Director", "Team Lead"])) {
    return auth
  }

  if (auth.profile.role === "Admin") {
    throw new Error("Forbidden")
  }

  const supabase = await createClient()
  const { data: client } = await supabase
    .from("clients")
    .select("internal_pic_id, backup_pic_id")
    .eq("client_id", clientId)
    .single<{ internal_pic_id: string; backup_pic_id: string | null }>()

  if (!client || !isOwnClient(auth.profile.user_id, client.internal_pic_id, client.backup_pic_id)) {
    throw new Error("Forbidden")
  }

  return auth
}

async function checkClientOwnership(userId: string, clientId: string) {
  const supabase = await createClient()
  const { data: client } = await supabase
    .from("clients")
    .select("internal_pic_id, backup_pic_id")
    .eq("client_id", clientId)
    .single<{ internal_pic_id: string; backup_pic_id: string | null }>()

  if (!client) return false
  return isOwnClient(userId, client.internal_pic_id, client.backup_pic_id)
}

export async function requireDeliverableWriteAccess(clientId: string, picId: string) {
  const auth = await requireRoleAuth(["Director", "Team Lead", "Team Member", "Admin"])

  if (hasRole(auth.profile.role, ["Director", "Team Lead"])) {
    return auth
  }

  if (auth.profile.role === "Admin") {
    throw new Error("Forbidden")
  }

  if (!isOwnItem(auth.profile.user_id, picId)) {
    throw new Error("Forbidden")
  }

  const hasClientOwnership = await checkClientOwnership(auth.profile.user_id, clientId)
  if (!hasClientOwnership) {
    throw new Error("Forbidden")
  }

  return auth
}

export async function requireTaskWriteAccess(clientId: string | null, picId: string) {
  const auth = await requireRoleAuth(["Director", "Team Lead", "Team Member", "Admin"])

  if (hasRole(auth.profile.role, ["Director", "Team Lead"])) {
    return auth
  }

  if (auth.profile.role === "Admin") {
    throw new Error("Forbidden")
  }

  if (!isOwnItem(auth.profile.user_id, picId)) {
    throw new Error("Forbidden")
  }

  if (!clientId) {
    throw new Error("Forbidden")
  }

  const hasClientOwnership = await checkClientOwnership(auth.profile.user_id, clientId)
  if (!hasClientOwnership) {
    throw new Error("Forbidden")
  }

  return auth
}

export async function requireEventManageAccess(clientId: string) {
  const auth = await requireRoleAuth(["Director", "Team Lead", "Team Member", "Admin"])

  if (hasRole(auth.profile.role, ["Director", "Team Lead"])) {
    return auth
  }

  if (auth.profile.role === "Admin") {
    throw new Error("Forbidden")
  }

  const hasClientOwnership = await checkClientOwnership(auth.profile.user_id, clientId)
  if (!hasClientOwnership) {
    throw new Error("Forbidden")
  }

  return auth
}

