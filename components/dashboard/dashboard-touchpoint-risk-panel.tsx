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
import { EmptyState, PillBadge } from "@/components/ui/patterns"
import { formatDisplayDate } from "@/lib/date"
import { displayFollowUpStatus } from "@/lib/ui-copy"

type TouchpointRiskClientItem = {
  clientId: string
  clientName: string
  clientType: string
  picName: string
  lastTouchpoint: string | null
  daysSinceTouchpoint: number | null
  touchpointHealth: "On Track" | "Due Soon" | "Overdue" | "No Touchpoint Yet"
}

type CommunicationPreview = {
  commLogId: string
  commDate: string
  channel: string
  direction: string
  counterpartName: string
  summary: string
}

function healthTone(health: TouchpointRiskClientItem["touchpointHealth"]) {
  if (health === "Overdue" || health === "No Touchpoint Yet") return "red"
  if (health === "Due Soon") return "amber"
  return "green"
}

export function DashboardTouchpointRiskPanel({
  rows,
  emptyTitle,
  emptyDescription,
  communicationPreviewMap,
  limit,
  compactEmptyState = false,
}: {
  rows: TouchpointRiskClientItem[]
  emptyTitle: string
  emptyDescription: string
  communicationPreviewMap: Record<string, CommunicationPreview[]>
  limit?: number
  compactEmptyState?: boolean
}) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const visibleRows = useMemo(() => (typeof limit === "number" ? rows.slice(0, limit) : rows), [rows, limit])

  if (rows.length === 0) {
    if (compactEmptyState) {
      return <p className="rounded-md border border-dashed border-border bg-slate-50 px-3 py-2 text-xs text-text-secondary">{emptyDescription}</p>
    }
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const selectedItem = visibleRows.find((row) => row.clientId === selectedClientId) ?? null
  const recentLogs = selectedItem ? communicationPreviewMap[selectedItem.clientId] ?? [] : []

  return (
    <>
      <div className="space-y-2">
        {visibleRows.map((row) => (
          <button
            key={row.clientId}
            type="button"
            className="w-full rounded-md border border-border bg-white p-3 text-left shadow-sm transition-colors hover:border-navy/40 hover:bg-slate-50/50"
            onClick={() => setSelectedClientId(row.clientId)}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-navy">{row.clientName}</p>
              <PillBadge label={displayFollowUpStatus(row.touchpointHealth)} tone={healthTone(row.touchpointHealth)} compact />
            </div>
            <p className="mt-1.5 text-xs text-text-secondary">
              PIC: <span className="font-medium text-text-primary">{row.picName}</span>
              {" | "}
              Last Contact: <span className="font-medium text-text-primary">{formatDisplayDate(row.lastTouchpoint)}</span>
              {" | "}
              Days Since: <span className="font-medium text-text-primary">{row.daysSinceTouchpoint ?? "-"}</span>
            </p>
          </button>
        ))}
        {typeof limit === "number" && rows.length > limit ? (
          <p className="text-xs text-text-secondary">Showing top {limit} of {rows.length} clients.</p>
        ) : null}
      </div>

      <DetailDrawer
        open={Boolean(selectedItem)}
        onClose={() => setSelectedClientId(null)}
        title={selectedItem?.clientName ?? "Client"}
        subtitle="Follow-up risk details"
      >
        {selectedItem ? (
          <div className="space-y-4">
            <DrawerHeader
              title={selectedItem.clientName}
              badge={<PillBadge label={displayFollowUpStatus(selectedItem.touchpointHealth)} tone={healthTone(selectedItem.touchpointHealth)} compact />}
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "Type", value: selectedItem.clientType },
                    { label: "PIC", value: selectedItem.picName },
                    { label: "Last Contact", value: formatDisplayDate(selectedItem.lastTouchpoint) },
                    { label: "Days Since", value: selectedItem.daysSinceTouchpoint ?? "-" },
                  ]}
                />
              }
            />

            <DrawerSection title="Recent Communication">
              {recentLogs.length === 0 ? (
                <p className="text-xs text-text-secondary">No communication logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentLogs.map((log) => (
                    <article key={log.commLogId} className="rounded-md border border-border bg-slate-50 p-2">
                      <p className="text-xs text-text-secondary">
                        {formatDisplayDate(log.commDate)} | {log.channel} | {log.direction}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-text-primary">{log.counterpartName}</p>
                      <p className="mt-0.5 text-xs text-text-secondary">{log.summary}</p>
                    </article>
                  ))}
                </div>
              )}
            </DrawerSection>

            <DrawerActions>
              <Button size="xs" asChild>
                <Link href={`/clients/${selectedItem.clientId}?tab=communication`}>Log Contact</Link>
              </Button>
              <Button variant="secondary" size="xs" asChild>
                <Link href={`/clients/${selectedItem.clientId}`}>Open</Link>
              </Button>
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}
