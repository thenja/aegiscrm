"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { Button } from "@/components/ui/button"
import {
  DetailDrawer,
  DrawerActions,
  DrawerHeader,
  DrawerMetaRow,
  DrawerSection,
} from "@/components/ui/detail-drawer"
import { EmptyState } from "@/components/ui/patterns"
import { formatDisplayDate } from "@/lib/date"
import { displayClientStatus } from "@/lib/ui-copy"

type PlanningGapClientRow = {
  clientId: string
  clientName: string
  clientType: string
  picName: string
  healthStatus: string
  lastTouchpoint: string | null
}

function buildClientTabHref(clientId: string, tab: "details" | "deliverables" | "tasks", returnTo?: string) {
  const params = new URLSearchParams()
  params.set("tab", tab)
  if (returnTo) params.set("return_to", returnTo)
  return `/clients/${clientId}?${params.toString()}`
}

export function PlanningGapClientsPanel({
  rows,
  emptyTitle,
  emptyDescription,
  limit,
  compactEmptyState = false,
  showQuickActions = false,
  returnTo,
}: {
  rows: PlanningGapClientRow[]
  emptyTitle: string
  emptyDescription: string
  limit?: number
  compactEmptyState?: boolean
  showQuickActions?: boolean
  returnTo?: string
}) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const visibleRows = useMemo(() => (typeof limit === "number" ? rows.slice(0, limit) : rows), [rows, limit])
  const selectedClient = useMemo(
    () => visibleRows.find((row) => row.clientId === selectedClientId) ?? null,
    [selectedClientId, visibleRows]
  )

  if (rows.length === 0) {
    if (compactEmptyState) {
      return <p className="rounded-md border border-dashed border-border bg-slate-50 px-3 py-2 text-xs text-text-secondary">{emptyDescription}</p>
    }
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  return (
    <>
      <div className="space-y-2">
        {visibleRows.map((row) => {
          const detailsHref = buildClientTabHref(row.clientId, "details", returnTo)
          const deliverablesHref = buildClientTabHref(row.clientId, "deliverables", returnTo)
          const tasksHref = buildClientTabHref(row.clientId, "tasks", returnTo)

          return (
            <article
              key={row.clientId}
              className="w-full rounded-md border border-border bg-white p-3 text-left shadow-sm transition-colors hover:border-navy/40 hover:bg-slate-50/50"
            >
              <p className="text-sm font-semibold text-navy">{row.clientName}</p>
              <p className="mt-1.5 text-xs text-text-secondary">
                Type: <span className="font-medium text-text-primary">{row.clientType}</span>
                {" | "}
                PIC: <span className="font-medium text-text-primary">{row.picName}</span>
                {" | "}
                Client Status: <span className="font-medium text-text-primary">{displayClientStatus(row.healthStatus)}</span>
                {" | "}
                Last Contact: <span className="font-medium text-text-primary">{formatDisplayDate(row.lastTouchpoint)}</span>
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedClientId(row.clientId)}>
                  View
                </Button>
                {showQuickActions ? (
                  <details className="rounded-md border border-border bg-slate-50 px-2 py-1">
                    <summary className="cursor-pointer text-xs font-medium text-navy">Add Work</summary>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Button type="button" variant="secondary" size="xs" asChild>
                        <Link href={deliverablesHref}>Deliverable</Link>
                      </Button>
                      <Button type="button" variant="secondary" size="xs" asChild>
                        <Link href={tasksHref}>Task</Link>
                      </Button>
                    </div>
                  </details>
                ) : null}
                <Button type="button" size="xs" asChild>
                  <Link href={detailsHref}>Open</Link>
                </Button>
              </div>
            </article>
          )
        })}
      </div>

      <DetailDrawer
        open={Boolean(selectedClient)}
        onClose={() => setSelectedClientId(null)}
        title={selectedClient?.clientName ?? "Client"}
        subtitle="Planning gap quick view"
      >
        {selectedClient ? (
          <div className="space-y-3">
            <DrawerHeader
              title={selectedClient.clientName}
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "Type", value: selectedClient.clientType },
                    { label: "PIC", value: selectedClient.picName },
                    { label: "Client Status", value: displayClientStatus(selectedClient.healthStatus) },
                  ]}
                />
              }
            />
            <DrawerSection title="Planning Context">
              <DrawerMetaRow
                items={[
                  { label: "Last Contact", value: formatDisplayDate(selectedClient.lastTouchpoint) },
                ]}
              />
            </DrawerSection>
            <DrawerActions>
              <Button size="xs" asChild>
                <Link href={buildClientTabHref(selectedClient.clientId, "details", returnTo)}>Open</Link>
              </Button>
              <Button variant="secondary" size="xs" asChild>
                <Link href={buildClientTabHref(selectedClient.clientId, "deliverables", returnTo)}>View</Link>
              </Button>
              <Button variant="secondary" size="xs" asChild>
                <Link href={buildClientTabHref(selectedClient.clientId, "tasks", returnTo)}>View</Link>
              </Button>
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}
