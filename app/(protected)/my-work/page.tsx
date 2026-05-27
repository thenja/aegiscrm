import Link from "next/link"

import { ActionFeedback } from "@/components/ui/action-feedback"
import { SectionCard, PageHeader } from "@/components/ui/patterns"
import { DashboardWorkItemsPanel } from "@/components/dashboard/dashboard-work-items-panel"
import { DashboardTouchpointRiskPanel } from "@/components/dashboard/dashboard-touchpoint-risk-panel"
import { ReviewPresetBar } from "@/components/review/review-preset-bar"
import { getCommunicationPreviewMapByClientIds, getReviewData } from "@/lib/data/reviews"
import type { DashboardFilters } from "@/lib/data/dashboard"
import { DELIVERABLE_STATUSES, TASK_STATUSES, CATEGORY_TYPES } from "@/types/domain"
import { Button } from "@/components/ui/button"

type SearchParams = {
  client_id?: string
  category?: string
  status?: string
  preset?: string
  feedback?: string
  message?: string
}

function toFilters(searchParams?: SearchParams): DashboardFilters {
  return {
    client_id: searchParams?.client_id || undefined,
    category: searchParams?.category || undefined,
    status: searchParams?.status || undefined,
    my_items_only: true,
  }
}

function buildReturnTo(searchParams?: SearchParams) {
  const params = new URLSearchParams()
  if (searchParams?.client_id) params.set("client_id", searchParams.client_id)
  if (searchParams?.category) params.set("category", searchParams.category)
  if (searchParams?.status) params.set("status", searchParams.status)
  if (searchParams?.preset) params.set("preset", searchParams.preset)
  const qs = params.toString()
  return qs.length > 0 ? `/my-work?${qs}` : "/my-work"
}

export default async function MyWorkPage({ searchParams }: { searchParams?: SearchParams }) {
  const filters = toFilters(searchParams)
  const { auth, data } = await getReviewData(filters, {
    forceOwnScope: true,
    preset: searchParams?.preset,
  })

  const returnTo = buildReturnTo(searchParams)
  const preset = searchParams?.preset
  const myDueTodayRows = data.dueTodayItems.filter((item) => item.picId === auth.profile.user_id)
  const myOverdueRows = data.overdueItems.filter((item) => item.picId === auth.profile.user_id)
  const myDueWeekRows = data.dueThisWeekItems.filter((item) => item.picId === auth.profile.user_id)
  const myPendingClientRows = data.pendingItems.client.filter((item) => item.picId === auth.profile.user_id)
  const myOngoingRows = data.openItems.filter((item) => item.picId === auth.profile.user_id)
  const myFollowUpRows =
    preset === "no_contact_yet"
      ? data.touchpointRisk.overdueForContact.filter(
          (row) => row.picId === auth.profile.user_id && row.touchpointHealth === "No Touchpoint Yet"
        )
      : data.touchpointRisk.overdueForContact.filter((row) => row.picId === auth.profile.user_id)
  const communicationPreviewMap = await getCommunicationPreviewMapByClientIds(myFollowUpRows.map((row) => row.clientId))

  return (
    <div className="space-y-4">
      <ActionFeedback feedback={searchParams?.feedback} message={searchParams?.message} />
      <PageHeader
        title="My Work"
        description="Fast personal view of today’s priorities, overdue items, and follow-up risk."
      />

      <SectionCard title="Quick Presets">
        <ReviewPresetBar
          basePath="/my-work"
          activePreset={searchParams?.preset}
          preserveParams={{
            client_id: searchParams?.client_id,
            category: searchParams?.category,
            status: searchParams?.status,
          }}
        />
      </SectionCard>

      <SectionCard title="Filters">
        <form method="get" className="grid grid-cols-1 gap-2 md:grid-cols-4">
          {searchParams?.preset ? <input type="hidden" name="preset" value={searchParams.preset} /> : null}
          <input type="hidden" name="my_items_only" value="true" />
          <select name="client_id" defaultValue={searchParams?.client_id ?? ""} className="h-9 rounded-md border border-border px-3 text-sm">
            <option value="">All My Clients</option>
            {Array.from(new Map(data.openItems.filter((item) => item.clientId).map((item) => [item.clientId as string, item.clientName])).entries()).map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
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
          <div className="flex gap-2">
            <Button type="submit" variant="secondary" className="h-9">Apply</Button>
            <Button type="button" variant="ghost" className="h-9" asChild>
              <Link href="/my-work">Reset</Link>
            </Button>
          </div>
        </form>
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="My Due Today">
          <DashboardWorkItemsPanel
            rows={myDueTodayRows}
            emptyTitle="No work due today"
            emptyDescription="No due-today items assigned to you."
            limit={10}
            currentUserId={auth.profile.user_id}
            currentRole={auth.profile.role}
            returnTo={returnTo}
            deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
            taskStatusOptions={Array.from(TASK_STATUSES)}
          />
        </SectionCard>
        <SectionCard title="My Overdue">
          <DashboardWorkItemsPanel
            rows={myOverdueRows}
            emptyTitle="No overdue work"
            emptyDescription="No overdue items assigned to you."
            limit={10}
            highlightOverdue
            currentUserId={auth.profile.user_id}
            currentRole={auth.profile.role}
            returnTo={returnTo}
            deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
            taskStatusOptions={Array.from(TASK_STATUSES)}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="My Due This Week">
          <DashboardWorkItemsPanel
            rows={myDueWeekRows}
            emptyTitle="No work due this week"
            emptyDescription="No due-this-week items assigned to you."
            limit={10}
            currentUserId={auth.profile.user_id}
            currentRole={auth.profile.role}
            returnTo={returnTo}
            deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
            taskStatusOptions={Array.from(TASK_STATUSES)}
          />
        </SectionCard>
        <SectionCard title="My Pending Client">
          <DashboardWorkItemsPanel
            rows={myPendingClientRows}
            emptyTitle="No pending client items"
            emptyDescription="No items assigned to you are waiting on client response."
            limit={10}
            currentUserId={auth.profile.user_id}
            currentRole={auth.profile.role}
            returnTo={returnTo}
            deliverableStatusOptions={Array.from(DELIVERABLE_STATUSES)}
            taskStatusOptions={Array.from(TASK_STATUSES)}
          />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <SectionCard title="My Clients Needing Follow-up">
          <DashboardTouchpointRiskPanel
            rows={myFollowUpRows}
            emptyTitle="No follow-up risk clients"
            emptyDescription="No assigned clients currently need follow-up."
            communicationPreviewMap={communicationPreviewMap}
            limit={10}
          />
        </SectionCard>
        <SectionCard title="My Ongoing Work">
          <DashboardWorkItemsPanel
            rows={myOngoingRows}
            emptyTitle="No ongoing work"
            emptyDescription="You currently have no open assigned work."
            limit={10}
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
