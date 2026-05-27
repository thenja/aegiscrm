import { createClient } from "@/lib/supabase/server"
import type { ClientCommunicationLogRow } from "@/types/domain"

export type ClientCommunicationLogListRow = ClientCommunicationLogRow & {
  logged_by_name: string
  related_deliverable_name: string | null
  related_task_title: string | null
}

export async function listClientCommunicationLogs(clientId: string) {
  const supabase = await createClient()
  const { data: logs, error } = await supabase
    .from("client_communication_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("comm_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  const typedLogs = (logs ?? []) as ClientCommunicationLogRow[]
  if (typedLogs.length === 0) {
    return [] as ClientCommunicationLogListRow[]
  }

  const uniqueLoggerIds = Array.from(new Set(typedLogs.map((log) => log.logged_by)))
  const relatedDeliverableIds = typedLogs
    .filter((log) => log.reference_type === "Deliverable" && log.reference_id)
    .map((log) => log.reference_id as string)
  const relatedTaskIds = typedLogs
    .filter((log) => log.reference_type === "Task" && log.reference_id)
    .map((log) => log.reference_id as string)

  const [usersRes, deliverablesRes, tasksRes] = await Promise.all([
    supabase.from("users").select("user_id, full_name").in("user_id", uniqueLoggerIds),
    relatedDeliverableIds.length > 0
      ? supabase.from("deliverables").select("deliverable_id, deliverable_name").in("deliverable_id", relatedDeliverableIds)
      : Promise.resolve({ data: [], error: null }),
    relatedTaskIds.length > 0
      ? supabase.from("tasks").select("task_id, task_title").in("task_id", relatedTaskIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if (usersRes.error) throw new Error(usersRes.error.message)
  if (deliverablesRes.error) throw new Error(deliverablesRes.error.message)
  if (tasksRes.error) throw new Error(tasksRes.error.message)

  const userMap = new Map((usersRes.data ?? []).map((u) => [u.user_id as string, u.full_name as string]))
  const deliverableMap = new Map((deliverablesRes.data ?? []).map((d) => [d.deliverable_id as string, d.deliverable_name as string]))
  const taskMap = new Map((tasksRes.data ?? []).map((t) => [t.task_id as string, t.task_title as string]))

  return typedLogs.map((log) => ({
    ...log,
    logged_by_name: userMap.get(log.logged_by) ?? "-",
    related_deliverable_name:
      log.reference_type === "Deliverable" && log.reference_id
        ? deliverableMap.get(log.reference_id) ?? null
        : null,
    related_task_title:
      log.reference_type === "Task" && log.reference_id
        ? taskMap.get(log.reference_id) ?? null
        : null,
  }))
}
