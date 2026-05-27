"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { updateDeliverableStatusAction } from "@/app/actions/deliverables"
import { updateTaskStatusAction } from "@/app/actions/tasks"
import {
  addPeopleInvolvedAction,
  unlinkPeopleInvolvedAction,
  updatePeopleInvolvedAction,
} from "@/app/actions/work-item-people"
import { Button } from "@/components/ui/button"
import {
  ConfirmDialog,
  DetailDrawer,
  DrawerActions,
  DrawerHeader,
  DrawerMetaRow,
  DrawerSection,
} from "@/components/ui/detail-drawer"
import { CollapsibleEditSection, EmptyState, ItemCard, PillBadge, QuickActionPanel } from "@/components/ui/patterns"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatDisplayDate } from "@/lib/date"
import {
  EXTERNAL_INVOLVEMENT_PURPOSES,
  EXTERNAL_INVOLVEMENT_STATUSES,
} from "@/types/domain"

export type WorkItemDrawerRow = {
  itemType: "Deliverable" | "Task"
  itemId: string
  itemName: string
  clientId: string | null
  clientName: string
  picId: string
  picName: string
  dueDate: string
  status: string
  priority: string
  category: string | null
  latestUpdate: string | null
}

export type WorkItemPeopleInvolved = {
  link_id: string
  client_id: string
  external_contact_id: string
  external_contact_name: string
  external_contact_organisation: string | null
  external_contact_type: string
  deliverable_id: string | null
  task_id: string | null
  purpose: string
  involvement_status: string
  scheduled_date: string | null
  completed_date: string | null
  outcome: string | null
  notes: string | null
}

export type ExternalContactOption = {
  external_contact_id: string
  name: string
  organisation: string | null
  contact_type: string
  is_active: boolean
}

function workItemKey(item: WorkItemDrawerRow) {
  return `${item.itemType}-${item.itemId}`
}

function getItemHref(item: WorkItemDrawerRow) {
  if (item.itemType === "Deliverable" && item.clientId) {
    return `/clients/${item.clientId}?tab=deliverables`
  }
  if (item.clientId) {
    return `/clients/${item.clientId}?tab=tasks`
  }
  return "/tasks"
}

export function WorkItemsListWithDrawer({
  rows,
  emptyTitle,
  emptyDescription,
  canWrite,
  returnTo,
  statusOptions,
  desktopTwoColumn = false,
  peopleInvolvedByWorkItem = {},
  externalContactOptions = [],
  canManagePeopleInvolved = false,
}: {
  rows: WorkItemDrawerRow[]
  emptyTitle: string
  emptyDescription: string
  canWrite: boolean
  returnTo: string
  statusOptions: string[]
  desktopTwoColumn?: boolean
  peopleInvolvedByWorkItem?: Record<string, WorkItemPeopleInvolved[]>
  externalContactOptions?: ExternalContactOption[]
  canManagePeopleInvolved?: boolean
}) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  const [statusEditorKey, setStatusEditorKey] = useState<string | null>(null)
  const selectedItem = useMemo(() => rows.find((row) => workItemKey(row) === selectedKey) ?? null, [rows, selectedKey])

  if (rows.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />
  }

  const latestUpdatePreview = (value: string | null) => {
    if (!value) return null
    const trimmed = value.trim()
    if (trimmed.length === 0 || trimmed.length > 80) return null
    return trimmed
  }
  const selectedPeopleInvolved = selectedItem ? peopleInvolvedByWorkItem[workItemKey(selectedItem)] ?? [] : []
  const canManageSelectedPeopleInvolved = canManagePeopleInvolved && Boolean(selectedItem?.clientId)

  return (
    <>
      <div className={desktopTwoColumn ? "grid grid-cols-1 gap-3 lg:grid-cols-2" : "space-y-4"}>
        {rows.map((item) => (
          <ItemCard
            key={workItemKey(item)}
            title={
              <div className="space-y-0.5">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-navy">{item.clientName}</p>
                <button type="button" className="text-left hover:underline" onClick={() => setSelectedKey(workItemKey(item))}>
                  {item.itemName}
                </button>
              </div>
            }
            status={<StatusBadge status={item.status} compact />}
            metaLine={
              <>
                Due: <span className="font-medium text-text-primary">{formatDisplayDate(item.dueDate)}</span> | PIC:{" "}
                <span className="font-medium text-text-primary">{item.picName}</span>
                {item.priority === "Critical" || item.priority === "High" ? (
                  <>
                    {" | "}Priority: <span className="font-medium text-text-primary">{item.priority}</span>
                  </>
                ) : null}
              </>
            }
            subLine={
              latestUpdatePreview(item.latestUpdate) ? (
                <>
                  Latest Update:{" "}
                  <span className="font-medium text-text-primary">{latestUpdatePreview(item.latestUpdate)}</span>
                </>
              ) : undefined
            }
          >
            <DrawerActions>
              <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedKey(workItemKey(item))}>
                View
              </Button>
              {canWrite ? (
                <Button
                  type="button"
                  variant="secondary"
                  size="xs"
                  onClick={() =>
                    setStatusEditorKey((current) => (current === workItemKey(item) ? null : workItemKey(item)))
                  }
                >
                  {item.status === "Completed" ? "Change" : "Update"}
                </Button>
              ) : null}
            </DrawerActions>

            {canWrite ? (
              statusEditorKey === workItemKey(item) ? (
                <form action={item.itemType === "Deliverable" ? updateDeliverableStatusAction : updateTaskStatusAction}>
                  <QuickActionPanel>
                    <input type="hidden" name="return_to" value={returnTo} />
                    {item.itemType === "Deliverable" ? (
                      <>
                        <input type="hidden" name="deliverable_id" value={item.itemId} />
                        <input type="hidden" name="client_id" value={item.clientId ?? ""} />
                      </>
                    ) : (
                      <>
                        <input type="hidden" name="task_id" value={item.itemId} />
                        <input type="hidden" name="client_id" value={item.clientId ?? ""} />
                      </>
                    )}
                    <input type="hidden" name="pic_id" value={item.picId} />
                    <div className="flex flex-col gap-2 md:flex-row">
                      <select name="status" defaultValue={item.status} className="h-10 rounded-md border border-border px-3 text-sm md:min-w-[220px]">
                        {statusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                      <input
                        name={item.itemType === "Deliverable" ? "notes" : "description"}
                        defaultValue={item.latestUpdate ?? ""}
                        placeholder="Remarks / Latest Update"
                        className="h-10 flex-1 rounded-md border border-border px-3 text-sm"
                      />
                      <Button type="submit" size="xs">Update</Button>
                    </div>
                  </QuickActionPanel>
                </form>
              ) : null
            ) : null}
          </ItemCard>
        ))}
      </div>

      <DetailDrawer
        open={Boolean(selectedItem)}
        onClose={() => setSelectedKey(null)}
        title={selectedItem?.itemName ?? "Work Item"}
        subtitle={selectedItem ? `${selectedItem.itemType} quick view` : undefined}
      >
        {selectedItem ? (
          <div className="space-y-3">
            <DrawerHeader
              title={selectedItem.itemName}
              badge={<StatusBadge status={selectedItem.status} compact />}
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "Client", value: selectedItem.clientName },
                    { label: "PIC", value: selectedItem.picName },
                    { label: "Due", value: formatDisplayDate(selectedItem.dueDate) },
                    { label: "Priority", value: selectedItem.priority },
                  ]}
                />
              }
            />
            <DrawerSection title="Details">
              <DrawerMetaRow
                items={[
                  { label: "Type", value: selectedItem.itemType },
                  { label: "Category", value: selectedItem.category ?? "-" },
                ]}
              />
              <p className="mt-2 text-xs text-text-secondary">
                Latest Update: <span className="font-medium text-text-primary">{selectedItem.latestUpdate ?? "-"}</span>
              </p>
            </DrawerSection>
            <DrawerSection title="People Involved">
              {selectedPeopleInvolved.length === 0 ? (
                <p className="text-xs text-text-secondary">No people linked yet.</p>
              ) : (
                <div className="space-y-2">
                  {selectedPeopleInvolved.map((person) => (
                    <article key={person.link_id} className="rounded-md border border-border p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-text-primary">
                            {person.external_contact_name}
                            {person.external_contact_organisation ? `, ${person.external_contact_organisation}` : ""}
                          </p>
                          <p className="text-xs text-text-secondary">
                            {person.external_contact_type} | Purpose:{" "}
                            <span className="font-medium text-text-primary">{person.purpose}</span>
                            {person.scheduled_date ? (
                              <>
                                {" | "}Scheduled:{" "}
                                <span className="font-medium text-text-primary">{formatDisplayDate(person.scheduled_date)}</span>
                              </>
                            ) : null}
                            {person.completed_date ? (
                              <>
                                {" | "}Completed:{" "}
                                <span className="font-medium text-text-primary">{formatDisplayDate(person.completed_date)}</span>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <PillBadge label={person.involvement_status} tone="amber" compact />
                      </div>
                      {person.notes ? (
                        <p className="mt-1 text-xs text-text-secondary">
                          Notes: <span className="font-medium text-text-primary">{person.notes}</span>
                        </p>
                      ) : null}
                      <DrawerActions>
                        <Button type="button" variant="ghost" size="xs" asChild>
                          <Link href={`/external-contacts?external_contact_id=${person.external_contact_id}`}>View</Link>
                        </Button>
                      </DrawerActions>
                      {canManageSelectedPeopleInvolved ? (
                        <CollapsibleEditSection title="Update Person Involvement">
                          <form action={updatePeopleInvolvedAction} className="space-y-2">
                            <input type="hidden" name="return_to" value={returnTo} />
                            <input type="hidden" name="link_id" value={person.link_id} />
                            <input type="hidden" name="client_id" value={person.client_id} />
                            <input type="hidden" name="external_contact_id" value={person.external_contact_id} />
                            <input type="hidden" name="deliverable_id" value={person.deliverable_id ?? ""} />
                            <input type="hidden" name="task_id" value={person.task_id ?? ""} />
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <select name="purpose" defaultValue={person.purpose} className="h-9 rounded-md border border-border px-2 text-sm">
                                {EXTERNAL_INVOLVEMENT_PURPOSES.map((value) => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                              <select name="involvement_status" defaultValue={person.involvement_status} className="h-9 rounded-md border border-border px-2 text-sm">
                                {EXTERNAL_INVOLVEMENT_STATUSES.map((value) => (
                                  <option key={value} value={value}>{value}</option>
                                ))}
                              </select>
                              <input name="scheduled_date" type="date" defaultValue={person.scheduled_date ?? ""} className="h-9 rounded-md border border-border px-2 text-sm" />
                              <input name="completed_date" type="date" defaultValue={person.completed_date ?? ""} className="h-9 rounded-md border border-border px-2 text-sm" />
                              <input name="outcome" defaultValue={person.outcome ?? ""} placeholder="Outcome" className="h-9 rounded-md border border-border px-2 text-sm md:col-span-2" />
                              <textarea name="notes" defaultValue={person.notes ?? ""} placeholder="Notes" className="min-h-[70px] rounded-md border border-border px-2 py-1.5 text-sm md:col-span-2" />
                            </div>
                            <DrawerActions>
                              <Button type="submit" variant="secondary" size="xs">Update</Button>
                              <ConfirmDialog
                                triggerLabel="Unlink"
                                triggerVariant="danger"
                                title="Remove person from People Involved?"
                                description="This will unlink the person from this work item."
                                confirmNode={
                                  <button
                                    formAction={unlinkPeopleInvolvedAction}
                                    type="submit"
                                    className="inline-flex h-8 items-center justify-center rounded-md bg-status-red px-3 text-xs font-medium text-white"
                                  >
                                    Confirm Unlink
                                  </button>
                                }
                              />
                            </DrawerActions>
                          </form>
                        </CollapsibleEditSection>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}

              {canManageSelectedPeopleInvolved ? (
                <CollapsibleEditSection title="Add People Involved">
                  <form action={addPeopleInvolvedAction} className="space-y-2">
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="client_id" value={selectedItem.clientId ?? ""} />
                    <input type="hidden" name="deliverable_id" value={selectedItem.itemType === "Deliverable" ? selectedItem.itemId : ""} />
                    <input type="hidden" name="task_id" value={selectedItem.itemType === "Task" ? selectedItem.itemId : ""} />
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <select name="external_contact_id" required className="h-9 rounded-md border border-border px-2 text-sm md:col-span-2">
                        <option value="">Select External Contact</option>
                        {externalContactOptions.map((contact) => (
                          <option key={contact.external_contact_id} value={contact.external_contact_id}>
                            {contact.name}
                            {contact.organisation ? `, ${contact.organisation}` : ""}
                            {` (${contact.contact_type})`}
                          </option>
                        ))}
                      </select>
                      <select name="purpose" defaultValue="Other" className="h-9 rounded-md border border-border px-2 text-sm">
                        {EXTERNAL_INVOLVEMENT_PURPOSES.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                      <select name="involvement_status" defaultValue="Invited" className="h-9 rounded-md border border-border px-2 text-sm">
                        {EXTERNAL_INVOLVEMENT_STATUSES.map((value) => (
                          <option key={value} value={value}>{value}</option>
                        ))}
                      </select>
                      <input name="scheduled_date" type="date" className="h-9 rounded-md border border-border px-2 text-sm" />
                      <input name="completed_date" type="date" className="h-9 rounded-md border border-border px-2 text-sm" />
                      <input name="outcome" placeholder="Outcome" className="h-9 rounded-md border border-border px-2 text-sm md:col-span-2" />
                      <textarea name="notes" placeholder="Notes" className="min-h-[70px] rounded-md border border-border px-2 py-1.5 text-sm md:col-span-2" />
                    </div>
                    <DrawerActions>
                      <Button type="submit" size="xs">Add</Button>
                      <Button type="button" variant="ghost" size="xs" asChild>
                        <Link href="/external-contacts">Add New External Contact</Link>
                      </Button>
                    </DrawerActions>
                  </form>
                </CollapsibleEditSection>
              ) : canManagePeopleInvolved && selectedItem?.itemType === "Task" && !selectedItem.clientId ? (
                <p className="text-xs text-text-secondary">
                  People Involved linking is available only for client-linked tasks in MVP.
                </p>
              ) : null}
            </DrawerSection>
            {canWrite ? (
              <DrawerSection title="Quick Status Update">
                <form action={selectedItem.itemType === "Deliverable" ? updateDeliverableStatusAction : updateTaskStatusAction} className="space-y-2">
                  <input type="hidden" name="return_to" value={returnTo} />
                  {selectedItem.itemType === "Deliverable" ? (
                    <>
                      <input type="hidden" name="deliverable_id" value={selectedItem.itemId} />
                      <input type="hidden" name="client_id" value={selectedItem.clientId ?? ""} />
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="task_id" value={selectedItem.itemId} />
                      <input type="hidden" name="client_id" value={selectedItem.clientId ?? ""} />
                    </>
                  )}
                  <input type="hidden" name="pic_id" value={selectedItem.picId} />
                  <select name="status" defaultValue={selectedItem.status} className="h-9 w-full rounded-md border border-border px-2 text-sm">
                    {statusOptions.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <textarea
                    name={selectedItem.itemType === "Deliverable" ? "notes" : "description"}
                    defaultValue={selectedItem.latestUpdate ?? ""}
                    className="w-full rounded-md border border-border px-2 py-2 text-sm"
                    rows={3}
                  />
                  <Button type="submit" size="xs">Update</Button>
                </form>
              </DrawerSection>
            ) : null}
            <DrawerActions>
              <Button size="xs" asChild>
                <Link href={getItemHref(selectedItem)}>
                  Open
                </Link>
              </Button>
              {selectedItem.clientId ? (
                <Button variant="secondary" size="xs" asChild>
                  <Link href={`/clients/${selectedItem.clientId}`}>View</Link>
                </Button>
              ) : null}
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}
