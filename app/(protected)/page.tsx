import Link from "next/link"

import { Button } from "@/components/ui/button"
import { PlanningGapClientsPanel } from "@/components/dashboard/planning-gap-clients-panel"
import { DashboardTouchpointRiskPanel } from "@/components/dashboard/dashboard-touchpoint-risk-panel"
import { DashboardWorkItemsPanel } from "@/components/dashboard/dashboard-work-items-panel"
import { ActionFeedback } from "@/components/ui/action-feedback"
import {
  EmptyState,
  FilterBar,
  MetricCard,
  PageHeader,
  SectionCard,
} from "@/components/ui/patterns"
import { requireAuth } from "@/lib/auth"
import { listClients, getUsersForClientAssignments } from "@/lib/data/clients"
import {
  getDashboardData,
  type DashboardFilters,
  type DashboardWorkItem,
} from "@/lib/data/dashboard"
import { createClient } from "@/lib/supabase/server"
import { cn } from "@/lib/utils"
import {
  CATEGORY_TYPES,
  DELIVERABLE_STATUSES,
  TASK_STATUSES,
} from "@/types/domain"

type SearchParams = {
  client_id?: string
  pic_id?: string
  category?: string
  status?: string
  my_items_only?: string
  focus?: string
  feedback?: string
  message?: string
}

const DASHBOARD_STATUSES = Array.from(new Set([...DELIVERABLE_STATUSES, ...TASK_STATUSES]))
const ACTION_QUEUE_LIMIT = 10
const DETAIL_LIST_LIMIT = 10
const RISK_CLIENT_LIMIT = 10

function toDashboardFilters(searchParams?: SearchParams): DashboardFilters {
  return {
    client_id: searchParams?.client_id || undefined,
    pic_id: searchParams?.pic_id || undefined,
    category: searchParams?.category || undefined,
    status: searchParams?.status || undefined,
    my_items_only: searchParams?.my_items_only === "true",
  }
}

function getSGTodayIso() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"
  return `${year}-${month}-${day}`
}

function workItemKey(item: DashboardWorkItem) {
  return `${item.itemType}-${item.itemId}`
}

function buildDashboardHref(searchParams: SearchParams | undefined, focus: string, hash: string) {
  const urlParams = new URLSearchParams()
  if (searchParams?.client_id) urlParams.set("client_id", searchParams.client_id)
  if (searchParams?.pic_id) urlParams.set("pic_id", searchParams.pic_id)
  if (searchParams?.category) urlParams.set("category", searchParams.category)
  if (searchParams?.status) urlParams.set("status", searchParams.status)
  if (searchParams?.my_items_only === "true") urlParams.set("my_items_only", "true")
  urlParams.set("focus", focus)
  return `/?${urlParams.toString()}#${hash}`
}

function ClickableMetricCard({
  label,
  value,
  href,
  urgent = false,
}: {
  label: string
  value: number
  href: string
  urgent?: boolean
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-md border p-2.5 transition-colors",
        urgent
          ? "border-status-red bg-status-red-bg hover:bg-status-red-bg/80"
          : "border-border bg-white hover:bg-slate-50"
      )}
    >
      {urgent ? (
        <>
          <p className="text-[11px] uppercase tracking-wide text-status-red">{label}</p>
          <p className="mt-1 text-base font-semibold text-status-red">{value}</p>
        </>
      ) : (
        <>
          <p className="text-[11px] uppercase tracking-wide text-text-secondary">{label}</p>
          <p className="mt-1 text-base font-semibold text-navy">{value}</p>
        </>
      )}
      <p className="mt-1 text-[11px] font-medium text-text-secondary group-hover:text-navy">View items {"->"}</p>
    </Link>
  )
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: SearchParams | Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const filters = toDashboardFilters(resolvedSearchParams)
  const focus = resolvedSearchParams?.focus
  const auth = await requireAuth()
  const supabase = await createClient()

  const [dashboard, clients, users] = await Promise.all([
    getDashboardData(filters),
    listClients({}),
    getUsersForClientAssignments(),
  ])

  const returnToParams = new URLSearchParams()
  if (resolvedSearchParams?.client_id) returnToParams.set("client_id", resolvedSearchParams.client_id)
  if (resolvedSearchParams?.pic_id) returnToParams.set("pic_id", resolvedSearchParams.pic_id)
  if (resolvedSearchParams?.category) returnToParams.set("category", resolvedSearchParams.category)
  if (resolvedSearchParams?.status) returnToParams.set("status", resolvedSearchParams.status)
  if (resolvedSearchParams?.my_items_only === "true") returnToParams.set("my_items_only", "true")
  if (resolvedSearchParams?.focus) returnToParams.set("focus", resolvedSearchParams.focus)
  const returnTo = returnToParams.toString().length > 0 ? `/?${returnToParams.toString()}` : "/"

  const riskClientIds = Array.from(
    new Set([
      ...dashboard.touchpointRisk.overdueForContact.map((row) => row.clientId),
      ...dashboard.touchpointRisk.noTouchpointThisMonth.map((row) => row.clientId),
    ])
  )

  let communicationPreviewMap: Record<
    string,
    { commLogId: string; commDate: string; channel: string; direction: string; counterpartName: string; summary: string }[]
  > = {}

  if (riskClientIds.length > 0) {
    const { data: communicationLogs, error: commError } = await supabase
      .from("client_communication_logs")
      .select("comm_log_id, client_id, comm_date, channel, direction, counterpart_name, summary")
      .in("client_id", riskClientIds)
      .order("comm_date", { ascending: false })
      .limit(200)

    if (!commError) {
      communicationPreviewMap = (communicationLogs ?? []).reduce(
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
        {} as Record<
          string,
          { commLogId: string; commDate: string; channel: string; direction: string; counterpartName: string; summary: string }[]
        >
      )
    }
  }

  const todaySG = getSGTodayIso()
  const overdueKeys = new Set(dashboard.overdueItems.map(workItemKey))

  const isCriticalPriority = (priority: string) => priority === "Critical"
  const isHighPriority = (priority: string) => priority === "High"
  const isPendingClient = (item: DashboardWorkItem) => item.status === "Pending Client Approval"
  const isDueToday = (item: DashboardWorkItem) => item.dueDate === todaySG

  const actionQueueCandidates = dashboard.openItems.filter((item) => {
    return (
      overdueKeys.has(workItemKey(item)) ||
      isDueToday(item) ||
      isPendingClient(item) ||
      isCriticalPriority(item.priority) ||
      isHighPriority(item.priority)
    )
  })

  const getActionRank = (item: DashboardWorkItem) => {
    if (overdueKeys.has(workItemKey(item))) return 0
    if (isDueToday(item)) return 1
    if (isPendingClient(item)) return 2
    if (isCriticalPriority(item.priority)) return 3
    if (isHighPriority(item.priority)) return 4
    return 5
  }

  const actionQueue = [...actionQueueCandidates]
    .sort((a, b) => {
      const rankDiff = getActionRank(a) - getActionRank(b)
      if (rankDiff !== 0) return rankDiff
      return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31")
    })
    .slice(0, ACTION_QUEUE_LIMIT)

  const pendingTotal =
    dashboard.pendingItems.internal.length + dashboard.pendingItems.client.length + dashboard.pendingItems.external.length

  const clientRiskRows = [...dashboard.clientWorkload].sort((a, b) => {
    if (b.overdueCount !== a.overdueCount) return b.overdueCount - a.overdueCount
    if (b.pendingCount !== a.pendingCount) return b.pendingCount - a.pendingCount
    if (b.openCount !== a.openCount) return b.openCount - a.openCount
    return a.clientName.localeCompare(b.clientName)
  })

  let focusedTitle = ""
  let focusedRows: DashboardWorkItem[] = []

  if (focus === "due_today") {
    focusedTitle = "Due Today Items"
    focusedRows = dashboard.dueTodayItems
  } else if (focus === "due_this_week") {
    focusedTitle = "Due This Week Items"
    focusedRows = dashboard.dueThisWeekItems
  } else if (focus === "overdue") {
    focusedTitle = "Overdue Items"
    focusedRows = dashboard.overdueItems
  } else if (focus === "pending_internal") {
    focusedTitle = "Pending Internal Review Items"
    focusedRows = dashboard.pendingItems.internal
  } else if (focus === "pending_client") {
    focusedTitle = "Pending Client Approval Items"
    focusedRows = dashboard.pendingItems.client
  } else if (focus === "pending_external") {
    focusedTitle = "Pending External Party Items"
    focusedRows = dashboard.pendingItems.external
  } else if (focus === "completed_this_month") {
    focusedTitle = "Completed This Month Items"
    focusedRows = dashboard.completedThisMonthItems
  } else if (focus === "open_work_items") {
    focusedTitle = "Open Work Items"
    focusedRows = dashboard.openItems
  }

  return (
    <div className="space-y-6">
      <ActionFeedback feedback={resolvedSearchParams?.feedback} message={resolvedSearchParams?.message} />
      <PageHeader title="Dashboard" description="Management visibility for due, overdue, pending, and workload across clients." />

      <SectionCard title="Summary Cards" description="Urgent and high-level work visibility.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ClickableMetricCard
            label="Due Today"
            value={dashboard.metrics.dueToday}
            href={buildDashboardHref(resolvedSearchParams, "due_today", "focused-view")}
          />
          <ClickableMetricCard
            label="Due This Week"
            value={dashboard.metrics.dueThisWeek}
            href={buildDashboardHref(resolvedSearchParams, "due_this_week", "due-this-week-items")}
          />
          <ClickableMetricCard
            label="Overdue"
            value={dashboard.metrics.overdue}
            href={buildDashboardHref(resolvedSearchParams, "overdue", "overdue-items")}
            urgent
          />
          <ClickableMetricCard
            label="Pending Internal"
            value={dashboard.metrics.pendingInternal}
            href={buildDashboardHref(resolvedSearchParams, "pending_internal", "pending-items")}
          />
          <ClickableMetricCard
            label="Pending Client"
            value={dashboard.metrics.pendingClient}
            href={buildDashboardHref(resolvedSearchParams, "pending_client", "pending-items")}
          />
          <ClickableMetricCard
            label="Pending External"
            value={dashboard.metrics.pendingExternal}
            href={buildDashboardHref(resolvedSearchParams, "pending_external", "pending-items")}
          />
          <ClickableMetricCard
            label="Completed This Month"
            value={dashboard.metrics.completedThisMonth}
            href={buildDashboardHref(resolvedSearchParams, "completed_this_month", "focused-view")}
          />
          <ClickableMetricCard
            label="Open Work Items"
            value={dashboard.metrics.openWorkItems}
            href={buildDashboardHref(resolvedSearchParams, "open_work_items", "focused-view")}
          />
        </div>
      </SectionCard>

      <SectionCard title="Filters">
        <details open={Boolean(resolvedSearchParams?.client_id || resolvedSearchParams?.pic_id || resolvedSearchParams?.category || resolvedSearchParams?.status || resolvedSearchParams?.my_items_only === "true")}>
          <summary className="cursor-pointer text-sm font-medium text-navy">Show filters</summary>
          <div className="mt-3">
            <FilterBar>
              <form method="get" className="grid grid-cols-1 gap-2 md:grid-cols-6">
                <select name="client_id" defaultValue={resolvedSearchParams?.client_id ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
                  <option value="">All Clients</option>
                  {clients.map((client) => (
                    <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                  ))}
                </select>

                <select name="pic_id" defaultValue={resolvedSearchParams?.pic_id ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
                  <option value="">All PIC</option>
                  {users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>{user.full_name}</option>
                  ))}
                </select>

                <select name="category" defaultValue={resolvedSearchParams?.category ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
                  <option value="">All Categories</option>
                  {CATEGORY_TYPES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>

                <select name="status" defaultValue={resolvedSearchParams?.status ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
                  <option value="">All Status</option>
                  {DASHBOARD_STATUSES.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>

                <label className="flex h-9 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm text-text-primary">
                  <input
                    type="checkbox"
                    name="my_items_only"
                    value="true"
                    defaultChecked={resolvedSearchParams?.my_items_only === "true"}
                  />
                  My Items Only
                </label>

                <div className="flex h-9 gap-2">
                  <Button type="submit" variant="secondary" className="h-9">Apply Filters</Button>
                  <Button type="button" variant="ghost" asChild className="h-9"><Link href="/">Reset</Link></Button>
                </div>
              </form>
            </FilterBar>
          </div>
        </details>
      </SectionCard>

      <div id="today-action-queue">
        <SectionCard title="Today's Action Queue" description="Top urgent items for daily triage across deliverables and tasks.">
          <DashboardWorkItemsPanel
            rows={actionQueue}
            emptyTitle="No urgent action items"
            emptyDescription="No overdue, due today, pending client, or high-priority items for current filters."
            desktopTwoColumn
            currentUserId={auth.profile.user_id}
            currentRole={auth.profile.role}
            returnTo={returnTo}
            deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
            taskStatusOptions={Array.from(TASK_STATUSES)}
          />
        </SectionCard>
      </div>

      {focusedTitle ? (
        <div id="focused-view">
          <SectionCard title={focusedTitle} description="Actionable list from your selected summary card.">
            <DashboardWorkItemsPanel
              rows={focusedRows}
              emptyTitle={`No ${focusedTitle.toLowerCase()}`}
              emptyDescription="There are no matching items for current filters."
              limit={DETAIL_LIST_LIMIT}
              highlightOverdue={focus === "overdue"}
              currentUserId={auth.profile.user_id}
              currentRole={auth.profile.role}
              returnTo={returnTo}
              deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
              taskStatusOptions={Array.from(TASK_STATUSES)}
            />
          </SectionCard>
        </div>
      ) : null}

      <div id="planning-gaps">
        <SectionCard title="Planning Gaps" description="Clients and work items that may need planning or assignment attention.">
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-navy">Active Clients With No Work This Week</h3>
              <PlanningGapClientsPanel
                rows={dashboard.planningGaps.noWorkThisWeek}
                emptyTitle="No weekly planning gaps"
                emptyDescription="All active clients have at least one deliverable or task due this week."
                limit={DETAIL_LIST_LIMIT}
                compactEmptyState
                showQuickActions
                returnTo={returnTo}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-navy">Active Clients With No Work This Month</h3>
              <PlanningGapClientsPanel
                rows={dashboard.planningGaps.noWorkThisMonth}
                emptyTitle="No monthly planning gaps"
                emptyDescription="All active clients have at least one deliverable or task due this month."
                limit={DETAIL_LIST_LIMIT}
                compactEmptyState
                showQuickActions
                returnTo={returnTo}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-navy">Unassigned Work Items</h3>
              <DashboardWorkItemsPanel
                rows={dashboard.planningGaps.unassignedItems}
                emptyTitle="No unassigned work items."
                emptyDescription="PIC assignment is complete for all visible work items."
                limit={DETAIL_LIST_LIMIT}
                compactEmptyState
                currentUserId={auth.profile.user_id}
                currentRole={auth.profile.role}
                returnTo={returnTo}
                deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
                taskStatusOptions={Array.from(TASK_STATUSES)}
              />
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-navy">Items Without Due Date</h3>
              <DashboardWorkItemsPanel
                rows={dashboard.planningGaps.missingDueDateItems}
                emptyTitle="No items missing due date."
                emptyDescription="All visible work items have due dates."
                limit={DETAIL_LIST_LIMIT}
                compactEmptyState
                currentUserId={auth.profile.user_id}
                currentRole={auth.profile.role}
                returnTo={returnTo}
                deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
                taskStatusOptions={Array.from(TASK_STATUSES)}
              />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Client Risk Summary" description="Prioritized follow-up risks requiring servicing attention.">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <MetricCard label="Clients Needing Follow-up" value={dashboard.metrics.clientsOverdueForContact} />
          <MetricCard label="No Contact This Month" value={dashboard.metrics.clientsWithNoTouchpointThisMonth} />
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-navy">Clients Needing Follow-up</h3>
            <DashboardTouchpointRiskPanel
              rows={dashboard.touchpointRisk.overdueForContact}
              emptyTitle="No clients needing follow-up"
              emptyDescription="All visible clients are on track for follow-up."
              communicationPreviewMap={communicationPreviewMap}
              limit={DETAIL_LIST_LIMIT}
              compactEmptyState
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-navy">No Contact This Month</h3>
            <DashboardTouchpointRiskPanel
              rows={dashboard.touchpointRisk.noTouchpointThisMonth}
              emptyTitle="No monthly contact gaps"
              emptyDescription="All visible clients have contact logged this month."
              communicationPreviewMap={communicationPreviewMap}
              limit={DETAIL_LIST_LIMIT}
              compactEmptyState
            />
          </div>
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div id="overdue-items">
          <SectionCard
            title="Overdue Deliverables / Tasks"
            description="Most urgent items requiring immediate attention."
            className="border-status-red/40"
          >
            <DashboardWorkItemsPanel
              rows={dashboard.overdueItems}
              emptyTitle="No overdue items"
              emptyDescription="Great work. There are currently no overdue deliverables or tasks."
              highlightOverdue
              limit={DETAIL_LIST_LIMIT}
              compactEmptyState
              currentUserId={auth.profile.user_id}
              currentRole={auth.profile.role}
              returnTo={returnTo}
              deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
              taskStatusOptions={Array.from(TASK_STATUSES)}
            />
          </SectionCard>
        </div>

        <div id="due-this-week-items">
          <SectionCard title="Due This Week Deliverables / Tasks" description="Upcoming work due from Monday to Sunday (Asia/Singapore).">
            <DashboardWorkItemsPanel
              rows={dashboard.dueThisWeekItems}
              emptyTitle="No items due this week"
              emptyDescription="No upcoming due items for the selected scope."
              limit={DETAIL_LIST_LIMIT}
              compactEmptyState
              currentUserId={auth.profile.user_id}
              currentRole={auth.profile.role}
              returnTo={returnTo}
              deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
              taskStatusOptions={Array.from(TASK_STATUSES)}
            />
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div id="pending-items">
          <SectionCard title="Pending Items by Status" description="Items waiting on review, client, or external party.">
            <details open={pendingTotal <= DETAIL_LIST_LIMIT}>
              <summary className="cursor-pointer text-sm font-medium text-navy">
                {pendingTotal > DETAIL_LIST_LIMIT ? `Show pending items (${pendingTotal})` : "Pending items"}
              </summary>
              <div className="mt-3 space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-navy">Pending Internal Review</h3>
                  <DashboardWorkItemsPanel
                    rows={dashboard.pendingItems.internal}
                    emptyTitle="No pending internal review items."
                    emptyDescription="No items are pending internal review."
                    limit={DETAIL_LIST_LIMIT}
                    compactEmptyState
                    currentUserId={auth.profile.user_id}
                    currentRole={auth.profile.role}
                    returnTo={returnTo}
                    deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
                    taskStatusOptions={Array.from(TASK_STATUSES)}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-navy">Pending Client Approval</h3>
                  <DashboardWorkItemsPanel
                    rows={dashboard.pendingItems.client}
                    emptyTitle="No pending client approval items."
                    emptyDescription="No items are pending client approval."
                    limit={DETAIL_LIST_LIMIT}
                    compactEmptyState
                    currentUserId={auth.profile.user_id}
                    currentRole={auth.profile.role}
                    returnTo={returnTo}
                    deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
                    taskStatusOptions={Array.from(TASK_STATUSES)}
                  />
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-navy">Pending External Party</h3>
                  <DashboardWorkItemsPanel
                    rows={dashboard.pendingItems.external}
                    emptyTitle="No pending external party items."
                    emptyDescription="No items are pending external party follow-up."
                    limit={DETAIL_LIST_LIMIT}
                    compactEmptyState
                    currentUserId={auth.profile.user_id}
                    currentRole={auth.profile.role}
                    returnTo={returnTo}
                    deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
                    taskStatusOptions={Array.from(TASK_STATUSES)}
                  />
                </div>
              </div>
            </details>
          </SectionCard>
        </div>

        <SectionCard title="Team Workload by PIC" description="Open work distribution by owner.">
          {dashboard.teamWorkload.length === 0 ? (
            <p className="rounded-md border border-dashed border-border bg-slate-50 px-3 py-2 text-xs text-text-secondary">
              No open work items found for current filters.
            </p>
          ) : (
            <details>
              <summary className="cursor-pointer text-sm font-medium text-navy">
                Show team workload ({dashboard.teamWorkload.length})
              </summary>
              <div className="mt-3 space-y-2 sm:hidden">
                {dashboard.teamWorkload.slice(0, DETAIL_LIST_LIMIT).map((row) => (
                  <article key={row.picId} className="rounded-md border border-border/90 bg-white/92 p-2.5">
                    <p className="text-sm font-semibold text-text-primary">{row.picName}</p>
                    <p className="mt-1 text-xs text-text-secondary">
                      Open: <span className="font-medium text-text-primary">{row.openCount}</span>
                      {" | "}Overdue: <span className="font-medium text-text-primary">{row.overdueCount}</span>
                      {" | "}Due This Week: <span className="font-medium text-text-primary">{row.dueThisWeekCount}</span>
                      {" | "}Pending: <span className="font-medium text-text-primary">{row.pendingCount}</span>
                    </p>
                  </article>
                ))}
              </div>
              <div className="mt-3 hidden overflow-x-auto sm:block">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-text-secondary">
                    <tr>
                      <th className="px-3 py-2">PIC</th>
                      <th className="px-3 py-2">Open</th>
                      <th className="px-3 py-2">Overdue</th>
                      <th className="px-3 py-2">Due This Week</th>
                      <th className="px-3 py-2">Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboard.teamWorkload.slice(0, DETAIL_LIST_LIMIT).map((row) => (
                      <tr key={row.picId} className="border-b border-border hover:bg-slate-50">
                        <td className="px-3 py-3 font-medium text-text-primary">{row.picName}</td>
                        <td className="px-3 py-3">{row.openCount}</td>
                        <td className="px-3 py-3">{row.overdueCount}</td>
                        <td className="px-3 py-3">{row.dueThisWeekCount}</td>
                        <td className="px-3 py-3">{row.pendingCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {dashboard.teamWorkload.length > DETAIL_LIST_LIMIT ? (
                <p className="mt-2 text-xs text-text-secondary">Showing top {DETAIL_LIST_LIMIT} of {dashboard.teamWorkload.length} PIC rows.</p>
              ) : null}
            </details>
          )}
        </SectionCard>
      </div>

      <SectionCard title="Client Workload Summary" description="Client risk visibility sorted by overdue, pending, and open workload.">
        {clientRiskRows.length === 0 ? (
          <EmptyState title="No client workload data" description="No client-linked work items found for current filters." />
        ) : (
          <details>
            <summary className="cursor-pointer text-sm font-medium text-navy">
              Show client workload ({clientRiskRows.length})
            </summary>
            <div className="mt-3 space-y-2 sm:hidden">
              {clientRiskRows.slice(0, RISK_CLIENT_LIMIT).map((row) => (
                <article key={row.clientId} className="rounded-md border border-border/90 bg-white/92 p-2.5">
                  <p className="text-sm font-semibold text-navy">
                    <Link href={`/clients/${row.clientId}`}>{row.clientName}</Link>
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    Open: <span className="font-medium text-text-primary">{row.openCount}</span>
                    {" | "}Overdue: <span className="font-medium text-text-primary">{row.overdueCount}</span>
                    {" | "}Due This Week: <span className="font-medium text-text-primary">{row.dueThisWeekCount}</span>
                    {" | "}Pending: <span className="font-medium text-text-primary">{row.pendingCount}</span>
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-3 hidden overflow-x-auto sm:block">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-text-secondary">
                  <tr>
                    <th className="px-3 py-2">Client</th>
                    <th className="px-3 py-2">Open</th>
                    <th className="px-3 py-2">Overdue</th>
                    <th className="px-3 py-2">Due This Week</th>
                    <th className="px-3 py-2">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {clientRiskRows.slice(0, RISK_CLIENT_LIMIT).map((row) => (
                    <tr key={row.clientId} className="border-b border-border hover:bg-slate-50">
                      <td className="px-3 py-3 font-medium text-navy">
                        <Link href={`/clients/${row.clientId}`}>{row.clientName}</Link>
                      </td>
                      <td className="px-3 py-3">{row.openCount}</td>
                      <td className="px-3 py-3">{row.overdueCount}</td>
                      <td className="px-3 py-3">{row.dueThisWeekCount}</td>
                      <td className="px-3 py-3">{row.pendingCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {clientRiskRows.length > RISK_CLIENT_LIMIT ? (
              <p className="text-xs text-text-secondary">Showing top {RISK_CLIENT_LIMIT} of {clientRiskRows.length} clients.</p>
            ) : null}
          </details>
        )}
      </SectionCard>
    </div>
  )
}
