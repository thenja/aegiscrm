import Link from "next/link"
import { notFound } from "next/navigation"

import {
  createEventGuestAction,
  updateEventAction,
} from "@/app/actions/events"
import { EventGuestsListWithDrawer } from "@/components/events/event-guests-list-with-drawer"
import { EventGuestCreateForm } from "@/components/events/event-guest-create-form"
import { EventImportPanel } from "@/components/events/event-import-panel"
import { EventBackendLiveSync } from "@/components/events/event-backend-live-sync"
import { ActionFeedback } from "@/components/ui/action-feedback"
import { Button } from "@/components/ui/button"
import { ModalForm } from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import {
  EmptyState,
  FormSection,
  MetricCard,
  PageHeader,
  PillBadge,
  SectionCard,
} from "@/components/ui/patterns"
import { StatusBadge } from "@/components/ui/status-badge"
import { requireAuth } from "@/lib/auth"
import {
  getEventAttendanceSummary,
  getEventById,
  listEventGuests,
  listRecentAttendanceLogs,
} from "@/lib/data/events"
import { formatDisplayDate } from "@/lib/date"
import { hasRole } from "@/lib/permissions"
import {
  ATTENDANCE_EVENT_STATUSES,
  ATTENDANCE_EVENT_TYPES,
  ATTENDANCE_SEATING_MODES,
  EVENT_GUEST_CATEGORIES,
} from "@/types/domain"

type SearchParams = {
  query?: string
  category?: string
  attendance_status?: string
  guest_id?: string
  feedback?: string
  message?: string
  reset_create_event_guest?: string
  reset_event_guest_action?: string
}

type Params = {
  params: {
    eventId: string
  } | Promise<{ eventId: string }>
  searchParams?: SearchParams | Promise<SearchParams>
}

export default async function EventDetailsPage({ params, searchParams }: Params) {
  const auth = await requireAuth()
  const resolvedParams = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const eventId = resolvedParams.eventId
  const canManage = hasRole(auth.profile.role, ["Director", "Team Lead", "Team Member"])
  const canUndoCheckIn = hasRole(auth.profile.role, ["Director", "Team Lead"])

  const [event, guests, summary, recentLogs] = await Promise.all([
    getEventById(eventId),
    listEventGuests(eventId, {
      query: resolvedSearchParams?.query,
      category: resolvedSearchParams?.category,
      attendance_status: resolvedSearchParams?.attendance_status,
    }),
    getEventAttendanceSummary(eventId),
    listRecentAttendanceLogs(eventId, 20),
  ])

  if (!event) {
    notFound()
  }

  const returnTo = `/events/${eventId}`

  return (
    <div className="space-y-4">
      <EventBackendLiveSync eventId={eventId} />
      <ActionFeedback feedback={resolvedSearchParams?.feedback} message={resolvedSearchParams?.message} />

      <PageHeader
        title={event.event_name}
        description={`${event.client_name} | ${formatDisplayDate(event.event_date)}${event.venue ? ` | ${event.venue}` : ""}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/events/${eventId}/live`}>Open Live Dashboard</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/events/${eventId}/report`}>Open Report</Link>
            </Button>
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/events/check-in?event_code=${encodeURIComponent(event.event_code)}`}>Open Kiosk</Link>
            </Button>
          </div>
        }
      />

      <SectionCard title="Event Setup" description="Manage event details, activation state, and kiosk event code.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={event.status} compact />
          <PillBadge label={event.event_type} tone="blue" compact />
          <PillBadge label={event.seating_mode} compact />
          <PillBadge label={`Code: ${event.event_code}`} tone="amber" compact />
        </div>

        {canManage ? (
          <form action={updateEventAction} className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <input type="hidden" name="return_to" value={returnTo} />
            <input type="hidden" name="event_id" value={event.event_id} />
            <input type="hidden" name="client_id" value={event.client_id} />
            <Input name="event_name" defaultValue={event.event_name} required className="md:col-span-2" />
            <Input name="event_date" type="date" defaultValue={event.event_date} required />
            <Input name="venue" defaultValue={event.venue ?? ""} placeholder="Venue" />
            <select name="event_type" defaultValue={event.event_type} required className="h-10 rounded-md border border-border px-3 text-sm">
              {ATTENDANCE_EVENT_TYPES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select name="seating_mode" defaultValue={event.seating_mode} required className="h-10 rounded-md border border-border px-3 text-sm">
              {ATTENDANCE_SEATING_MODES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={event.status} required className="h-10 rounded-md border border-border px-3 text-sm">
              {ATTENDANCE_EVENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <Input name="event_code" defaultValue={event.event_code} />
            <details className="rounded-md border border-border bg-white p-3 md:col-span-2">
              <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced / Optional Details</summary>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                <Input name="starts_at" type="datetime-local" defaultValue={event.starts_at ? event.starts_at.slice(0, 16) : ""} />
                <Input name="ends_at" type="datetime-local" defaultValue={event.ends_at ? event.ends_at.slice(0, 16) : ""} />
                <textarea
                  name="notes"
                  defaultValue={event.notes ?? ""}
                  placeholder="Notes"
                  className="min-h-[90px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
                />
              </div>
            </details>
            <div className="md:col-span-2">
              <Button type="submit">Save Event</Button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-text-secondary">Read-only access. You can monitor attendance but cannot edit event setup.</p>
        )}
      </SectionCard>

      <SectionCard title="Live Attendance Snapshot">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <MetricCard label="Total Guests" value={summary.totalGuests} />
          <MetricCard label="Attended" value={summary.attendedGuests} />
          <MetricCard label="Not Arrived" value={summary.notArrivedGuests} />
          <MetricCard label="Attendance Rate" value={`${summary.attendanceRate}%`} />
        </div>

        <div className="mt-3 grid grid-cols-1 gap-3 xl:grid-cols-2">
          <div className="rounded-lg border border-border/80 bg-white/92 p-3">
            <h3 className="text-sm font-semibold text-navy">By Category</h3>
            {summary.byCategory.length === 0 ? (
              <p className="mt-1 text-xs text-text-secondary">No category data yet.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {summary.byCategory.map((row) => (
                  <p key={row.category} className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">{row.category}</span>: {row.attended} / {row.total} attended
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-lg border border-border/80 bg-white/92 p-3">
            <h3 className="text-sm font-semibold text-navy">By Table</h3>
            {event.seating_mode === "Without Table" ? (
              <p className="mt-1 text-xs text-text-secondary">This event is configured without table tracking.</p>
            ) : summary.byTable.length === 0 ? (
              <p className="mt-1 text-xs text-text-secondary">No table assignments yet.</p>
            ) : (
              <div className="mt-2 space-y-1.5">
                {summary.byTable.map((row) => (
                  <p key={row.tableNo} className="text-xs text-text-secondary">
                    <span className="font-medium text-text-primary">Table {row.tableNo}</span>: {row.attended} / {row.total} attended
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Guest Import" description="Import guest list from fixed Excel format with duplicate warnings and import summary.">
        <EventImportPanel eventId={eventId} returnTo={returnTo} />
      </SectionCard>

      <SectionCard
        title="Guest List Management"
        description="Search, check in, and manage guest attendance."
        action={
          canManage ? (
            <ModalForm
              key={resolvedSearchParams?.feedback === "success" ? resolvedSearchParams?.reset_create_event_guest ?? "new-guest" : "new-guest"}
              triggerLabel="+ Add Guest"
              title="Add Guest"
            >
              <FormSection title="Guest Details">
                <EventGuestCreateForm
                  action={createEventGuestAction}
                  returnTo={returnTo}
                  eventId={eventId}
                  seatingMode={event.seating_mode}
                  resetKey={resolvedSearchParams?.reset_create_event_guest}
                />
              </FormSection>
            </ModalForm>
          ) : null
        }
      >
        <form method="get" className="mb-3 grid grid-cols-1 gap-2 md:grid-cols-4">
          <Input name="query" defaultValue={resolvedSearchParams?.query ?? ""} placeholder="Search guest / company / phone / table / category" />
          <select name="category" defaultValue={resolvedSearchParams?.category ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
            <option value="">All Categories</option>
            {EVENT_GUEST_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select name="attendance_status" defaultValue={resolvedSearchParams?.attendance_status ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
            <option value="">All Attendance</option>
            <option value="Not Arrived">Not Arrived</option>
            <option value="Attended">Attended</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" variant="secondary">Apply</Button>
            <Button type="button" variant="ghost" asChild>
              <Link href={returnTo}>Reset</Link>
            </Button>
          </div>
        </form>

        <EventGuestsListWithDrawer
          key={resolvedSearchParams?.feedback === "success" ? resolvedSearchParams?.reset_event_guest_action ?? "event-guests-list" : "event-guests-list"}
          guests={guests}
          returnTo={returnTo}
          canManage={canManage}
          canUndoCheckIn={canUndoCheckIn}
          seatingMode={event.seating_mode}
          initialSelectedGuestId={resolvedSearchParams?.guest_id ?? null}
        />
      </SectionCard>

      <SectionCard title="Recent Attendance Activity" description="Audit trail of kiosk and internal attendance actions.">
        {recentLogs.length === 0 ? (
          <EmptyState title="No attendance activity yet" description="Check-ins and guest edits will appear here." />
        ) : (
          <div className="space-y-2">
            {recentLogs.map((log) => (
              <article key={log.attendance_log_id} className="rounded-md border border-border/80 bg-white/92 p-2.5">
                <p className="text-sm font-medium text-navy">{log.guest_name}</p>
                <p className="text-xs text-text-secondary">
                  {log.action} by <span className="font-medium text-text-primary">{log.staff_nickname}</span> at{" "}
                  <span className="font-medium text-text-primary">{new Date(log.acted_at).toLocaleString("en-MY")}</span>
                  {" | "}Source: <span className="font-medium text-text-primary">{log.source}</span>
                </p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Attendance Report Export">
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" asChild>
            <a href={`/api/events/${eventId}/export?format=csv`}>Export CSV</a>
          </Button>
          <Button size="sm" variant="secondary" asChild>
            <a href={`/api/events/${eventId}/export?format=xlsx`}>Export Excel</a>
          </Button>
        </div>
      </SectionCard>
    </div>
  )
}
