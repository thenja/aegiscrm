import { requireAuth } from "@/lib/auth"
import { daysSinceDateInSingapore, getTouchpointHealth } from "@/lib/date"
import { createClient } from "@/lib/supabase/server"
import type { CategoryType, DeliverableRow, TaskRow } from "@/types/domain"

const SG_TIMEZONE = "Asia/Singapore"

type DateParts = { year: number; month: number; day: number }

const DELIVERABLE_NON_ACTIVE_STATUSES = new Set([
  "Completed",
  "Cancelled",
  "Not Required This Month",
  "Deferred",
  "On Hold",
])
const TASK_NON_ACTIVE_STATUSES = new Set(["Completed", "Cancelled", "On Hold"])
const DELIVERABLE_OVERDUE_EXCLUDED_STATUSES = new Set(["Pending Client Data"])

export type DashboardFilters = {
  client_id?: string
  pic_id?: string
  category?: CategoryType | string
  status?: string
  my_items_only?: boolean
}

export type DashboardWorkItem = {
  itemType: "Deliverable" | "Task"
  itemId: string
  clientId: string | null
  clientName: string
  itemName: string
  status: string
  priority: string
  category: string | null
  picId: string | null
  picName: string
  dueDate: string | null
  latestUpdate: string | null
  completionDate: string | null
}

export type PlanningGapClientRow = {
  clientId: string
  clientName: string
  clientType: string
  picName: string
  healthStatus: string
  lastTouchpoint: string | null
}

export type TeamWorkloadRow = {
  picId: string
  picName: string
  openCount: number
  overdueCount: number
  dueThisWeekCount: number
  pendingCount: number
}

export type TouchpointRiskClientRow = {
  clientId: string
  clientName: string
  clientType: string
  picId: string
  picName: string
  lastTouchpoint: string | null
  daysSinceTouchpoint: number | null
  touchpointHealth: "On Track" | "Due Soon" | "Overdue" | "No Touchpoint Yet"
}

export type ClientWorkloadRow = {
  clientId: string
  clientName: string
  openCount: number
  overdueCount: number
  dueThisWeekCount: number
  pendingCount: number
}

export type DashboardMetrics = {
  dueToday: number
  dueThisWeek: number
  overdue: number
  pendingInternal: number
  pendingClient: number
  pendingExternal: number
  completedThisMonth: number
  completedThisWeek: number
  openWorkItems: number
  clientsOverdueForContact: number
  clientsWithNoTouchpointThisMonth: number
}

export type DashboardData = {
  metrics: DashboardMetrics
  openItems: DashboardWorkItem[]
  dueTodayItems: DashboardWorkItem[]
  completedThisWeekItems: DashboardWorkItem[]
  completedThisMonthItems: DashboardWorkItem[]
  overdueItems: DashboardWorkItem[]
  dueThisWeekItems: DashboardWorkItem[]
  pendingItems: {
    internal: DashboardWorkItem[]
    client: DashboardWorkItem[]
    external: DashboardWorkItem[]
  }
  planningGaps: {
    noWorkThisWeek: PlanningGapClientRow[]
    noWorkThisMonth: PlanningGapClientRow[]
    unassignedItems: DashboardWorkItem[]
    missingDueDateItems: DashboardWorkItem[]
  }
  touchpointRisk: {
    overdueForContact: TouchpointRiskClientRow[]
    noTouchpointThisMonth: TouchpointRiskClientRow[]
  }
  teamWorkload: TeamWorkloadRow[]
  clientWorkload: ClientWorkloadRow[]
}

function getSGDateParts(input: Date) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: SG_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })

  const parts = formatter.formatToParts(input)
  const year = Number(parts.find((part) => part.type === "year")?.value)
  const month = Number(parts.find((part) => part.type === "month")?.value)
  const day = Number(parts.find((part) => part.type === "day")?.value)

  return { year, month, day }
}

function toIsoDate(parts: DateParts) {
  const month = String(parts.month).padStart(2, "0")
  const day = String(parts.day).padStart(2, "0")
  return `${parts.year}-${month}-${day}`
}

function isoToUTCDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function shiftIsoDate(iso: string, days: number) {
  const date = isoToUTCDate(iso)
  date.setUTCDate(date.getUTCDate() + days)
  return toIsoDate({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  })
}

function getTodayAndWeekWindow() {
  const todayParts = getSGDateParts(new Date())
  const today = toIsoDate(todayParts)
  const todayDay = isoToUTCDate(today).getUTCDay() // 0=Sun ... 6=Sat
  const mondayOffset = todayDay === 0 ? 6 : todayDay - 1

  const weekStart = shiftIsoDate(today, -mondayOffset)
  const weekEnd = shiftIsoDate(weekStart, 6)
  const monthKey = `${today.slice(0, 7)}`
  const monthStart = `${monthKey}-01`
  const nextMonthDate = new Date(Date.UTC(todayParts.year, todayParts.month, 1))
  const nextMonthParts = getSGDateParts(nextMonthDate)
  const nextMonthStart = toIsoDate(nextMonthParts)
  const monthEnd = shiftIsoDate(nextMonthStart, -1)

  return { today, weekStart, weekEnd, monthKey, monthStart, monthEnd }
}

function isDeliverableOpen(status: string) {
  return !DELIVERABLE_NON_ACTIVE_STATUSES.has(status)
}

function isTaskOpen(status: string) {
  return !TASK_NON_ACTIVE_STATUSES.has(status)
}

function isOpenItem(item: DashboardWorkItem) {
  if (item.itemType === "Deliverable") return isDeliverableOpen(item.status)
  return isTaskOpen(item.status)
}

function isOverdue(item: DashboardWorkItem, today: string) {
  if (!isOpenItem(item)) return false
  if (!item.dueDate) return false
  if (item.itemType === "Deliverable" && DELIVERABLE_OVERDUE_EXCLUDED_STATUSES.has(item.status)) return false
  return item.dueDate < today || item.status === "Overdue"
}

function isDueThisWeek(item: DashboardWorkItem, weekStart: string, weekEnd: string) {
  if (!item.dueDate) return false
  return isOpenItem(item) && item.dueDate >= weekStart && item.dueDate <= weekEnd
}

function sortByDueDate(items: DashboardWorkItem[]) {
  return [...items].sort((a, b) => (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31"))
}

export async function getDashboardData(filters: DashboardFilters): Promise<DashboardData> {
  const auth = await requireAuth()
  const supabase = await createClient()
  const { today, weekStart, weekEnd, monthKey, monthStart, monthEnd } = getTodayAndWeekWindow()

  const effectivePicId = filters.my_items_only ? auth.profile.user_id : filters.pic_id

  let deliverablesQuery = supabase.from("deliverables").select("*")
  if (filters.client_id) deliverablesQuery = deliverablesQuery.eq("client_id", filters.client_id)
  if (effectivePicId) deliverablesQuery = deliverablesQuery.eq("pic_id", effectivePicId)
  if (filters.category) deliverablesQuery = deliverablesQuery.eq("category", filters.category)
  if (filters.status) deliverablesQuery = deliverablesQuery.eq("status", filters.status)

  let tasksQuery = supabase.from("tasks").select("*")
  if (filters.client_id) tasksQuery = tasksQuery.eq("client_id", filters.client_id)
  if (effectivePicId) tasksQuery = tasksQuery.eq("pic_id", effectivePicId)
  if (filters.category) tasksQuery = tasksQuery.eq("category", filters.category)
  if (filters.status) tasksQuery = tasksQuery.eq("status", filters.status)

  const [deliverablesRes, tasksRes, usersRes, clientsRes] = await Promise.all([
    deliverablesQuery,
    tasksQuery,
    supabase.from("users").select("user_id, full_name").eq("is_active", true),
    supabase
      .from("clients")
      .select("client_id, client_name, client_type, status, health_status, internal_pic_id, backup_pic_id, last_client_touchpoint, touchpoint_overdue_days"),
  ])

  if (deliverablesRes.error) throw new Error(deliverablesRes.error.message)
  if (tasksRes.error) throw new Error(tasksRes.error.message)
  if (usersRes.error) throw new Error(usersRes.error.message)
  if (clientsRes.error) throw new Error(clientsRes.error.message)

  const deliverables = (deliverablesRes.data ?? []) as DeliverableRow[]
  const tasks = (tasksRes.data ?? []) as TaskRow[]
  const users = usersRes.data ?? []
  const clients = clientsRes.data ?? []

  const userMap = new Map<string, string>(users.map((row) => [row.user_id as string, row.full_name as string]))
  const clientMap = new Map<string, string>(clients.map((row) => [row.client_id as string, row.client_name as string]))

  const workItems: DashboardWorkItem[] = [
    ...deliverables.map((row) => ({
      itemType: "Deliverable" as const,
      itemId: row.deliverable_id,
      clientId: row.client_id,
      clientName: clientMap.get(row.client_id) ?? "-",
      itemName: row.deliverable_name,
      status: row.status,
      priority: row.priority,
      category: row.category,
      picId: row.pic_id ?? null,
      picName: userMap.get(row.pic_id) ?? "-",
      dueDate: row.due_date ?? null,
      latestUpdate: row.notes,
      completionDate: row.completion_date,
    })),
    ...tasks.map((row) => ({
      itemType: "Task" as const,
      itemId: row.task_id,
      clientId: row.client_id,
      clientName: row.client_id ? clientMap.get(row.client_id) ?? "-" : "Global Internal",
      itemName: row.task_title,
      status: row.status,
      priority: row.priority,
      category: row.category,
      picId: row.pic_id ?? null,
      picName: userMap.get(row.pic_id) ?? "-",
      dueDate: row.due_date ?? null,
      latestUpdate: row.description,
      completionDate: row.completion_date,
    })),
  ]

  const openItems = workItems.filter(isOpenItem)
  const dueTodayItems = sortByDueDate(openItems.filter((item) => item.dueDate === today))
  const overdueItems = sortByDueDate(openItems.filter((item) => isOverdue(item, today)))
  const dueThisWeekItems = sortByDueDate(openItems.filter((item) => isDueThisWeek(item, weekStart, weekEnd)))

  const pendingInternal = sortByDueDate(workItems.filter((item) => item.status === "Pending Internal Review"))
  const pendingClient = sortByDueDate(workItems.filter((item) => item.status === "Pending Client Approval"))
  const pendingExternal = sortByDueDate(workItems.filter((item) => item.status === "Pending External Party"))

  const completedThisMonthItems = workItems.filter(
    (item) => item.status === "Completed" && item.completionDate && item.completionDate.startsWith(monthKey)
  )
  const completedThisWeekItems = sortByDueDate(
    workItems.filter(
      (item) =>
        item.status === "Completed" &&
        item.completionDate &&
        item.completionDate >= weekStart &&
        item.completionDate <= weekEnd
    )
  )

  const metrics: DashboardMetrics = {
    dueToday: dueTodayItems.length,
    dueThisWeek: openItems.filter((item) => isDueThisWeek(item, weekStart, weekEnd)).length,
    overdue: overdueItems.length,
    pendingInternal: pendingInternal.length,
    pendingClient: pendingClient.length,
    pendingExternal: pendingExternal.length,
    completedThisMonth: completedThisMonthItems.length,
    completedThisWeek: completedThisWeekItems.length,
    openWorkItems: openItems.length,
    clientsOverdueForContact: 0,
    clientsWithNoTouchpointThisMonth: 0,
  }

  const workByClientForWeek = new Set(
    workItems
      .filter((item) => item.clientId && item.dueDate && item.dueDate >= weekStart && item.dueDate <= weekEnd)
      .map((item) => item.clientId as string)
  )

  const workByClientForMonth = new Set(
    workItems
      .filter((item) => item.clientId && item.dueDate && item.dueDate >= monthStart && item.dueDate <= monthEnd)
      .map((item) => item.clientId as string)
  )

  let scopedClients = clients
  if (filters.client_id) {
    scopedClients = scopedClients.filter((client) => client.client_id === filters.client_id)
  }
  if (effectivePicId) {
    scopedClients = scopedClients.filter(
      (client) => client.internal_pic_id === effectivePicId || client.backup_pic_id === effectivePicId
    )
  }

  const activeClients = scopedClients.filter((client) => client.status === "Active")
  const mapPlanningClient = (client: (typeof activeClients)[number]): PlanningGapClientRow => ({
    clientId: client.client_id as string,
    clientName: client.client_name as string,
    clientType: client.client_type as string,
    picName: userMap.get(client.internal_pic_id as string) ?? "-",
    healthStatus: client.health_status as string,
    lastTouchpoint: (client.last_client_touchpoint as string | null) ?? null,
  })

  const noWorkThisWeek = activeClients
    .filter((client) => !workByClientForWeek.has(client.client_id as string))
    .map(mapPlanningClient)
    .sort((a, b) => a.clientName.localeCompare(b.clientName))

  const noWorkThisMonth = activeClients
    .filter((client) => !workByClientForMonth.has(client.client_id as string))
    .map(mapPlanningClient)
    .sort((a, b) => a.clientName.localeCompare(b.clientName))

  const touchpointRiskRows = activeClients
    .map((client) => {
      const clientId = client.client_id as string
      const lastTouchpoint = (client.last_client_touchpoint as string | null) ?? null
      const touchpointOverdueDays = Number(client.touchpoint_overdue_days as number)
      return {
        clientId,
        clientName: client.client_name as string,
        clientType: client.client_type as string,
        picId: client.internal_pic_id as string,
        picName: userMap.get(client.internal_pic_id as string) ?? "-",
        lastTouchpoint,
        daysSinceTouchpoint: daysSinceDateInSingapore(lastTouchpoint),
        touchpointHealth: getTouchpointHealth(lastTouchpoint, touchpointOverdueDays),
      } as TouchpointRiskClientRow
    })
    .sort((a, b) => a.clientName.localeCompare(b.clientName))

  const overdueForContact = touchpointRiskRows
    .filter((row) => row.touchpointHealth === "Overdue" || row.touchpointHealth === "No Touchpoint Yet")
    .sort((a, b) => {
      const aDays = a.daysSinceTouchpoint ?? Number.MAX_SAFE_INTEGER
      const bDays = b.daysSinceTouchpoint ?? Number.MAX_SAFE_INTEGER
      if (bDays !== aDays) return bDays - aDays
      return a.clientName.localeCompare(b.clientName)
    })

  const noTouchpointThisMonth = touchpointRiskRows.filter(
    (row) => !row.lastTouchpoint || !row.lastTouchpoint.startsWith(monthKey)
  )

  metrics.clientsOverdueForContact = overdueForContact.length
  metrics.clientsWithNoTouchpointThisMonth = noTouchpointThisMonth.length

  let unassignedDeliverablesQuery = supabase.from("deliverables").select("*").is("pic_id", null)
  let unassignedTasksQuery = supabase.from("tasks").select("*").is("pic_id", null)
  let missingDueDeliverablesQuery = supabase.from("deliverables").select("*").is("due_date", null)
  let missingDueTasksQuery = supabase.from("tasks").select("*").is("due_date", null)

  if (filters.client_id) {
    unassignedDeliverablesQuery = unassignedDeliverablesQuery.eq("client_id", filters.client_id)
    unassignedTasksQuery = unassignedTasksQuery.eq("client_id", filters.client_id)
    missingDueDeliverablesQuery = missingDueDeliverablesQuery.eq("client_id", filters.client_id)
    missingDueTasksQuery = missingDueTasksQuery.eq("client_id", filters.client_id)
  }
  if (filters.category) {
    unassignedDeliverablesQuery = unassignedDeliverablesQuery.eq("category", filters.category)
    unassignedTasksQuery = unassignedTasksQuery.eq("category", filters.category)
    missingDueDeliverablesQuery = missingDueDeliverablesQuery.eq("category", filters.category)
    missingDueTasksQuery = missingDueTasksQuery.eq("category", filters.category)
  }
  if (filters.status) {
    unassignedDeliverablesQuery = unassignedDeliverablesQuery.eq("status", filters.status)
    unassignedTasksQuery = unassignedTasksQuery.eq("status", filters.status)
    missingDueDeliverablesQuery = missingDueDeliverablesQuery.eq("status", filters.status)
    missingDueTasksQuery = missingDueTasksQuery.eq("status", filters.status)
  }
  if (effectivePicId) {
    missingDueDeliverablesQuery = missingDueDeliverablesQuery.eq("pic_id", effectivePicId)
    missingDueTasksQuery = missingDueTasksQuery.eq("pic_id", effectivePicId)
  }

  const [
    unassignedDeliverablesRes,
    unassignedTasksRes,
    missingDueDeliverablesRes,
    missingDueTasksRes,
  ] = effectivePicId
    ? [
        { data: [] as DeliverableRow[], error: null },
        { data: [] as TaskRow[], error: null },
        await missingDueDeliverablesQuery,
        await missingDueTasksQuery,
      ]
    : await Promise.all([
        unassignedDeliverablesQuery,
        unassignedTasksQuery,
        missingDueDeliverablesQuery,
        missingDueTasksQuery,
      ])

  if (unassignedDeliverablesRes.error) throw new Error(unassignedDeliverablesRes.error.message)
  if (unassignedTasksRes.error) throw new Error(unassignedTasksRes.error.message)
  if (missingDueDeliverablesRes.error) throw new Error(missingDueDeliverablesRes.error.message)
  if (missingDueTasksRes.error) throw new Error(missingDueTasksRes.error.message)

  const toMappedWorkItems = (deliverableRows: DeliverableRow[], taskRows: TaskRow[]): DashboardWorkItem[] => [
    ...deliverableRows.map((row) => ({
      itemType: "Deliverable" as const,
      itemId: row.deliverable_id,
      clientId: row.client_id,
      clientName: clientMap.get(row.client_id) ?? "-",
      itemName: row.deliverable_name,
      status: row.status,
      priority: row.priority,
      category: row.category,
      picId: row.pic_id ?? null,
      picName: userMap.get(row.pic_id) ?? "-",
      dueDate: row.due_date ?? null,
      latestUpdate: row.notes,
      completionDate: row.completion_date,
    })),
    ...taskRows.map((row) => ({
      itemType: "Task" as const,
      itemId: row.task_id,
      clientId: row.client_id,
      clientName: row.client_id ? clientMap.get(row.client_id) ?? "-" : "Global Internal",
      itemName: row.task_title,
      status: row.status,
      priority: row.priority,
      category: row.category,
      picId: row.pic_id ?? null,
      picName: userMap.get(row.pic_id) ?? "-",
      dueDate: row.due_date ?? null,
      latestUpdate: row.description,
      completionDate: row.completion_date,
    })),
  ]

  const unassignedItems = toMappedWorkItems(
    (unassignedDeliverablesRes.data ?? []) as DeliverableRow[],
    (unassignedTasksRes.data ?? []) as TaskRow[]
  )
  const missingDueDateItems = toMappedWorkItems(
    (missingDueDeliverablesRes.data ?? []) as DeliverableRow[],
    (missingDueTasksRes.data ?? []) as TaskRow[]
  )

  const teamMap = new Map<string, TeamWorkloadRow>()
  for (const item of openItems) {
    const picKey = item.picId ?? "unassigned"
    const current = teamMap.get(picKey) ?? {
      picId: picKey,
      picName: item.picId ? item.picName : "Unassigned",
      openCount: 0,
      overdueCount: 0,
      dueThisWeekCount: 0,
      pendingCount: 0,
    }

    current.openCount += 1
    if (isOverdue(item, today)) current.overdueCount += 1
    if (isDueThisWeek(item, weekStart, weekEnd)) current.dueThisWeekCount += 1
    if (
      item.status === "Pending Internal Review" ||
      item.status === "Pending Client Approval" ||
      item.status === "Pending External Party"
    ) {
      current.pendingCount += 1
    }

    teamMap.set(picKey, current)
  }

  const teamWorkload = [...teamMap.values()].sort((a, b) => {
    if (b.openCount !== a.openCount) return b.openCount - a.openCount
    if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount
    return a.picName.localeCompare(b.picName)
  })

  const clientMapAgg = new Map<string, ClientWorkloadRow>()
  for (const item of openItems) {
    if (!item.clientId) continue

    const current = clientMapAgg.get(item.clientId) ?? {
      clientId: item.clientId,
      clientName: item.clientName,
      openCount: 0,
      overdueCount: 0,
      dueThisWeekCount: 0,
      pendingCount: 0,
    }

    current.openCount += 1
    if (isOverdue(item, today)) current.overdueCount += 1
    if (isDueThisWeek(item, weekStart, weekEnd)) current.dueThisWeekCount += 1
    if (
      item.status === "Pending Internal Review" ||
      item.status === "Pending Client Approval" ||
      item.status === "Pending External Party"
    ) {
      current.pendingCount += 1
    }

    clientMapAgg.set(item.clientId, current)
  }

  const clientWorkload = [...clientMapAgg.values()].sort((a, b) => {
    if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount
    if (b.openCount !== a.openCount) return b.openCount - a.openCount
    return a.clientName.localeCompare(b.clientName)
  })

  return {
    metrics,
    openItems: sortByDueDate(openItems),
    dueTodayItems,
    completedThisWeekItems,
    completedThisMonthItems,
    overdueItems,
    dueThisWeekItems,
    pendingItems: {
      internal: pendingInternal,
      client: pendingClient,
      external: pendingExternal,
    },
    planningGaps: {
      noWorkThisWeek,
      noWorkThisMonth,
      unassignedItems,
      missingDueDateItems,
    },
    touchpointRisk: {
      overdueForContact,
      noTouchpointThisMonth,
    },
    teamWorkload,
    clientWorkload,
  }
}
