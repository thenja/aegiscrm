import Link from "next/link"

import { ActionFeedback } from "@/components/ui/action-feedback"
import { SectionCard, PageHeader } from "@/components/ui/patterns"
import { DashboardWorkItemsPanel } from "@/components/dashboard/dashboard-work-items-panel"
import { DashboardTouchpointRiskPanel } from "@/components/dashboard/dashboard-touchpoint-risk-panel"
import { PlanningGapClientsPanel } from "@/components/dashboard/planning-gap-clients-panel"
import { TeamWorkloadCompact } from "@/components/review/team-workload-compact"
import { ReviewPresetBar } from "@/components/review/review-preset-bar"
import { getUsersForClientAssignments, listClients } from "@/lib/data/clients"
import { getCommunicationPreviewMapByClientIds, getReviewData } from "@/lib/data/reviews"
import type { DashboardFilters } from "@/lib/data/dashboard"
import { DELIVERABLE_STATUSES, TASK_STATUSES, CATEGORY_TYPES } from "@/types/domain"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type SearchParams = {
  client_id?: string
  pic_id?: string
  category?: string
  status?: string
  my_items_only?: string
  preset?: string
  feedback?: string
  message?: string
}

const LIST_LIMIT = 10

type SummaryCard = {
  label: string
  value: number
  href: string
  urgent?: boolean
}

function buildSectionLink(searchParams: SearchParams | undefined, hash: string) {
  const params = new URLSearchParams()
  if (searchParams?.client_id) params.set("client_id", searchParams.client_id)
  if (searchParams?.pic_id) params.set("pic_id", searchParams.pic_id)
  if (searchParams?.category) params.set("category", searchParams.category)
  if (searchParams?.status) params.set("status", searchParams.status)
  if (searchParams?.my_items_only === "true") params.set("my_items_only", "true")
  if (searchParams?.preset) params.set("preset", searchParams.preset)
  const query = params.toString()
  return query.length > 0 ? `/weekly-review?${query}#${hash}` : `/weekly-review#${hash}`
}

function riskScore(healthStatus: string, touchpointHealth?: string) {
  if (healthStatus === "Critical") return 0
  if (healthStatus === "At Risk") return 1
  if (touchpointHealth === "No Touchpoint Yet") return 2
  if (touchpointHealth === "Due Soon") return 3
  return 4
}

function WeeklySummaryCard({ label, value, href, urgent = false }: SummaryCard) {
  return (
    <Link
      href={href}
      className={cn(
        "group block rounded-md border bg-white p-2.5 shadow-sm transition-colors hover:bg-slate-50",
        urgent ? "border-status-red/50 bg-status-red-bg/30" : "border-border"
      )}
    >
      <p className={cn("text-[11px] uppercase tracking-wide", urgent ? "text-status-red" : "text-text-secondary")}>{label}</p>
      <p className={cn("mt-1 text-base font-semibold", urgent ? "text-status-red" : "text-navy")}>{value}</p>
      <p className="mt-1 text-[11px] font-medium text-text-secondary group-hover:text-navy">Open section</p>
    </Link>
  )
}

function toFilters(searchParams?: SearchParams): DashboardFilters {
  return {
    client_id: searchParams?.client_id || undefined,
    pic_id: searchParams?.pic_id || undefined,
    category: searchParams?.category || undefined,
    status: searchParams?.status || undefined,
    my_items_only: searchParams?.my_items_only === "true",
  }
}

function buildReturnTo(searchParams?: SearchParams) {
  const params = new URLSearchParams()
  if (searchParams?.client_id) params.set("client_id", searchParams.client_id)
  if (searchParams?.pic_id) params.set("pic_id", searchParams.pic_id)
  if (searchParams?.category) params.set("category", searchParams.category)
  if (searchParams?.status) params.set("status", searchParams.status)
  if (searchParams?.my_items_only === "true") params.set("my_items_only", "true")
  if (searchParams?.preset) params.set("preset", searchParams.preset)
  const qs = params.toString()
  return qs.length > 0 ? `/weekly-review?${qs}` : "/weekly-review"
}

export default async function WeeklyReviewPage({ searchParams }: { searchParams?: SearchParams }) {
  const baseFilters = toFilters(searchParams)
  const [{ auth, data }, users, clients] = await Promise.all([
    getReviewData(baseFilters, { preset: searchParams?.preset }),
    getUsersForClientAssignments(),
    listClients({}),
  ])

  const returnTo = buildReturnTo(searchParams)
  const preset = searchParams?.preset
  const dueThisWeekRows = preset === "due_this_week" ? data.dueThisWeekItems : data.dueThisWeekItems
  const overdueRows = preset === "my_overdue" ? data.overdueItems.filter((item) => item.picId === auth.profile.user_id) : data.overdueItems
  const noContactRows =
    preset === "no_contact_yet"
      ? data.touchpointRisk.noTouchpointThisMonth.filter((row) => row.touchpointHealth === "No Touchpoint Yet")
      : data.touchpointRisk.noTouchpointThisMonth
  const communicationPreviewMap = await getCommunicationPreviewMapByClientIds(noContactRows.map((row) => row.clientId))
  const noWorkThisWeekRows = preset === "no_work_planned" ? data.planningGaps.noWorkThisWeek : data.planningGaps.noWorkThisWeek
  const noWorkThisMonthRows = preset === "no_work_planned" ? data.planningGaps.noWorkThisMonth : data.planningGaps.noWorkThisMonth
  const showTeamFilters = auth.profile.role === "Director" || auth.profile.role === "Team Lead"

  const noContactMap = new Map(noContactRows.map((row) => [row.clientId, row]))

  const sortPlanningGapRows = <T extends { clientId: string; healthStatus: string; clientName: string }>(rows: T[]) => {
    return [...rows].sort((a, b) => {
      const aTouchpoint = noContactMap.get(a.clientId)?.touchpointHealth
      const bTouchpoint = noContactMap.get(b.clientId)?.touchpointHealth
      const scoreDiff = riskScore(a.healthStatus, aTouchpoint) - riskScore(b.healthStatus, bTouchpoint)
      if (scoreDiff !== 0) return scoreDiff
      return a.clientName.localeCompare(b.clientName)
    })
  }

  const sortedNoWorkThisWeekRows = sortPlanningGapRows(noWorkThisWeekRows)
  const sortedNoWorkThisMonthRows = sortPlanningGapRows(noWorkThisMonthRows)
  const summaryCards: SummaryCard[] = [
    { label: "Overdue", value: overdueRows.length, href: buildSectionLink(searchParams, "critical-weekly-issues"), urgent: overdueRows.length > 0 },
    { label: "Due This Week", value: dueThisWeekRows.length, href: buildSectionLink(searchParams, "work-due-this-week") },
    { label: "No Planned Work This Week", value: sortedNoWorkThisWeekRows.length, href: buildSectionLink(searchParams, "no-work-this-week"), urgent: sortedNoWorkThisWeekRows.length > 0 },
    { label: "No Contact This Month", value: noContactRows.length, href: buildSectionLink(searchParams, "critical-weekly-issues"), urgent: noContactRows.length > 0 },
    { label: "Completed This Week", value: data.completedThisWeekItems.length, href: buildSectionLink(searchParams, "completed-this-week") },
  ]

  return (
    <div className="space-y-4">
      <ActionFeedback feedback={searchParams?.feedback} message={searchParams?.message} />
      <PageHeader
        title="Weekly Review"
        description="Compact weekly servicing review for coverage gaps, overdue carry-forward, and team workload."
      />

      <SectionCard title="Weekly Summary Cards" description="Click any card to jump to that section.">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
          {summaryCards.map((card) => (
            <WeeklySummaryCard key={card.label} {...card} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Review Controls">
        <ReviewPresetBar
          basePath="/weekly-review"
          activePreset={searchParams?.preset}
          preserveParams={{
            client_id: searchParams?.client_id,
            pic_id: searchParams?.pic_id,
            category: searchParams?.category,
            status: searchParams?.status,
          }}
        />

        <details className="mt-3" open={Boolean(searchParams?.client_id || searchParams?.pic_id || searchParams?.category || searchParams?.status)}>
          <summary className="cursor-pointer text-sm font-medium text-navy">Filters</summary>
          <form method="get" className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-5">
            {searchParams?.preset ? <input type="hidden" name="preset" value={searchParams.preset} /> : null}
            <select name="client_id" defaultValue={searchParams?.client_id ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
              ))}
            </select>
            <select name="category" defaultValue={searchParams?.category ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
              <option value="">All Categories</option>
              {CATEGORY_TYPES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            <select name="status" defaultValue={searchParams?.status ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
              <option value="">All Status</option>
              {[...new Set([...DELIVERABLE_STATUSES, ...TASK_STATUSES])].map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {showTeamFilters ? (
              <select name="pic_id" defaultValue={searchParams?.pic_id ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
                <option value="">All Owners</option>
                {users.map((user) => (
                  <option key={user.user_id} value={user.user_id}>{user.full_name}</option>
                ))}
              </select>
            ) : (
              <input type="hidden" name="my_items_only" value="true" />
            )}
            <div className="flex gap-2">
              <Button type="submit" variant="secondary" className="h-9">Apply</Button>
              <Button type="button" variant="ghost" className="h-9" asChild>
                <a href="/weekly-review">Reset</a>
              </Button>
            </div>
          </form>
        </details>
      </SectionCard>

      <div id="critical-weekly-issues">
        <SectionCard title="Critical Weekly Issues" description="Fast triage for urgent weekly risks.">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-navy">Overdue Snapshot</h3>
            <DashboardWorkItemsPanel
              rows={overdueRows}
              emptyTitle="No overdue carry-forward"
              emptyDescription="No overdue work carried into this week."
              limit={5}
              compactEmptyState
              highlightOverdue
              currentUserId={auth.profile.user_id}
              currentRole={auth.profile.role}
              returnTo={returnTo}
              deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
              taskStatusOptions={Array.from(TASK_STATUSES)}
            />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-navy">No Contact This Month</h3>
            <DashboardTouchpointRiskPanel
              rows={noContactRows}
              emptyTitle="No monthly contact gaps"
              emptyDescription="All visible clients have contact logged this month."
              communicationPreviewMap={communicationPreviewMap}
              limit={5}
              compactEmptyState
            />
          </div>
        </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div id="no-work-this-week">
          <SectionCard title="Clients Without Planned Work This Week">
          <PlanningGapClientsPanel
            rows={sortedNoWorkThisWeekRows}
            emptyTitle="No weekly planning gaps"
            emptyDescription="All active clients have at least one planned item this week."
            limit={LIST_LIMIT}
            compactEmptyState
            showQuickActions
            returnTo={returnTo}
          />
          </SectionCard>
        </div>
        <div id="no-work-this-month">
          <SectionCard title="Clients Without Planned Work This Month">
          <PlanningGapClientsPanel
            rows={sortedNoWorkThisMonthRows}
            emptyTitle="No monthly planning gaps"
            emptyDescription="All active clients have at least one planned item this month."
            limit={LIST_LIMIT}
            compactEmptyState
            showQuickActions
            returnTo={returnTo}
          />
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard title="Team Workload">
          <TeamWorkloadCompact rows={data.teamWorkload} limit={LIST_LIMIT} />
        </SectionCard>

        <div id="completed-this-week">
          <SectionCard title="Completed This Week">
          <DashboardWorkItemsPanel
          rows={data.completedThisWeekItems}
          emptyTitle="No completed work this week"
          emptyDescription="No items completed in the current week."
          limit={LIST_LIMIT}
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

      <div id="work-due-this-week">
        <SectionCard title="Work Due This Week">
          <DashboardWorkItemsPanel
            rows={dueThisWeekRows}
            emptyTitle="No work due this week"
            emptyDescription="No due-this-week work in current scope."
            limit={LIST_LIMIT}
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
  )
}
