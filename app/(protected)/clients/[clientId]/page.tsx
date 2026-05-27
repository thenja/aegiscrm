import Link from "next/link"

import { createCommunicationLogAction } from "@/app/actions/communication-logs"
import { createContactAction } from "@/app/actions/contacts"
import { updateClientAction } from "@/app/actions/clients"
import { createDeliverableAction } from "@/app/actions/deliverables"
import { createTaskAction } from "@/app/actions/tasks"
import { CommunicationHistoryWithDrawer } from "@/components/clients/communication-history-with-drawer"
import { ContactsListWithDrawer } from "@/components/clients/contacts-list-with-drawer"
import { WorkItemsListWithDrawer, type WorkItemDrawerRow } from "@/components/workitems/work-items-list-with-drawer"
import { DeliverableFormFields } from "@/components/workitems/deliverable-form-fields"
import { TaskFormFields } from "@/components/workitems/task-form-fields"
import { ActionFeedback } from "@/components/ui/action-feedback"
import { Button } from "@/components/ui/button"
import { ModalForm } from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import {
  EmptyState,
  FormSection,
  MetricCard,
  PillBadge,
  SectionCard,
  TabsBar,
} from "@/components/ui/patterns"
import { requireAuth } from "@/lib/auth"
import { daysSinceDateInSingapore, formatDisplayDate, getSingaporeTodayIsoDate, getTouchpointHealth } from "@/lib/date"
import { listClientCommunicationLogs } from "@/lib/data/communication-logs"
import { getClientById, getUsersForClientAssignments, listClientContacts } from "@/lib/data/clients"
import { listDeliverables } from "@/lib/data/deliverables"
import {
  listExternalContactsForSelect,
  listPeopleInvolvedByWorkItems,
} from "@/lib/data/external-contacts"
import { listTasks } from "@/lib/data/tasks"
import { hasRole } from "@/lib/permissions"
import { displayClientStatus, displayFollowUpStatus } from "@/lib/ui-copy"
import {
  CLIENT_STATUSES,
  CLIENT_TYPES,
  COMM_CHANNELS,
  COMM_DIRECTIONS,
  CONTACT_TYPES,
  DELIVERABLE_STATUSES,
  ENGAGEMENT_TYPES,
  HEALTH_STATUSES,
  MARKET_TYPES,
  SERVICING_FREQUENCIES,
  TASK_STATUSES,
} from "@/types/domain"

const tabs = [
  "details",
  "contacts",
  "deliverables",
  "tasks",
  "approvals",
  "communication",
  "activity",
  "key-dates",
] as const

type TabKey = (typeof tabs)[number]

const tabLabels: Record<TabKey, string> = {
  details: "Details",
  contacts: "Contacts",
  deliverables: "Deliverables",
  tasks: "Tasks",
  approvals: "Approvals",
  communication: "Communication",
  activity: "Activity",
  "key-dates": "Key Dates",
}

function getTab(value: string | undefined): TabKey {
  if (value && tabs.includes(value as TabKey)) {
    return value as TabKey
  }
  return "details"
}

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: { clientId: string } | Promise<{ clientId: string }>
  searchParams?: {
    tab?: string
    feedback?: string
    message?: string
    reset_create_contact?: string
    reset_create_comm_log?: string
    reset_create_deliverable?: string
    reset_create_task?: string
  } | Promise<{
    tab?: string
    feedback?: string
    message?: string
    reset_create_contact?: string
    reset_create_comm_log?: string
    reset_create_deliverable?: string
    reset_create_task?: string
  }>
}) {
  const auth = await requireAuth()
  const resolvedParams = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const clientId = resolvedParams.clientId
  const tab = getTab(resolvedSearchParams?.tab)

  let client
  try {
    client = await getClientById(clientId)
  } catch {
    return (
      <SectionCard className="p-4">
        <h2 className="text-base font-semibold text-navy">Client not found or you do not have access.</h2>
        <p className="mt-1 text-sm text-text-secondary">Please verify the client link or return to the client list.</p>
        <div className="mt-3">
          <Button asChild size="sm">
            <Link href="/clients">Back to Clients</Link>
          </Button>
        </div>
      </SectionCard>
    )
  }

  const [contacts, users, deliverables, tasks, communicationLogs, externalContactOptions] = await Promise.all([
    listClientContacts(clientId),
    getUsersForClientAssignments(),
    listDeliverables({ client_id: clientId }),
    listTasks({ client_id: clientId }),
    listClientCommunicationLogs(clientId),
    listExternalContactsForSelect(),
  ])
  const peopleInvolvedByWorkItem = await listPeopleInvolvedByWorkItems({
    deliverableIds: deliverables.map((item) => item.deliverable_id),
    taskIds: tasks.map((item) => item.task_id),
  })

  const isOwnClient = auth.profile.user_id === client.internal_pic_id || auth.profile.user_id === client.backup_pic_id

  const canEditContacts = hasRole(auth.profile.role, ["Director", "Team Lead", "Admin"]) || isOwnClient

  const canLogCommunication =
    hasRole(auth.profile.role, ["Director", "Team Lead"]) ||
    (auth.profile.role === "Team Member" && isOwnClient)

  const canEditWorkItems =
    hasRole(auth.profile.role, ["Director", "Team Lead"]) ||
    (auth.profile.role === "Team Member" && isOwnClient)

  const canEditFee = hasRole(auth.profile.role, ["Director"])
  const canViewFee = hasRole(auth.profile.role, ["Director", "Admin"])
  const touchpointHealth = getTouchpointHealth(client.last_client_touchpoint, client.touchpoint_overdue_days)
  const touchpointDaysSince = daysSinceDateInSingapore(client.last_client_touchpoint)
  const todayIso = getSingaporeTodayIsoDate()

  const internalPicName = users.find((u) => u.user_id === client.internal_pic_id)?.full_name ?? "-"
  const deliverableRows: WorkItemDrawerRow[] = deliverables.map((item) => ({
    itemType: "Deliverable",
    itemId: item.deliverable_id,
    itemName: item.deliverable_name,
    clientId: item.client_id,
    clientName: item.client_name,
    picId: item.pic_id,
    picName: item.pic_name,
    dueDate: item.due_date,
    status: item.status,
    priority: item.priority,
    category: item.category,
    latestUpdate: item.notes,
  }))
  const taskRows: WorkItemDrawerRow[] = tasks.map((item) => ({
    itemType: "Task",
    itemId: item.task_id,
    itemName: item.task_title,
    clientId: item.client_id,
    clientName: item.client_name ?? "Global Internal",
    picId: item.pic_id,
    picName: item.pic_name,
    dueDate: item.due_date,
    status: item.status,
    priority: item.priority,
    category: item.category,
    latestUpdate: item.description,
  }))
  const tabsConfig = tabs.map((tabKey) => ({
    key: tabKey,
    label: tabLabels[tabKey],
    href: `/clients/${clientId}?tab=${tabKey}`,
    active: tab === tabKey,
  }))

  return (
    <div className="space-y-6">
      <ActionFeedback feedback={resolvedSearchParams?.feedback} message={resolvedSearchParams?.message} />

      <SectionCard className="p-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-navy">{client.client_name}</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {client.status} | {client.client_type} | {client.market ?? "Not Listed"} | PIC: {internalPicName}
                {" | "}Last Contact: {formatDisplayDate(client.last_client_touchpoint)}
                {" | "}Days Since: {touchpointDaysSince ?? "-"}
                {" | "}Next Follow-up: {formatDisplayDate(client.next_scheduled_touchpoint)}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <PillBadge label={displayClientStatus(client.health_status)} tone={client.health_status === "Healthy" ? "green" : "amber"} />
              <PillBadge label={client.engagement_type} tone="blue" />
              <PillBadge
                label={displayFollowUpStatus(touchpointHealth)}
                tone={
                  touchpointHealth === "Overdue" || touchpointHealth === "No Touchpoint Yet"
                    ? "red"
                    : touchpointHealth === "Due Soon"
                      ? "amber"
                      : "green"
                }
              />
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard>
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <TabsBar tabs={tabsConfig} />

            {tab === "details" ? (
              <div className="space-y-4">
                <SectionCard title="Summary" description="Read-only snapshot of key client information.">
                  <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
                    <p>Client: <span className="font-medium text-text-primary">{client.client_name}</span></p>
                    <p>Status: <span className="font-medium text-text-primary">{client.status}</span></p>
                    <p>Client Status: <span className="font-medium text-text-primary">{displayClientStatus(client.health_status)}</span></p>
                    <p>PIC: <span className="font-medium text-text-primary">{internalPicName}</span></p>
                    <p>Contract End: <span className="font-medium text-text-primary">{formatDisplayDate(client.contract_end)}</span></p>
                    <p>Servicing Frequency: <span className="font-medium text-text-primary">{client.servicing_frequency}</span></p>
                  </div>
                </SectionCard>

                <SectionCard
                  title="Client Details"
                  description="Manage full client details in overlay."
                  action={
                    <ModalForm triggerLabel="Edit Client Details" title="Edit Client Details">
                      <FormSection title="Edit Client Details">
                        <form action={updateClientAction} className="space-y-4">
                          <input type="hidden" name="return_to" value={`/clients/${clientId}?tab=details`} />
                          <input type="hidden" name="client_id" value={client.client_id} />
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <Input name="client_name" defaultValue={client.client_name} required />
                            <Input name="stock_code" defaultValue={client.stock_code ?? ""} />

                            <select name="market" defaultValue={client.market ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                              <option value="">Market (Optional)</option>
                              {MARKET_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <Input name="sector" defaultValue={client.sector ?? ""} />

                            <select name="engagement_type" defaultValue={client.engagement_type} className="h-10 rounded-md border border-border px-3 text-sm">
                              {ENGAGEMENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <select name="client_type" defaultValue={client.client_type} className="h-10 rounded-md border border-border px-3 text-sm">
                              {CLIENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>

                            <select name="status" defaultValue={client.status} className="h-10 rounded-md border border-border px-3 text-sm">
                              {CLIENT_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <select name="health_status" defaultValue={client.health_status} className="h-10 rounded-md border border-border px-3 text-sm">
                              {HEALTH_STATUSES.map((v) => <option key={v} value={v}>{v === "Healthy" ? "Good" : v}</option>)}
                            </select>

                            <select name="internal_pic_id" defaultValue={client.internal_pic_id} className="h-10 rounded-md border border-border px-3 text-sm">
                              {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                            </select>
                            <select name="backup_pic_id" defaultValue={client.backup_pic_id ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
                              <option value="">No Backup PIC</option>
                              {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
                            </select>

                            <select name="servicing_frequency" defaultValue={client.servicing_frequency} className="h-10 rounded-md border border-border px-3 text-sm">
                              {SERVICING_FREQUENCIES.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <Input name="required_monthly_contacts" type="number" min="0" defaultValue={String(client.required_monthly_contacts)} />

                            <Input name="touchpoint_overdue_days" type="number" min="1" defaultValue={String(client.touchpoint_overdue_days)} />
                            <Input name="contract_start" type="date" defaultValue={client.contract_start ?? ""} />
                            <Input name="contract_end" type="date" defaultValue={client.contract_end ?? ""} />
                            {canEditFee ? <Input name="monthly_fee" type="number" step="0.01" min="0" defaultValue={client.monthly_fee?.toString() ?? ""} /> : null}
                            {!canEditFee && canViewFee ? <Input value={client.monthly_fee?.toString() ?? ""} readOnly disabled /> : null}
                          </div>

                          <textarea name="scope_of_work" defaultValue={client.scope_of_work} required className="min-h-[100px] w-full rounded-md border border-border px-3 py-2 text-sm" />
                          <textarea name="notes" defaultValue={client.notes ?? ""} className="min-h-[80px] w-full rounded-md border border-border px-3 py-2 text-sm" />
                          <Button type="submit">Save Client Details</Button>
                        </form>
                      </FormSection>
                    </ModalForm>
                  }
                >
                  <p className="text-sm text-text-secondary">Use Edit Client Details to update full profile fields.</p>
                </SectionCard>
              </div>
            ) : null}

            {tab === "contacts" ? (
              <div className="space-y-4">
                <SectionCard
                  title="Existing Contacts"
                  description="Review summary and open contact overlay to edit."
                  action={
                    canEditContacts ? (
                      <ModalForm triggerLabel="+ New Contact" title="Add New Contact">
                        <FormSection title="Add New Contact">
                          <form
                            key={resolvedSearchParams?.reset_create_contact ?? "create-contact-form"}
                            action={createContactAction}
                            className="grid grid-cols-1 gap-3 md:grid-cols-2"
                          >
                            <input type="hidden" name="return_to" value={`/clients/${clientId}?tab=contacts`} />
                            <input type="hidden" name="client_id" value={client.client_id} />
                            <Input name="contact_name" placeholder="Contact Name" required />
                            <Input name="designation" placeholder="Designation" />
                            <Input name="email" type="email" placeholder="Email" />
                            <Input name="phone" placeholder="Phone" />
                            <select name="contact_type" className="h-10 rounded-md border border-border px-3 text-sm">
                              {CONTACT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                            </select>
                            <select name="is_primary" defaultValue="false" className="h-10 rounded-md border border-border px-3 text-sm">
                              <option value="false">Secondary</option>
                              <option value="true">Primary</option>
                            </select>
                            <textarea name="notes" placeholder="Notes" className="min-h-[80px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2" />
                            <div className="md:col-span-2"><Button type="submit">Add Contact</Button></div>
                          </form>
                        </FormSection>
                      </ModalForm>
                    ) : null
                  }
                >
                  <ContactsListWithDrawer
                    contacts={contacts}
                    clientId={client.client_id}
                    returnTo={`/clients/${clientId}?tab=contacts`}
                    canEdit={canEditContacts}
                  />
                </SectionCard>
              </div>
            ) : null}

            {tab === "deliverables" ? (
              <div className="space-y-4">
                <SectionCard
                  title="Deliverables List"
                  description="Track status, owner, due date, and latest updates."
                  action={
                    canEditWorkItems ? (
                      <ModalForm triggerLabel="+ New Deliverable" title="Create New Deliverable">
                        <FormSection title="Create New Deliverable" description="Add core fields first. Optional tracking fields are available in Advanced Details.">
                          <form
                            key={resolvedSearchParams?.reset_create_deliverable ?? "create-deliverable-profile-form"}
                            action={createDeliverableAction}
                            className="grid grid-cols-1 gap-3 md:grid-cols-2"
                          >
                            <input type="hidden" name="return_to" value={`/clients/${clientId}?tab=deliverables`} />
                            <input type="hidden" name="sent_by_id" value={auth.profile.user_id} />
                            <DeliverableFormFields
                              users={users.map((u) => ({ user_id: u.user_id, full_name: u.full_name }))}
                              includeClientSelect={false}
                              fixedClientId={client.client_id}
                            />
                            <div className="md:col-span-2"><Button type="submit">Add Deliverable</Button></div>
                          </form>
                        </FormSection>
                      </ModalForm>
                    ) : null
                  }
                >
                  {deliverables.length === 0 ? (
                    <EmptyState title="No deliverables yet" description="Add a deliverable to start tracking client commitments." />
                  ) : (
                    <WorkItemsListWithDrawer
                      rows={deliverableRows}
                      emptyTitle="No deliverables yet"
                      emptyDescription="Add a deliverable to start tracking client commitments."
                      canWrite={canEditWorkItems}
                      returnTo={`/clients/${clientId}?tab=deliverables`}
                      statusOptions={Array.from(DELIVERABLE_STATUSES)}
                      desktopTwoColumn
                      peopleInvolvedByWorkItem={peopleInvolvedByWorkItem}
                      externalContactOptions={externalContactOptions}
                      canManagePeopleInvolved={canEditWorkItems}
                    />
                  )}
                </SectionCard>
              </div>
            ) : null}

            {tab === "tasks" ? (
              <div className="space-y-4">
                <SectionCard
                  title="Tasks List"
                  description="Track status, owner, due date, and latest updates."
                  action={
                    canEditWorkItems ? (
                      <ModalForm triggerLabel="+ New Task" title="Create New Task">
                        <FormSection title="Create New Task" description="Add core fields first. Optional tracking fields are available in Advanced Details.">
                          <form
                            key={resolvedSearchParams?.reset_create_task ?? "create-task-profile-form"}
                            action={createTaskAction}
                            className="grid grid-cols-1 gap-3 md:grid-cols-2"
                          >
                            <input type="hidden" name="return_to" value={`/clients/${clientId}?tab=tasks`} />
                            <input type="hidden" name="client_context" value="true" />
                            <input type="hidden" name="sent_by_id" value={auth.profile.user_id} />
                            <TaskFormFields
                              users={users.map((u) => ({ user_id: u.user_id, full_name: u.full_name }))}
                              includeClientSelect={false}
                              fixedClientId={client.client_id}
                            />
                            <div className="md:col-span-2"><Button type="submit">Add Task</Button></div>
                          </form>
                        </FormSection>
                      </ModalForm>
                    ) : null
                  }
                >
                  {tasks.length === 0 ? (
                    <EmptyState title="No tasks yet" description="Add a task to track daily execution items." />
                  ) : (
                    <WorkItemsListWithDrawer
                      rows={taskRows}
                      emptyTitle="No tasks yet"
                      emptyDescription="Add a task to track daily execution items."
                      canWrite={canEditWorkItems}
                      returnTo={`/clients/${clientId}?tab=tasks`}
                      statusOptions={Array.from(TASK_STATUSES)}
                      desktopTwoColumn
                      peopleInvolvedByWorkItem={peopleInvolvedByWorkItem}
                      externalContactOptions={externalContactOptions}
                      canManagePeopleInvolved={canEditWorkItems}
                    />
                  )}
                </SectionCard>
              </div>
            ) : null}

            {tab === "communication" ? (
              <div className="space-y-4">
                <SectionCard title="Follow-up Status">
                  <div className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-text-secondary">
                    Last Contact: <span className="font-medium text-text-primary">{formatDisplayDate(client.last_client_touchpoint)}</span>
                    {" | "}
                    Days Since: <span className="font-medium text-text-primary">{touchpointDaysSince ?? "-"}</span>
                    {" | "}
                    Status: <span className="font-medium text-text-primary">{displayFollowUpStatus(touchpointHealth)}</span>
                  </div>
                </SectionCard>

                <SectionCard title="Communication History">
                  <CommunicationHistoryWithDrawer logs={communicationLogs} clientId={client.client_id} />
                </SectionCard>
                {canLogCommunication ? (
                  <SectionCard
                    title="Log Communication"
                    action={
                      <ModalForm triggerLabel="+ Log Communication" title="Log Communication">
                        <FormSection title="Log Communication">
                          <form
                            key={resolvedSearchParams?.reset_create_comm_log ?? "create-comm-log-form"}
                            action={createCommunicationLogAction}
                            className="grid grid-cols-1 gap-3 md:grid-cols-2"
                          >
                            <input type="hidden" name="return_to" value={`/clients/${clientId}?tab=communication`} />
                            <input type="hidden" name="client_id" value={client.client_id} />

                            <Input name="communication_date" type="date" required defaultValue={todayIso} />
                            <select name="channel" className="h-10 rounded-md border border-border px-3 text-sm" required defaultValue="WhatsApp">
                              {COMM_CHANNELS.map((channel) => (
                                <option key={channel} value={channel}>{channel}</option>
                              ))}
                            </select>

                            <select name="direction" className="h-10 rounded-md border border-border px-3 text-sm" required defaultValue="Outbound">
                              {COMM_DIRECTIONS.map((direction) => (
                                <option key={direction} value={direction}>{direction}</option>
                              ))}
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

                                <select name="related_deliverable_id" className="h-10 rounded-md border border-border px-3 text-sm">
                                  <option value="">Related Deliverable</option>
                                  {deliverables.map((deliverable) => (
                                    <option key={deliverable.deliverable_id} value={deliverable.deliverable_id}>
                                      {deliverable.deliverable_name}
                                    </option>
                                  ))}
                                </select>
                                <select name="related_task_id" className="h-10 rounded-md border border-border px-3 text-sm">
                                  <option value="">Related Task</option>
                                  {tasks.map((task) => (
                                    <option key={task.task_id} value={task.task_id}>
                                      {task.task_title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </details>
                            <div className="md:col-span-2">
                              <Button type="submit">Add Communication Log</Button>
                            </div>
                          </form>
                        </FormSection>
                      </ModalForm>
                    }
                  >
                    <p className="text-sm text-text-secondary">Use + Log Communication to add a new contact update.</p>
                  </SectionCard>
                ) : null}
              </div>
            ) : null}

            {tab !== "details" && tab !== "contacts" && tab !== "deliverables" && tab !== "tasks" && tab !== "communication" ? (
              <SectionCard>
                <EmptyState title="Coming in future sprint" description="This module has not been implemented yet." />
              </SectionCard>
            ) : null}
          </div>

          <aside className="grid h-fit grid-cols-2 gap-2">
            <MetricCard label="Open Deliverables" value={deliverables.length} />
            <MetricCard label="Pending Approvals" value="-" />
            <MetricCard label="Monthly Contacts" value={client.required_monthly_contacts} />
            <MetricCard label="Client Status" value={displayClientStatus(client.health_status)} />
          </aside>
        </div>
      </SectionCard>
    </div>
  )
}
