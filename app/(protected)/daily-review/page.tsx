import { ActionFeedback } from "@/components/ui/action-feedback"
import { SectionCard, PageHeader } from "@/components/ui/patterns"
import { DashboardWorkItemsPanel } from "@/components/dashboard/dashboard-work-items-panel"
import { DashboardTouchpointRiskPanel } from "@/components/dashboard/dashboard-touchpoint-risk-panel"
import { ReviewPresetBar } from "@/components/review/review-preset-bar"
import { getUsersForClientAssignments, listClients } from "@/lib/data/clients"
import { getCommunicationPreviewMapByClientIds, getReviewData } from "@/lib/data/reviews"
import type { DashboardFilters, DashboardWorkItem } from "@/lib/data/dashboard"
import { DELIVERABLE_STATUSES, TASK_STATUSES, CATEGORY_TYPES } from "@/types/domain"
import { Button } from "@/components/ui/button"

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

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

function sortByPriorityThenDueDate(rows: DashboardWorkItem[]) {
  return [...rows].sort((a, b) => {
    const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    if (priorityDiff !== 0) return priorityDiff
    return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31")
  })
}

function workItemKey(item: DashboardWorkItem) {
  return `${item.itemType}-${item.itemId}`
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
  return qs.length > 0 ? `/daily-review?${qs}` : "/daily-review"
}

export default async function DailyReviewPage({ searchParams }: { searchParams?: SearchParams }) {
  const baseFilters = toFilters(searchParams)
  const [{ auth, data }, users, clients] = await Promise.all([
    getReviewData(baseFilters, { preset: searchParams?.preset }),
    getUsersForClientAssignments(),
    listClients({}),
  ])

  const returnTo = buildReturnTo(searchParams)
  const preset = searchParams?.preset
  const priorityList = sortByPriorityThenDueDate([
    ...data.overdueItems,
    ...data.dueTodayItems,
    ...data.pendingItems.client,
  ])
  const myOverdue = data.overdueItems.filter((item) => item.picId === auth.profile.user_id)
  const myDueToday = data.dueTodayItems.filter((item) => item.picId === auth.profile.user_id)
  const priorityRows =
    preset === "my_overdue"
      ? myOverdue
      : preset === "my_due_today"
        ? myDueToday
        : preset === "pending_client"
          ? data.pendingItems.client
          : preset === "due_this_week"
            ? data.dueThisWeekItems
            : priorityList
  const priorityRowKeys = new Set(priorityRows.map(workItemKey))
  const secondaryOverdueRows = data.overdueItems.filter((item) => !priorityRowKeys.has(workItemKey(item)))
  const secondaryDueTodayRows = data.dueTodayItems.filter((item) => !priorityRowKeys.has(workItemKey(item)))
  const secondaryPendingClientRows = data.pendingItems.client.filter((item) => !priorityRowKeys.has(workItemKey(item)))
  const followUpRows =
    preset === "no_contact_yet"
      ? data.touchpointRisk.overdueForContact.filter((row) => row.touchpointHealth === "No Touchpoint Yet")
      : data.touchpointRisk.overdueForContact
  const followUpClientIds = followUpRows.map((row) => row.clientId)
  const communicationPreviewMap = await getCommunicationPreviewMapByClientIds(followUpClientIds)

  const showTeamFilters = auth.profile.role === "Director" || auth.profile.role === "Team Lead"

  return (
    <div className="space-y-4">
      <ActionFeedback feedback={searchParams?.feedback} message={searchParams?.message} />
      <PageHeader
        title="Daily Review"
        description="Focused daily triage for urgent work, pending client responses, and follow-up risk."
      />

      <SectionCard title="Today's Priority List" description="Top urgent items only.">
        <DashboardWorkItemsPanel
          rows={priorityRows}
          emptyTitle="No urgent priority items"
          emptyDescription="No overdue, due-today, or pending-client items in current scope."
          limit={LIST_LIMIT}
          desktopTwoColumn
          currentUserId={auth.profile.user_id}
          currentRole={auth.profile.role}
          returnTo={returnTo}
          deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
          taskStatusOptions={Array.from(TASK_STATUSES)}
        />
      </SectionCard>

      <SectionCard title="Review Controls">
        <ReviewPresetBar
          basePath="/daily-review"
          activePreset={searchParams?.preset}
          preserveParams={{
            client_id: searchParams?.client_id,
            pic_id: searchParams?.pic_id,
            category: searchParams?.category,
            status: searchParams?.status,
          }}
        />
        <details
          className="mt-3"
          open={Boolean(searchParams?.client_id || searchParams?.pic_id || searchParams?.category || searchParams?.status)}
        >
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
                <a href="/daily-review">Reset</a>
              </Button>
            </div>
          </form>
        </details>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <SectionCard title="Overdue Work">
            <DashboardWorkItemsPanel
              rows={secondaryOverdueRows}
              emptyTitle="No additional overdue work"
              emptyDescription="No additional overdue items beyond today's priority list."
              limit={5}
              compactEmptyState
              highlightOverdue
              currentUserId={auth.profile.user_id}
              currentRole={auth.profile.role}
              returnTo={returnTo}
              deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
              taskStatusOptions={Array.from(TASK_STATUSES)}
            />
          </SectionCard>

          <SectionCard title="Pending Client Reply">
            <DashboardWorkItemsPanel
              rows={secondaryPendingClientRows}
              emptyTitle="No additional pending client items"
              emptyDescription="No additional pending-client items beyond today's priority list."
              limit={5}
              compactEmptyState
              currentUserId={auth.profile.user_id}
              currentRole={auth.profile.role}
              returnTo={returnTo}
              deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
              taskStatusOptions={Array.from(TASK_STATUSES)}
            />
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard title="Due Today">
            <DashboardWorkItemsPanel
              rows={secondaryDueTodayRows}
              emptyTitle="No additional due-today work"
              emptyDescription="No additional due-today items beyond today's priority list."
              limit={5}
              compactEmptyState
              currentUserId={auth.profile.user_id}
              currentRole={auth.profile.role}
              returnTo={returnTo}
              deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
              taskStatusOptions={Array.from(TASK_STATUSES)}
            />
          </SectionCard>

          <SectionCard title="Clients Needing Follow-up">
            <DashboardTouchpointRiskPanel
              rows={followUpRows}
              emptyTitle="No clients needing follow-up"
              emptyDescription="Follow-up is on track for all visible clients."
              communicationPreviewMap={communicationPreviewMap}
              limit={5}
              compactEmptyState
            />
          </SectionCard>
        </div>
      </div>

      {auth.profile.role === "Team Member" ? (
        <SectionCard title="My Work">
          <DashboardWorkItemsPanel
            rows={data.openItems.filter((item) => item.picId === auth.profile.user_id)}
            emptyTitle="No assigned open work"
            emptyDescription="You currently have no assigned open items."
            limit={10}
            currentUserId={auth.profile.user_id}
            currentRole={auth.profile.role}
            returnTo={returnTo}
            deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
            taskStatusOptions={Array.from(TASK_STATUSES)}
          />
        </SectionCard>
      ) : null}
    </div>
  )
}
