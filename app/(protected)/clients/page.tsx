import Link from "next/link"

import { createClientAction } from "@/app/actions/clients"
import { Input } from "@/components/ui/input"
import { listClients, type ClientFilters } from "@/lib/data/clients"
import { listActiveUsersForSelect } from "@/lib/data/users"
import { requireAuth } from "@/lib/auth"
import { hasRole } from "@/lib/permissions"
import {
  CLIENT_STATUSES,
  CLIENT_TYPES,
  ENGAGEMENT_TYPES,
  HEALTH_STATUSES,
  MARKET_TYPES,
  SERVICING_FREQUENCIES,
} from "@/types/domain"
import { ActionFeedback } from "@/components/ui/action-feedback"
import { Button } from "@/components/ui/button"
import { ModalForm } from "@/components/ui/detail-drawer"
import { EmptyState, FilterBar, FormSection, PageHeader, SectionCard } from "@/components/ui/patterns"
import { listDeliverables } from "@/lib/data/deliverables"
import { listTasks } from "@/lib/data/tasks"
import { ClientListWithDrawer } from "@/components/clients/client-list-with-drawer"

type SearchParams = {
  status?: string
  engagement_type?: string
  client_type?: string
  internal_pic_id?: string
  health_status?: string
  touchpoint_risk?: string
  feedback?: string
  message?: string
}

const NON_ACTIVE_DELIVERABLE_STATUSES = new Set([
  "Completed",
  "Cancelled",
  "On Hold",
  "Not Required This Month",
  "Deferred",
])

function touchpointRiskRank(value: string) {
  if (value === "Overdue") return 0
  if (value === "No Touchpoint Yet") return 1
  if (value === "Due Soon") return 2
  if (value === "On Track") return 3
  return 4
}

function buildFilterHref(
  searchParams: SearchParams | undefined,
  patch: Partial<SearchParams>
) {
  const params = new URLSearchParams()
  const merged: SearchParams = { ...(searchParams ?? {}), ...patch }
  ;(
    [
      "status",
      "engagement_type",
      "client_type",
      "internal_pic_id",
      "health_status",
      "touchpoint_risk",
    ] as const
  ).forEach((key) => {
    const value = merged[key]
    if (value) params.set(key, value)
  })
  const query = params.toString()
  return query ? `/clients?${query}` : "/clients"
}

export default async function ClientsPage({ searchParams }: { searchParams?: SearchParams }) {
  const auth = await requireAuth()
  const filters: ClientFilters = {
    status: searchParams?.status,
    engagement_type: searchParams?.engagement_type,
    client_type: searchParams?.client_type,
    internal_pic_id: searchParams?.internal_pic_id,
    health_status: searchParams?.health_status,
  }

  const [clients, users] = await Promise.all([listClients(filters), listActiveUsersForSelect()])
  const canCreate = hasRole(auth.profile.role, ["Director", "Team Lead", "Admin"])
  const canEditFee = hasRole(auth.profile.role, ["Director"])
  const canQuickActions = hasRole(auth.profile.role, ["Director", "Team Lead", "Team Member"])

  const [deliverables, tasks] = await Promise.all([
    listDeliverables({}),
    listTasks({}),
  ])

  const openDeliverablesByClientId = deliverables.reduce((acc, item) => {
    if (NON_ACTIVE_DELIVERABLE_STATUSES.has(item.status)) return acc
    acc[item.client_id] = (acc[item.client_id] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  const pendingItemsByClientId = [...deliverables, ...tasks].reduce((acc, item) => {
    if (
      item.status === "Pending Internal Review" ||
      item.status === "Pending Client Approval" ||
      item.status === "Pending External Party"
    ) {
      const clientId = "client_id" in item ? item.client_id : null
      if (clientId) {
        acc[clientId] = (acc[clientId] ?? 0) + 1
      }
    }
    return acc
  }, {} as Record<string, number>)

  const activeClients = clients
    .filter((client) => client.status === "Active")
    .sort((a, b) => {
      const aHealth = (a as { touchpoint_health?: string }).touchpoint_health ?? "On Track"
      const bHealth = (b as { touchpoint_health?: string }).touchpoint_health ?? "On Track"
      const rankDiff = touchpointRiskRank(aHealth) - touchpointRiskRank(bHealth)
      if (rankDiff !== 0) return rankDiff

      const aDays = (a as { touchpoint_days_since?: number | null }).touchpoint_days_since ?? -1
      const bDays = (b as { touchpoint_days_since?: number | null }).touchpoint_days_since ?? -1
      if (bDays !== aDays) return bDays - aDays

      return a.client_name.localeCompare(b.client_name)
    })

  const nonActiveClients = clients
    .filter((client) => client.status !== "Active")
    .sort((a, b) => a.client_name.localeCompare(b.client_name))

  let displayedClients = [...activeClients, ...nonActiveClients]
  if (searchParams?.touchpoint_risk) {
    displayedClients = displayedClients.filter(
      (client) =>
        (client as { touchpoint_health?: string }).touchpoint_health === searchParams.touchpoint_risk
    )
  }

  const touchpointRisk = searchParams?.touchpoint_risk
  const myClientsActive = searchParams?.internal_pic_id === auth.profile.user_id
  const returnToParams = new URLSearchParams()
  if (searchParams?.status) returnToParams.set("status", searchParams.status)
  if (searchParams?.engagement_type) returnToParams.set("engagement_type", searchParams.engagement_type)
  if (searchParams?.client_type) returnToParams.set("client_type", searchParams.client_type)
  if (searchParams?.internal_pic_id) returnToParams.set("internal_pic_id", searchParams.internal_pic_id)
  if (searchParams?.health_status) returnToParams.set("health_status", searchParams.health_status)
  if (searchParams?.touchpoint_risk) returnToParams.set("touchpoint_risk", searchParams.touchpoint_risk)
  const clientListReturnTo = returnToParams.toString().length > 0 ? `/clients?${returnToParams.toString()}` : "/clients"

  return (
    <div className="space-y-4">
      <ActionFeedback feedback={searchParams?.feedback} message={searchParams?.message} />

      <PageHeader
        title="Clients"
        description="Quick view of ownership, client status and follow-up risk."
        className="p-3.5 sm:p-4"
        action={
          canCreate ? (
            <ModalForm triggerLabel="+ New Client" title="Create Client">
              <FormSection title="Client Details" description="Fill required fields first; optional fields can be completed as available.">
                <form action={createClientAction} className="space-y-4">
                  <input type="hidden" name="return_to" value="/clients" />

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Input name="client_name" placeholder="Client Name" required />
                    <Input name="stock_code" placeholder="Stock Code" />

                    <select name="market" className="h-10 rounded-md border border-border px-3 text-sm">
                      <option value="">Market (Optional)</option>
                      {MARKET_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <Input name="sector" placeholder="Sector" />

                    <select name="engagement_type" required className="h-10 rounded-md border border-border px-3 text-sm">
                      {ENGAGEMENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select name="client_type" required className="h-10 rounded-md border border-border px-3 text-sm">
                      {CLIENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>

                    <select name="status" required className="h-10 rounded-md border border-border px-3 text-sm">
                      {CLIENT_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <select name="health_status" required className="h-10 rounded-md border border-border px-3 text-sm">
                      {HEALTH_STATUSES.map((v) => <option key={v} value={v}>{v === "Healthy" ? "Good" : v}</option>)}
                    </select>

                    <select name="internal_pic_id" required className="h-10 rounded-md border border-border px-3 text-sm">
                      <option value="">Select Internal PIC</option>
                      {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                    </select>
                    <select name="backup_pic_id" className="h-10 rounded-md border border-border px-3 text-sm">
                      <option value="">Select Backup PIC (Optional)</option>
                      {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                    </select>

                    <select name="servicing_frequency" required className="h-10 rounded-md border border-border px-3 text-sm">
                      {SERVICING_FREQUENCIES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <Input name="required_monthly_contacts" type="number" min="0" required defaultValue="4" />

                    <Input name="touchpoint_overdue_days" type="number" min="1" required defaultValue="7" />
                    <Input name="contract_start" type="date" />
                    <Input name="contract_end" type="date" />
                    {canEditFee ? <Input name="monthly_fee" type="number" step="0.01" min="0" placeholder="Monthly Fee" /> : null}
                  </div>

                  <textarea name="scope_of_work" required placeholder="Scope of work" className="min-h-[100px] w-full rounded-md border border-border px-3 py-2 text-sm" />
                  <textarea name="notes" placeholder="Notes" className="min-h-[80px] w-full rounded-md border border-border px-3 py-2 text-sm" />
                  <Button type="submit">Create Client</Button>
                </form>
              </FormSection>
            </ModalForm>
          ) : null
        }
      />

      <SectionCard title="Filters" className="p-3.5 sm:p-4">
        <FilterBar>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={buildFilterHref(searchParams, { touchpoint_risk: "Overdue" })}>
              <button
                type="button"
                className={
                  touchpointRisk === "Overdue"
                    ? "inline-flex items-center rounded-full border border-status-red bg-status-red-bg px-3 py-1 text-xs font-medium text-status-red"
                    : "inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary hover:bg-slate-100"
                }
              >
                Overdue
              </button>
            </Link>
            <Link href={buildFilterHref(searchParams, { touchpoint_risk: "No Touchpoint Yet" })}>
              <button
                type="button"
                className={
                  touchpointRisk === "No Touchpoint Yet"
                    ? "inline-flex items-center rounded-full border border-status-red bg-status-red-bg px-3 py-1 text-xs font-medium text-status-red"
                    : "inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary hover:bg-slate-100"
                }
              >
                No Contact Yet
              </button>
            </Link>
            <Link href={buildFilterHref(searchParams, { touchpoint_risk: "Due Soon" })}>
              <button
                type="button"
                className={
                  touchpointRisk === "Due Soon"
                    ? "inline-flex items-center rounded-full border border-status-amber bg-status-amber-bg px-3 py-1 text-xs font-medium text-status-amber"
                    : "inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary hover:bg-slate-100"
                }
              >
                Due Soon
              </button>
            </Link>
            <Link href={buildFilterHref(searchParams, { internal_pic_id: auth.profile.user_id })}>
              <button
                type="button"
                className={
                  myClientsActive
                    ? "inline-flex items-center rounded-full border border-status-blue bg-status-blue-bg px-3 py-1 text-xs font-medium text-status-blue"
                    : "inline-flex items-center rounded-full border border-border bg-white px-3 py-1 text-xs font-medium text-text-secondary hover:bg-slate-100"
                }
              >
                My Clients
              </button>
            </Link>
          </div>

          <details className="mt-2 rounded-md border border-border bg-white p-3">
            <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced Filters</summary>
            <form className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4" method="get">
              <input type="hidden" name="touchpoint_risk" value={searchParams?.touchpoint_risk ?? ""} />
              <select name="status" defaultValue={searchParams?.status ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                <option value="">All Status</option>
                {CLIENT_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select name="engagement_type" defaultValue={searchParams?.engagement_type ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                <option value="">All Engagement</option>
                {ENGAGEMENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select name="internal_pic_id" defaultValue={searchParams?.internal_pic_id ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                <option value="">All PIC</option>
                {users.map((u) => (
                  <option key={u.user_id} value={u.user_id}>{u.full_name}</option>
                ))}
              </select>
              <select name="health_status" defaultValue={searchParams?.health_status ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                <option value="">All Client Status</option>
                {HEALTH_STATUSES.map((v) => <option key={v} value={v}>{v === "Healthy" ? "Good" : v}</option>)}
              </select>
              <div className="md:col-span-4 flex gap-2">
                <Button type="submit" variant="secondary">Apply Filters</Button>
                <Link href="/clients"><Button type="button" variant="ghost">Reset</Button></Link>
              </div>
            </form>
          </details>
        </FilterBar>
      </SectionCard>

      <SectionCard title="Client List" description="Risk-first servicing follow-up view for active clients.">
        {displayedClients.length === 0 ? (
          <EmptyState title="No clients found" description="Try adjusting filters or add a new client." />
        ) : (
          <ClientListWithDrawer
            clients={displayedClients}
            openDeliverablesByClientId={openDeliverablesByClientId}
            pendingItemsByClientId={pendingItemsByClientId}
            showQuickActions={canQuickActions}
            returnTo={clientListReturnTo}
          />
        )}
      </SectionCard>
    </div>
  )
}
