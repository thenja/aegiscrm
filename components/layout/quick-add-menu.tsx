"use client"

import { Plus } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

import { createClientAction } from "@/app/actions/clients"
import { createCommunicationLogAction } from "@/app/actions/communication-logs"
import { createContactAction } from "@/app/actions/contacts"
import { createDeliverableAction } from "@/app/actions/deliverables"
import { createEventAction } from "@/app/actions/events"
import { createExternalContactAction } from "@/app/actions/external-contacts"
import { createTaskAction } from "@/app/actions/tasks"
import { DeliverableFormFields } from "@/components/workitems/deliverable-form-fields"
import { TaskFormFields } from "@/components/workitems/task-form-fields"
import { Button } from "@/components/ui/button"
import { ResponsiveOverlay } from "@/components/ui/detail-drawer"
import { FormSubmitButton } from "@/components/ui/form-submit-button"
import { Input } from "@/components/ui/input"
import { FormSection } from "@/components/ui/patterns"
import {
  CLIENT_STATUSES,
  CLIENT_TYPES,
  COMM_CHANNELS,
  COMM_DIRECTIONS,
  CONTACT_TYPES,
  ENGAGEMENT_TYPES,
  ATTENDANCE_EVENT_TYPES,
  ATTENDANCE_SEATING_MODES,
  EXTERNAL_CONTACT_TYPES,
  HEALTH_STATUSES,
  MARKET_TYPES,
  SERVICING_FREQUENCIES,
} from "@/types/domain"
import type { AppRole } from "@/types/roles"

type QuickAddType =
  | "client"
  | "contact"
  | "external_contact"
  | "event"
  | "deliverable"
  | "task"
  | "communication"
  | null

type QuickAddOption = {
  client_id: string
  client_name: string
}

type QuickAddUser = {
  user_id: string
  full_name: string
}

type QuickAddOptionsResponse = {
  clients: QuickAddOption[]
  users: QuickAddUser[]
}

type ClientWorkOptionsResponse = {
  deliverables: Array<{ id: string; name: string }>
  tasks: Array<{ id: string; name: string }>
}

function hasRole(role: AppRole, allowed: AppRole[]) {
  return allowed.includes(role)
}

function getSingaporeTodayIsoDate() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const year = parts.find((part) => part.type === "year")?.value ?? "0000"
  const month = parts.find((part) => part.type === "month")?.value ?? "01"
  const day = parts.find((part) => part.type === "day")?.value ?? "01"
  return `${year}-${month}-${day}`
}

function getDrawerTitle(type: QuickAddType) {
  if (type === "client") return "Add Client"
  if (type === "contact") return "Add Contact"
  if (type === "external_contact") return "Add External Contact"
  if (type === "event") return "Add Event"
  if (type === "deliverable") return "Add Deliverable"
  if (type === "task") return "Add Task"
  if (type === "communication") return "Log Communication"
  return "Quick Add"
}

export function QuickAddMenu({
  role,
  currentUserId,
}: {
  role: AppRole
  currentUserId: string
}) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [menuOpen, setMenuOpen] = useState(false)
  const [activeType, setActiveType] = useState<QuickAddType>(null)
  const [loadingOptions, setLoadingOptions] = useState(false)
  const [options, setOptions] = useState<QuickAddOptionsResponse>({ clients: [], users: [] })
  const [commClientId, setCommClientId] = useState("")
  const [commWorkOptions, setCommWorkOptions] = useState<ClientWorkOptionsResponse>({ deliverables: [], tasks: [] })
  const menuRef = useRef<HTMLDivElement | null>(null)

  const todayIso = useMemo(() => getSingaporeTodayIsoDate(), [])

  const canCreateClient = hasRole(role, ["Director", "Team Lead", "Admin"])
  const canCreateContact = hasRole(role, ["Director", "Team Lead", "Team Member", "Admin"])
  const canCreateExternalContact = hasRole(role, ["Director", "Team Lead"])
  const canCreateEvent = hasRole(role, ["Director", "Team Lead", "Team Member"])
  const canCreateWorkItems = hasRole(role, ["Director", "Team Lead", "Team Member"])
  const canLogCommunication = hasRole(role, ["Director", "Team Lead", "Team Member"])

  const returnTo = useMemo(() => {
    const filtered = new URLSearchParams()
    searchParams.forEach((value, key) => {
      if (key === "feedback" || key === "message" || key.startsWith("reset_")) return
      filtered.set(key, value)
    })
    const qs = filtered.toString()
    return qs.length > 0 ? `${pathname}?${qs}` : pathname
  }, [pathname, searchParams])

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!menuRef.current) return
      if (!menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [])

  const loadQuickAddOptions = () => {
    if (options.clients.length > 0 || loadingOptions) return
    setLoadingOptions(true)
    void fetch("/api/quick-add/options", { method: "GET", credentials: "same-origin" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: QuickAddOptionsResponse | null) => {
        if (!payload) return
        setOptions({
          clients: payload.clients ?? [],
          users: payload.users ?? [],
        })
      })
      .finally(() => setLoadingOptions(false))
  }

  useEffect(() => {
    if (!commClientId) {
      return
    }
    void fetch(`/api/quick-add/client-work-options?client_id=${encodeURIComponent(commClientId)}`, {
      method: "GET",
      credentials: "same-origin",
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: ClientWorkOptionsResponse | null) => {
        if (!payload) return
        setCommWorkOptions({
          deliverables: payload.deliverables ?? [],
          tasks: payload.tasks ?? [],
        })
      })
  }, [commClientId])

  const resolvedCommWorkOptions = commClientId ? commWorkOptions : { deliverables: [], tasks: [] }

  const openType = (type: QuickAddType) => {
    setMenuOpen(false)
    setActiveType(type)
  }

  return (
    <>
      <div ref={menuRef} className="relative">
        <Button
          type="button"
          variant="default"
          size="sm"
          className="h-8 px-2.5 sm:px-3"
          onClick={() =>
            setMenuOpen((prev) => {
              const next = !prev
              if (next) loadQuickAddOptions()
              return next
            })
          }
        >
          <Plus size={14} className="sm:hidden" />
          <span className="hidden sm:inline">Quick Add</span>
        </Button>

        {menuOpen ? (
          <div className="absolute right-0 top-10 z-40 w-56 rounded-lg border border-border bg-white p-1.5 shadow-[0_12px_26px_rgba(15,23,42,0.14)]">
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              onClick={() => openType("client")}
              disabled={!canCreateClient}
            >
              Add Client
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              onClick={() => openType("contact")}
              disabled={!canCreateContact}
            >
              Add Contact
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              onClick={() => openType("external_contact")}
              disabled={!canCreateExternalContact}
            >
              Add External Contact
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              onClick={() => openType("event")}
              disabled={!canCreateEvent}
            >
              Add Event
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              onClick={() => openType("deliverable")}
              disabled={!canCreateWorkItems}
            >
              Add Deliverable
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              onClick={() => openType("task")}
              disabled={!canCreateWorkItems}
            >
              Add Task
            </button>
            <button
              type="button"
              className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-50"
              onClick={() => openType("communication")}
              disabled={!canLogCommunication}
            >
              Log Communication
            </button>

            {loadingOptions ? (
              <p className="px-2 pt-1 text-[11px] text-text-secondary">Loading options...</p>
            ) : null}
          </div>
        ) : null}
      </div>

      <ResponsiveOverlay
        open={activeType !== null}
        onClose={() => setActiveType(null)}
        title={getDrawerTitle(activeType)}
      >
        {activeType === "client" ? (
          <FormSection title="Add Client" description="Essential details first. Optional fields are under Advanced / Optional Details.">
            <form action={createClientAction} className="space-y-4">
              <input type="hidden" name="return_to" value={returnTo} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input name="client_name" placeholder="Client Name" required />
                <select name="internal_pic_id" required className="h-10 rounded-md border border-border px-3 text-sm">
                  <option value="">Select PIC</option>
                  {options.users.map((user) => (
                    <option key={user.user_id} value={user.user_id}>{user.full_name}</option>
                  ))}
                </select>
                <select name="engagement_type" required className="h-10 rounded-md border border-border px-3 text-sm">
                  {ENGAGEMENT_TYPES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <select name="client_type" required className="h-10 rounded-md border border-border px-3 text-sm">
                  {CLIENT_TYPES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <select name="status" defaultValue="Active" required className="h-10 rounded-md border border-border px-3 text-sm">
                  {CLIENT_STATUSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <select name="health_status" defaultValue="Healthy" required className="h-10 rounded-md border border-border px-3 text-sm">
                  {HEALTH_STATUSES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <select name="servicing_frequency" defaultValue="Weekly" required className="h-10 rounded-md border border-border px-3 text-sm">
                  {SERVICING_FREQUENCIES.map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
                <Input name="required_monthly_contacts" type="number" min="0" required defaultValue="4" />
                <Input name="touchpoint_overdue_days" type="number" min="1" required defaultValue="7" />
              </div>

              <textarea
                name="scope_of_work"
                required
                placeholder="Scope of work"
                className="min-h-[90px] w-full rounded-md border border-border px-3 py-2 text-sm"
              />

              <details className="rounded-md border border-border bg-white p-3">
                <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced / Optional Details</summary>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input name="stock_code" placeholder="Stock Code" />
                  <select name="market" className="h-10 rounded-md border border-border px-3 text-sm">
                    <option value="">Market (Optional)</option>
                    {MARKET_TYPES.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <Input name="sector" placeholder="Sector" />
                  <select name="backup_pic_id" className="h-10 rounded-md border border-border px-3 text-sm">
                    <option value="">Backup PIC (Optional)</option>
                    {options.users.map((user) => (
                      <option key={user.user_id} value={user.user_id}>{user.full_name}</option>
                    ))}
                  </select>
                  <Input name="contract_start" type="date" />
                  <Input name="contract_end" type="date" />
                  <Input name="monthly_fee" type="number" step="0.01" min="0" placeholder="Monthly Fee" />
                  <textarea
                    name="notes"
                    placeholder="Notes"
                    className="min-h-[80px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
                  />
                </div>
              </details>

              <FormSubmitButton idleLabel="Create Client" pendingLabel="Creating..." />
            </form>
          </FormSection>
        ) : null}

        {activeType === "contact" ? (
          <FormSection title="Add Contact" description="Essential details first.">
            <form action={createContactAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <select name="client_id" required className="h-10 rounded-md border border-border px-3 text-sm md:col-span-2">
                <option value="">Select Client</option>
                {options.clients.map((client) => (
                  <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                ))}
              </select>
              <Input name="contact_name" placeholder="Contact Name" required />
              <select name="contact_type" className="h-10 rounded-md border border-border px-3 text-sm">
                {CONTACT_TYPES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select name="is_primary" defaultValue="false" className="h-10 rounded-md border border-border px-3 text-sm">
                <option value="false">Secondary</option>
                <option value="true">Primary</option>
              </select>
              <details className="rounded-md border border-border bg-white p-3 md:col-span-2">
                <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced / Optional Details</summary>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input name="designation" placeholder="Designation" />
                  <Input name="email" type="email" placeholder="Email" />
                  <Input name="phone" placeholder="Phone" />
                  <textarea name="notes" placeholder="Notes" className="min-h-[80px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2" />
                </div>
              </details>
              <div className="md:col-span-2">
                <FormSubmitButton idleLabel="Add Contact" pendingLabel="Adding..." />
              </div>
            </form>
          </FormSection>
        ) : null}

        {activeType === "deliverable" ? (
          <FormSection title="Add Deliverable" description="Essential details first. Optional tracking fields are under Advanced / Optional Details.">
            <form action={createDeliverableAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <input type="hidden" name="sent_by_id" value={currentUserId} />
              <DeliverableFormFields
                users={options.users}
                clients={options.clients}
                includeClientSelect
              />
              <div className="md:col-span-2">
                <FormSubmitButton idleLabel="Create Deliverable" pendingLabel="Creating..." />
              </div>
            </form>
          </FormSection>
        ) : null}

        {activeType === "external_contact" ? (
          <FormSection title="Add External Contact" description="Essential details first. Optional details can be added later.">
            <form action={createExternalContactAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <Input name="name" placeholder="Name" required />
              <Input name="organisation" placeholder="Organisation" />
              <select name="contact_type" defaultValue="Other" className="h-10 rounded-md border border-border px-3 text-sm" required>
                {EXTERNAL_CONTACT_TYPES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <Input name="designation" placeholder="Designation" />
              <Input name="email" type="email" placeholder="Email" />
              <Input name="phone" placeholder="Phone" />
              <details className="rounded-md border border-border bg-white p-3 md:col-span-2">
                <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced / Optional Details</summary>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input name="sector_beat" placeholder="Sector / Beat" />
                  <Input name="language" placeholder="Language" />
                  <Input name="country_market" placeholder="Country / Market" />
                  <Input name="relationship_status" placeholder="Relationship Status" />
                  <textarea
                    name="notes"
                    placeholder="Notes"
                    className="min-h-[90px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
                  />
                </div>
              </details>
              <input type="hidden" name="is_active" value="true" />
              <div className="md:col-span-2">
                <FormSubmitButton idleLabel="Create External Contact" pendingLabel="Creating..." />
              </div>
            </form>
          </FormSection>
        ) : null}

        {activeType === "event" ? (
          <FormSection title="Add Event" description="Set up event details quickly. Event code is auto-generated unless provided.">
            <form action={createEventAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <select name="client_id" required className="h-10 rounded-md border border-border px-3 text-sm md:col-span-2">
                <option value="">Select Client</option>
                {options.clients.map((client) => (
                  <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                ))}
              </select>
              <Input name="event_name" placeholder="Event Name" required className="md:col-span-2" />
              <Input name="event_date" type="date" required defaultValue={todayIso} />
              <Input name="venue" placeholder="Venue" />
              <select name="event_type" defaultValue="Other" required className="h-10 rounded-md border border-border px-3 text-sm">
                {ATTENDANCE_EVENT_TYPES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <select name="seating_mode" defaultValue="Without Table" required className="h-10 rounded-md border border-border px-3 text-sm">
                {ATTENDANCE_SEATING_MODES.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
              <input type="hidden" name="status" value="Draft" />
              <details className="rounded-md border border-border bg-white p-3 md:col-span-2">
                <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced / Optional Details</summary>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Input name="event_code" placeholder="Event Code (Optional)" />
                  <Input name="starts_at" type="datetime-local" />
                  <Input name="ends_at" type="datetime-local" />
                  <textarea
                    name="notes"
                    placeholder="Notes"
                    className="min-h-[80px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
                  />
                </div>
              </details>
              <div className="md:col-span-2">
                <FormSubmitButton idleLabel="Create Event" pendingLabel="Creating..." />
              </div>
            </form>
          </FormSection>
        ) : null}

        {activeType === "task" ? (
          <FormSection title="Add Task" description="Essential details first. Optional tracking fields are under Advanced / Optional Details.">
            <form action={createTaskAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input type="hidden" name="return_to" value={returnTo} />
              <input type="hidden" name="client_context" value="false" />
              <input type="hidden" name="sent_by_id" value={currentUserId} />
              <TaskFormFields
                users={options.users}
                clients={options.clients}
                includeClientSelect
              />
              <div className="md:col-span-2">
                <FormSubmitButton idleLabel="Create Task" pendingLabel="Creating..." />
              </div>
            </form>
          </FormSection>
        ) : null}

        {activeType === "communication" ? (
          <FormSection title="Log Communication" description="Required fields first. Optional details are available below.">
            <form action={createCommunicationLogAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <input type="hidden" name="return_to" value={returnTo} />

              <select
                name="client_id"
                required
                value={commClientId}
                onChange={(event) => setCommClientId(event.target.value)}
                className="h-10 rounded-md border border-border px-3 text-sm md:col-span-2"
              >
                <option value="">Select Client</option>
                {options.clients.map((client) => (
                  <option key={client.client_id} value={client.client_id}>{client.client_name}</option>
                ))}
              </select>
              <Input name="communication_date" type="date" required defaultValue={todayIso} />
              <select name="channel" required defaultValue="WhatsApp" className="h-10 rounded-md border border-border px-3 text-sm">
                {COMM_CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>{channel}</option>
                ))}
              </select>
              <select name="direction" required defaultValue="Outbound" className="h-10 rounded-md border border-border px-3 text-sm">
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
                    {resolvedCommWorkOptions.deliverables.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                  <select name="related_task_id" className="h-10 rounded-md border border-border px-3 text-sm">
                    <option value="">Related Task</option>
                    {resolvedCommWorkOptions.tasks.map((item) => (
                      <option key={item.id} value={item.id}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </details>
              <div className="md:col-span-2">
                <FormSubmitButton idleLabel="Add Communication Log" pendingLabel="Saving..." />
              </div>
            </form>
          </FormSection>
        ) : null}
      </ResponsiveOverlay>
    </>
  )
}
