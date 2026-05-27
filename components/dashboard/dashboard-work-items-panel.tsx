"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { updateDeliverableStatusAction } from "@/app/actions/deliverables"
import { updateTaskStatusAction } from "@/app/actions/tasks"
import { Button } from "@/components/ui/button"
import {
  DetailDrawer,
  DrawerActions,
  DrawerHeader,
  DrawerMetaRow,
  DrawerSection,
} from "@/components/ui/detail-drawer"
import { EmptyState, PillBadge } from "@/components/ui/patterns"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDisplayDate } from "@/lib/date"
import { cn } from "@/lib/utils"

type DashboardWorkItemView = {
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
}

const PRIORITY_ORDER: Record<string, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
}

function getItemHref(item: DashboardWorkItemView) {
  if (item.itemType === "Deliverable" && item.clientId) {
    return `/clients/${item.clientId}?tab=deliverables`
  }

  if (item.clientId) {
    return `/clients/${item.clientId}?tab=tasks`
  }

  return "/tasks"
}

function PriorityBadge({ priority }: { priority: string }) {
  const tone =
    priority === "Critical"
      ? "border-status-red bg-status-red-bg text-status-red"
      : priority === "High"
        ? "border-status-amber bg-status-amber-bg text-status-amber"
        : priority === "Medium"
          ? "border-status-blue bg-status-blue-bg text-status-blue"
          : "border-status-grey bg-status-grey-bg text-text-secondary"

  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-semibold", tone)}
    >
      {priority}
    </span>
  )
}

function canWriteItem(item: DashboardWorkItemView, currentUserId: string, currentRole: string) {
  if (currentRole === "Director" || currentRole === "Team Lead") {
    return true
  }

  if (currentRole === "Admin") {
    return false
  }

  if (currentRole !== "Team Member") {
    return false
  }

  if (item.picId !== currentUserId) {
    return false
  }

  if (item.itemType === "Task" && !item.clientId) {
    return false
  }

  return true
}

function workItemKey(item: DashboardWorkItemView) {
  return `${item.itemType}-${item.itemId}`
}

export function DashboardWorkItemsPanel({
  rows,
  emptyTitle,
  emptyDescription,
  limit,
  highlightOverdue = false,
  compactEmptyState = false,
  desktopTwoColumn = false,
  currentUserId,
  currentRole,
  returnTo,
  deliverableStatusOptions,
  taskStatusOptions,
}: {
  rows: DashboardWorkItemView[]
  emptyTitle: string
  emptyDescription: string
  limit?: number
  highlightOverdue?: boolean
  compactEmptyState?: boolean
  desktopTwoColumn?: boolean
  currentUserId: string
  currentRole: string
  returnTo: string
  deliverableStatusOptions: string[]
  taskStatusOptions: string[]
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const visibleRows = useMemo(() => (typeof limit === "number" ? rows.slice(0, limit) : rows), [rows, limit])

  if (rows.length === 0) {
    if (compactEmptyState) {
      return <p className="rounded-md border border-dashed border-border bg-slate-50 px-3 py-2 text-xs text-text-secondary">{emptyDescription}</p>
    }
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const selectedItem = visibleRows.find((item) => workItemKey(item) === selectedKey) ?? null

  return (
    <>
      <div className={desktopTwoColumn ? "grid grid-cols-1 gap-2 lg:grid-cols-2" : "space-y-2"}>
        {visibleRows.map((item) => {
          const href = getItemHref(item)
          return (
            <button
              key={workItemKey(item)}
              type="button"
              className={cn(
                "w-full rounded-md border bg-white p-2.5 text-left shadow-sm transition-colors hover:border-navy/40 hover:bg-slate-50/50",
                highlightOverdue ? "border-status-red/40 bg-status-red-bg/30" : "border-border"
              )}
              onClick={() => setSelectedKey(workItemKey(item))}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-navy">{item.clientName}</p>
                  <p className="mt-0.5 break-words text-sm font-semibold leading-snug text-text-primary">{item.itemName}</p>
                </div>
                <StatusBadge status={item.status} compact className="shrink-0" />
              </div>

              <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
                <span className="inline-flex items-center rounded border border-border bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
                  {item.itemType}
                </span>
                <span>
                  Due: <span className="font-medium text-text-primary">{formatDisplayDate(item.dueDate)}</span>
                </span>
                <span>|</span>
                <span>
                  PIC: <span className="font-medium text-text-primary">{item.picName}</span>
                </span>
                {item.priority === "Critical" || item.priority === "High" ? (
                  <>
                    <span>|</span>
                    <PriorityBadge priority={item.priority} />
                  </>
                ) : null}
                {highlightOverdue ? (
                  <>
                    <span>|</span>
                    <span className="inline-flex items-center rounded-full border border-status-red bg-status-red-bg px-1.5 py-0.5 text-[10px] font-semibold text-status-red">
                      Urgent
                    </span>
                  </>
                ) : null}
              </div>

              <div className="mt-2 flex justify-end">
                <span className="inline-flex h-6 items-center rounded-md border border-border px-2 text-[11px] font-medium text-navy">
                  View
                </span>
              </div>

              <span className="sr-only">Open details for {item.itemName}</span>
              <span className="sr-only">{href}</span>
            </button>
          )
        })}
        {typeof limit === "number" && rows.length > limit ? (
          <p className="text-xs text-text-secondary">Showing top {limit} of {rows.length} items.</p>
        ) : null}
      </div>

      <DetailDrawer
        open={Boolean(selectedItem)}
        onClose={() => setSelectedKey(null)}
        title={selectedItem?.itemName ?? "Work Item"}
        subtitle={selectedItem ? `${selectedItem.itemType} details` : undefined}
      >
        {selectedItem ? (
          <div className="space-y-4">
            <DrawerHeader
              title={selectedItem.clientName}
              badge={<StatusBadge status={selectedItem.status} compact />}
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "PIC", value: selectedItem.picName },
                    { label: "Due", value: formatDisplayDate(selectedItem.dueDate) },
                    { label: "Type", value: selectedItem.itemType },
                  ]}
                />
              }
            />
            <DrawerSection title="Item Summary">
              <div className="flex flex-wrap gap-2">
                <PriorityBadge priority={selectedItem.priority} />
                {selectedItem.category ? <PillBadge label={selectedItem.category} /> : null}
              </div>
              <p className="mt-2 text-xs text-text-secondary">
                Latest Update: <span className="text-text-primary">{selectedItem.latestUpdate || "-"}</span>
              </p>
            </DrawerSection>

            {canWriteItem(selectedItem, currentUserId, currentRole) ? (
              <DrawerSection title="Quick Status Update" description="Update status and latest remarks without leaving dashboard.">
                {selectedItem.itemType === "Deliverable" ? (
                  <form action={updateDeliverableStatusAction} className="space-y-2">
                    <input type="hidden" name="deliverable_id" value={selectedItem.itemId} />
                    <input type="hidden" name="client_id" value={selectedItem.clientId ?? ""} />
                    <input type="hidden" name="pic_id" value={selectedItem.picId ?? ""} />
                    <input type="hidden" name="return_to" value={returnTo} />
                    <select
                      name="status"
                      defaultValue={selectedItem.status}
                      className="h-9 w-full rounded-md border border-border px-2 text-sm"
                    >
                      {deliverableStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <textarea
                      name="notes"
                      defaultValue={selectedItem.latestUpdate ?? ""}
                      rows={3}
                      className="w-full rounded-md border border-border px-2 py-2 text-sm"
                      placeholder="Latest update / remarks"
                    />
                    <Button type="submit" size="xs">
                      Update
                    </Button>
                  </form>
                ) : (
                  <form action={updateTaskStatusAction} className="space-y-2">
                    <input type="hidden" name="task_id" value={selectedItem.itemId} />
                    <input type="hidden" name="client_id" value={selectedItem.clientId ?? ""} />
                    <input type="hidden" name="pic_id" value={selectedItem.picId ?? ""} />
                    <input type="hidden" name="return_to" value={returnTo} />
                    <select
                      name="status"
                      defaultValue={selectedItem.status}
                      className="h-9 w-full rounded-md border border-border px-2 text-sm"
                    >
                      {taskStatusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                    <textarea
                      name="description"
                      defaultValue={selectedItem.latestUpdate ?? ""}
                      rows={3}
                      className="w-full rounded-md border border-border px-2 py-2 text-sm"
                      placeholder="Latest update / remarks"
                    />
                    <Button type="submit" size="xs">
                      Update
                    </Button>
                  </form>
                )}
              </DrawerSection>
            ) : null}

            <DrawerActions>
              {selectedItem.clientId ? (
                <Button variant="secondary" size="xs" asChild>
                  <Link href={`/clients/${selectedItem.clientId}`}>Open</Link>
                </Button>
              ) : null}
              <Button size="xs" asChild>
                <Link href={getItemHref(selectedItem)}>
                  View
                </Link>
              </Button>
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}

export function sortByPriorityThenDueDate(rows: DashboardWorkItemView[]) {
  return [...rows].sort((a, b) => {
    const priorityDiff = (PRIORITY_ORDER[a.priority] ?? 99) - (PRIORITY_ORDER[b.priority] ?? 99)
    if (priorityDiff !== 0) return priorityDiff
    return (a.dueDate ?? "9999-12-31").localeCompare(b.dueDate ?? "9999-12-31")
  })
}
