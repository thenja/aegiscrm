"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { createCommunicationLogAction } from "@/app/actions/communication-logs"
import { Button } from "@/components/ui/button"
import {
  DetailDrawer,
  DrawerActions,
  DrawerHeader,
  DrawerMetaRow,
  DrawerSection,
  ResponsiveOverlay,
} from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import { FormSubmitButton } from "@/components/ui/form-submit-button"
import { PillBadge } from "@/components/ui/patterns"
import { formatDisplayDate, getSingaporeTodayIsoDate } from "@/lib/date"
import { displayClientStatus, displayFollowUpStatus } from "@/lib/ui-copy"

type ClientListRow = {
  client_id: string
  client_name: string
  stock_code: string | null
  engagement_type: string
  client_type: string
  status: string
  health_status: string
  internal_pic_name?: string
  last_client_touchpoint: string | null
  touchpoint_days_since?: number | null
  touchpoint_health?: string
}

export function ClientListWithDrawer({
  clients,
  openDeliverablesByClientId,
  pendingItemsByClientId,
  showQuickActions,
  returnTo = "/clients",
}: {
  clients: ClientListRow[]
  openDeliverablesByClientId: Record<string, number>
  pendingItemsByClientId: Record<string, number>
  showQuickActions: boolean
  returnTo?: string
}) {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [logClientId, setLogClientId] = useState<string | null>(null)

  const selectedClient = useMemo(
    () => clients.find((client) => client.client_id === selectedClientId) ?? null,
    [clients, selectedClientId]
  )
  const logClient = useMemo(
    () => clients.find((client) => client.client_id === logClientId) ?? null,
    [clients, logClientId]
  )

  const todayIso = getSingaporeTodayIsoDate()

  function isRiskClient(client: ClientListRow) {
    return (
      client.touchpoint_health === "Overdue" ||
      client.touchpoint_health === "No Touchpoint Yet" ||
      client.touchpoint_health === "Due Soon"
    )
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {clients.map((client) => (
          <div key={client.client_id} className="w-full rounded-md border border-border bg-white p-2.5 text-left">
            <div className="flex items-start justify-between gap-3">
              <button
                type="button"
                onClick={() => setSelectedClientId(client.client_id)}
                className="line-clamp-2 text-left text-sm font-semibold text-navy hover:underline"
                title={client.client_name}
              >
                {client.client_name}
              </button>
              <PillBadge
                label={displayFollowUpStatus(client.touchpoint_health ?? "No Touchpoint Yet")}
                compact
                tone={
                  client.touchpoint_health === "Overdue" || client.touchpoint_health === "No Touchpoint Yet"
                    ? "red"
                    : client.touchpoint_health === "Due Soon"
                      ? "amber"
                      : "green"
                }
              />
            </div>
            <p className="mt-1 text-[11px] text-text-secondary">
              Client Status: <span className="font-medium text-text-primary">{displayClientStatus(client.health_status)}</span>
              {" | "}Stock: <span className="font-medium text-text-primary">{client.stock_code || "-"}</span>
            </p>
            <p className="mt-1 text-[11px] text-text-secondary">
              Last Contact: <span className="font-medium text-text-primary">{formatDisplayDate(client.last_client_touchpoint)}</span> | Days Since:{" "}
              <span className="font-medium text-text-primary">{client.touchpoint_days_since ?? "-"}</span> | Open Deliverables:{" "}
              <span className="font-medium text-text-primary">{openDeliverablesByClientId[client.client_id] ?? 0}</span>
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                size="xs"
                variant={isRiskClient(client) ? "default" : "secondary"}
                onClick={() => setLogClientId(client.client_id)}
              >
                Log Contact
              </Button>
              <Button type="button" size="xs" variant="ghost" onClick={() => setSelectedClientId(client.client_id)}>
                Open
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left text-xs uppercase tracking-wide text-text-secondary">
            <tr>
              <th className="px-3 py-1.5">Client</th>
              <th className="px-3 py-1.5">Client Status</th>
              <th className="px-3 py-1.5">Last Contact</th>
              <th className="px-3 py-1.5">Days Since</th>
              <th className="px-3 py-1.5">Follow-up Status</th>
              <th className="px-3 py-1.5">Open Deliverables</th>
              <th className="px-3 py-1.5">Action</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.client_id} className="border-b border-border hover:bg-slate-50">
                <td className="max-w-[280px] px-3 py-2 font-medium text-navy">
                  <button
                    type="button"
                    onClick={() => setSelectedClientId(client.client_id)}
                    className="truncate text-left hover:underline"
                    title={client.client_name}
                  >
                    {client.client_name}
                  </button>
                </td>
                <td className="px-3 py-2">{displayClientStatus(client.health_status)}</td>
                <td className="px-3 py-2">{formatDisplayDate(client.last_client_touchpoint)}</td>
                <td className="px-3 py-2">{client.touchpoint_days_since ?? "-"}</td>
                <td className="px-3 py-2">
                  <PillBadge
                    label={displayFollowUpStatus(client.touchpoint_health ?? "No Touchpoint Yet")}
                    compact
                    tone={
                      client.touchpoint_health === "Overdue" || client.touchpoint_health === "No Touchpoint Yet"
                        ? "red"
                        : client.touchpoint_health === "Due Soon"
                          ? "amber"
                      : "green"
                    }
                  />
                </td>
                <td className="px-3 py-2">{openDeliverablesByClientId[client.client_id] ?? 0}</td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      size="xs"
                      variant={isRiskClient(client) ? "default" : "secondary"}
                      onClick={() => setLogClientId(client.client_id)}
                    >
                      Log Contact
                    </Button>
                    <Button
                      type="button"
                      size="xs"
                      variant="ghost"
                      onClick={() => setSelectedClientId(client.client_id)}
                    >
                      Open
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DetailDrawer
        open={Boolean(selectedClient)}
        onClose={() => setSelectedClientId(null)}
        title={selectedClient?.client_name ?? "Client"}
        subtitle="Client quick preview"
      >
        {selectedClient ? (
          <div className="space-y-3">
            <DrawerHeader
              title={selectedClient.client_name}
              badge={
                <div className="flex items-center gap-1.5">
                    <PillBadge label={selectedClient.status} tone="blue" />
                    <PillBadge
                      label={displayFollowUpStatus(selectedClient.touchpoint_health ?? "No Touchpoint Yet")}
                      compact
                      tone={
                        selectedClient.touchpoint_health === "Overdue" ||
                        selectedClient.touchpoint_health === "No Touchpoint Yet"
                        ? "red"
                        : selectedClient.touchpoint_health === "Due Soon"
                          ? "amber"
                          : "green"
                    }
                  />
                </div>
              }
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "PIC", value: selectedClient.internal_pic_name ?? "-" },
                    { label: "Client Status", value: displayClientStatus(selectedClient.health_status) },
                    { label: "Last Contact", value: formatDisplayDate(selectedClient.last_client_touchpoint) },
                    { label: "Days Since", value: selectedClient.touchpoint_days_since ?? "-" },
                  ]}
                />
              }
            />

            <DrawerSection title="Client Snapshot">
              <DrawerMetaRow
                items={[
                  { label: "Client Type", value: selectedClient.client_type },
                  { label: "Engagement", value: selectedClient.engagement_type },
                  { label: "Open Deliverables", value: openDeliverablesByClientId[selectedClient.client_id] ?? 0 },
                  { label: "Pending Items", value: pendingItemsByClientId[selectedClient.client_id] ?? 0 },
                ]}
              />
            </DrawerSection>

            <DrawerActions>
              <Button size="xs" asChild>
                <Link href={`/clients/${selectedClient.client_id}`}>Open</Link>
              </Button>
              <Button variant="secondary" size="xs" type="button" onClick={() => setLogClientId(selectedClient.client_id)}>
                Log Contact
              </Button>
              {showQuickActions ? (
                <>
                  <Button variant="secondary" size="xs" asChild>
                    <Link href={`/clients/${selectedClient.client_id}?tab=deliverables`}>Add Deliverable</Link>
                  </Button>
                  <Button variant="secondary" size="xs" asChild>
                    <Link href={`/clients/${selectedClient.client_id}?tab=tasks`}>Add Task</Link>
                  </Button>
                </>
              ) : null}
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>

      <ResponsiveOverlay
        open={Boolean(logClient)}
        onClose={() => setLogClientId(null)}
        title="Log Communication"
        subtitle={logClient ? logClient.client_name : undefined}
      >
        {logClient ? (
          <form action={createCommunicationLogAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="client_id" value={logClient.client_id} />

            <Input name="communication_date" type="date" required defaultValue={todayIso} />
            <select name="channel" required defaultValue="WhatsApp" className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="Phone Call">Phone Call</option>
              <option value="Video Call">Video Call</option>
              <option value="In-Person Meeting">In-Person Meeting</option>
              <option value="Client Visit">Client Visit</option>
              <option value="Other">Other</option>
            </select>

            <select name="direction" required defaultValue="Outbound" className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="Outbound">Outbound</option>
              <option value="Inbound">Inbound</option>
            </select>
            <Input name="counterpart_name" placeholder="Counterpart Name" required />

            <textarea
              name="summary"
              required
              placeholder="Summary / Notes"
              className="min-h-[90px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
            />

            <details className="rounded-md border border-border bg-white p-3 md:col-span-2">
              <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced / Optional Details</summary>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input name="counterpart_designation" placeholder="Counterpart Designation" />
                <Input name="attachment_link" placeholder="Attachment / Link" />
                <input type="hidden" name="related_deliverable_id" value="" />
                <input type="hidden" name="related_task_id" value="" />
              </div>
            </details>

            <div className="md:col-span-2">
              <FormSubmitButton idleLabel="Add Communication Log" pendingLabel="Saving..." />
            </div>
          </form>
        ) : null}
      </ResponsiveOverlay>
    </>
  )
}
