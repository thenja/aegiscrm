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
import { EmptyState, ItemCard, PillBadge } from "@/components/ui/patterns"
import { formatDisplayDate } from "@/lib/date"

type CommunicationLogRow = {
  comm_log_id: string
  comm_date: string
  channel: string
  summary: string
  counterpart_name: string
  counterpart_designation: string | null
  direction: string
  logged_by_name: string
  related_deliverable_name: string | null
  related_task_title: string | null
  attachments: string | null
}

export function CommunicationHistoryWithDrawer({
  logs,
  clientId,
}: {
  logs: CommunicationLogRow[]
  clientId: string
}) {
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null)
  const selectedLog = useMemo(() => logs.find((log) => log.comm_log_id === selectedLogId) ?? null, [logs, selectedLogId])

  if (logs.length === 0) {
    return (
      <EmptyState
        title="No communication logged yet."
        description="Click + Log Communication to record the latest WhatsApp, email, call or meeting."
      />
    )
  }

  return (
    <>
      <div className="space-y-3">
        {logs.map((log) => (
          <ItemCard
            key={log.comm_log_id}
            title={
              <button type="button" className="text-left hover:underline" onClick={() => setSelectedLogId(log.comm_log_id)}>
                {log.summary}
              </button>
            }
            status={<PillBadge label={log.channel} tone="blue" />}
            metaLine={
              <>
                Date: <span className="font-medium text-text-primary">{formatDisplayDate(log.comm_date)}</span>
                {" | "}
                Direction: <span className="font-medium text-text-primary">{log.direction}</span>
                {" | "}
                Counterpart: <span className="font-medium text-text-primary">{log.counterpart_name}</span>
              </>
            }
            subLine={
              <>
                Logged By: <span className="font-medium text-text-primary">{log.logged_by_name}</span>
                {" | "}
                Related: <span className="font-medium text-text-primary">{log.related_deliverable_name ?? log.related_task_title ?? "None"}</span>
              </>
            }
          >
            <DrawerActions>
              <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedLogId(log.comm_log_id)}>
                View
              </Button>
            </DrawerActions>
          </ItemCard>
        ))}
      </div>

      <DetailDrawer
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLogId(null)}
        title={selectedLog?.summary ?? "Communication Log"}
        subtitle="Communication quick detail"
      >
        {selectedLog ? (
          <div className="space-y-3">
            <DrawerHeader
              title={selectedLog.summary}
              badge={<PillBadge label={selectedLog.channel} tone="blue" />}
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "Date", value: formatDisplayDate(selectedLog.comm_date) },
                    { label: "Direction", value: selectedLog.direction },
                    { label: "Counterpart", value: selectedLog.counterpart_name },
                  ]}
                />
              }
            />
            <DrawerSection title="Communication Details">
              <DrawerMetaRow
                items={[
                  { label: "Logged By", value: selectedLog.logged_by_name },
                  {
                    label: "Related",
                    value: selectedLog.related_deliverable_name ?? selectedLog.related_task_title ?? "None",
                  },
                ]}
              />
              <p className="mt-2 text-xs text-text-secondary">
                Counterpart Designation:{" "}
                <span className="font-medium text-text-primary">{selectedLog.counterpart_designation ?? "-"}</span>
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Attachment: <span className="font-medium text-text-primary">{selectedLog.attachments ?? "-"}</span>
              </p>
            </DrawerSection>
            <DrawerActions>
              <Button size="xs" asChild>
                <Link href={`/clients/${clientId}?tab=communication`}>Log Contact</Link>
              </Button>
              <Button variant="secondary" size="xs" asChild>
                <Link href={`/clients/${clientId}`}>Open</Link>
              </Button>
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}
