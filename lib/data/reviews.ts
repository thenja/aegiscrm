import { requireAuth } from "@/lib/auth"
import { getDashboardData, type DashboardData, type DashboardFilters } from "@/lib/data/dashboard"
import { createClient } from "@/lib/supabase/server"
import type { AppRole } from "@/types/roles"

export type ReviewPreset =
  | "my_overdue"
  | "my_due_today"
  | "pending_client"
  | "no_contact_yet"
  | "no_work_planned"
  | "due_this_week"

export type CommunicationPreview = {
  commLogId: string
  commDate: string
  channel: string
  direction: string
  counterpartName: string
  summary: string
}

export function canSeeTeamWideReviews(role: AppRole) {
  return role === "Director" || role === "Team Lead"
}

export function applyReviewPreset(filters: DashboardFilters, preset?: string): DashboardFilters {
  if (!preset) return filters
  const typed = preset as ReviewPreset

  if (typed === "my_overdue" || typed === "my_due_today") {
    return { ...filters, my_items_only: true }
  }

  if (typed === "pending_client") {
    return { ...filters, status: "Pending Client Approval" }
  }

  if (typed === "due_this_week") {
    return { ...filters }
  }

  if (typed === "no_contact_yet" || typed === "no_work_planned") {
    return { ...filters }
  }

  return filters
}

export async function getReviewData(
  baseFilters: DashboardFilters,
  options?: { forceOwnScope?: boolean; preset?: string }
): Promise<{ auth: Awaited<ReturnType<typeof requireAuth>>; filters: DashboardFilters; data: DashboardData }> {
  const auth = await requireAuth()
  const role = auth.profile.role

  const teamWideAllowed = canSeeTeamWideReviews(role)
  const forceOwnScope = options?.forceOwnScope ?? false

  let filters = applyReviewPreset(baseFilters, options?.preset)

  if (forceOwnScope || !teamWideAllowed) {
    filters = {
      ...filters,
      my_items_only: true,
      pic_id: undefined,
    }
  }

  const data = await getDashboardData(filters)
  return { auth, filters, data }
}

export async function getCommunicationPreviewMapByClientIds(
  clientIds: string[]
): Promise<Record<string, CommunicationPreview[]>> {
  const uniqueClientIds = Array.from(new Set(clientIds.filter(Boolean)))
  if (uniqueClientIds.length === 0) return {}

  const supabase = await createClient()
  const { data, error } = await supabase
    .from("client_communication_logs")
    .select("comm_log_id, client_id, comm_date, channel, direction, counterpart_name, summary")
    .in("client_id", uniqueClientIds)
    .order("comm_date", { ascending: false })
    .limit(300)

  if (error) {
    return {}
  }

  return (data ?? []).reduce(
    (acc, row) => {
      const clientId = row.client_id as string
      if (!acc[clientId]) acc[clientId] = []
      if (acc[clientId].length < 3) {
        acc[clientId].push({
          commLogId: row.comm_log_id as string,
          commDate: row.comm_date as string,
          channel: row.channel as string,
          direction: row.direction as string,
          counterpartName: row.counterpart_name as string,
          summary: row.summary as string,
        })
      }
      return acc
    },
    {} as Record<string, CommunicationPreview[]>
  )
}
