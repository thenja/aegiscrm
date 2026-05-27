import Link from "next/link"

import { createEventAction } from "@/app/actions/events"
import { ActionFeedback } from "@/components/ui/action-feedback"
import { Button } from "@/components/ui/button"
import { ModalForm } from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import {
  EmptyState,
  FilterBar,
  FormSection,
  ItemCard,
  PageHeader,
  PillBadge,
  SectionCard,
} from "@/components/ui/patterns"
import { StatusBadge } from "@/components/ui/status-badge"
import { requireAuth } from "@/lib/auth"
import { listClients } from "@/lib/data/clients"
import { listEvents } from "@/lib/data/events"
import { formatDisplayDate } from "@/lib/date"
import { hasRole } from "@/lib/permissions"
import { ATTENDANCE_EVENT_STATUSES, ATTENDANCE_EVENT_TYPES, ATTENDANCE_SEATING_MODES } from "@/types/domain"

type SearchParams = {
  query?: string
  client_id?: string
  status?: string
  feedback?: string
  message?: string
  reset_create_event?: string
}

export default async function EventsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const auth = await requireAuth()
  const canManage = hasRole(auth.profile.role, ["Director", "Team Lead", "Team Member"])
  const resolvedSearchParams = searchParams ? await searchParams : {}

  const [events, clients] = await Promise.all([
    listEvents({
      query: resolvedSearchParams?.query,
      client_id: resolvedSearchParams?.client_id,
      status: resolvedSearchParams?.status,
    }),
    listClients({}),
  ])

  return (
    <div className="space-y-4">
      <ActionFeedback feedback={resolvedSearchParams?.feedback} message={resolvedSearchParams?.message} />

      <PageHeader
        title="Events"
        description="Manage event setup, guest registration, and attendance tracking."
        action={
          canManage ? (
            <ModalForm triggerLabel="+ New Event" title="Create Event">
              <FormSection title="Event Setup" description="Set core event details first.">
                <form
                  key={resolvedSearchParams?.reset_create_event ?? "create-event-form"}
                  action={createEventAction}
                  className="grid grid-cols-1 gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="return_to" value="/events" />
                  <select name="client_id" required className="h-10 rounded-md border border-border px-3 text-sm md:col-span-2">
                    <option value="">Select Client</option>
                    {clients.map((client) => (
                      <option key={client.client_id} value={client.client_id}>
                        {client.client_name}
                      </option>
                    ))}
                  </select>
                  <Input name="event_name" placeholder="Event Name" required className="md:col-span-2" />
                  <Input name="event_date" type="date" required />
                  <Input name="venue" placeholder="Venue" />
                  <select name="event_type" required className="h-10 rounded-md border border-border px-3 text-sm">
                    {ATTENDANCE_EVENT_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select name="seating_mode" required className="h-10 rounded-md border border-border px-3 text-sm">
                    {ATTENDANCE_SEATING_MODES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <select name="status" defaultValue="Draft" required className="h-10 rounded-md border border-border px-3 text-sm">
                    {ATTENDANCE_EVENT_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <details className="rounded-md border border-border bg-white p-3 md:col-span-2">
                    <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced / Optional Details</summary>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input name="starts_at" type="datetime-local" />
                      <Input name="ends_at" type="datetime-local" />
                      <Input name="event_code" placeholder="Event Code (optional)" />
                      <textarea
                        name="notes"
                        placeholder="Notes"
                        className="min-h-[90px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
                      />
                    </div>
                  </details>
                  <div className="md:col-span-2">
                    <Button type="submit">Create Event</Button>
                  </div>
                </form>
              </FormSection>
            </ModalForm>
          ) : null
        }
      />

      <SectionCard title="Filters" description="Search by event name, code, or venue.">
        <FilterBar>
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input name="query" defaultValue={resolvedSearchParams?.query ?? ""} placeholder="Search event / code / venue" />
            <select name="client_id" defaultValue={resolvedSearchParams?.client_id ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="">All Clients</option>
              {clients.map((client) => (
                <option key={client.client_id} value={client.client_id}>
                  {client.client_name}
                </option>
              ))}
            </select>
            <select name="status" defaultValue={resolvedSearchParams?.status ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="">All Status</option>
              {ATTENDANCE_EVENT_STATUSES.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="secondary">
                Apply
              </Button>
              <Button type="button" variant="ghost" asChild>
                <a href="/events">Reset</a>
              </Button>
            </div>
          </form>
        </FilterBar>
      </SectionCard>

      <SectionCard title="Event Directory" description="Open an event to import guests, run kiosk check-in, and monitor attendance live.">
        {events.length === 0 ? (
          <EmptyState title="No events found" description="Create an event to start attendance tracking." />
        ) : (
          <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
            {events.map((event) => (
              <ItemCard
                key={event.event_id}
                title={
                  <Link href={`/events/${event.event_id}`} className="hover:underline">
                    {event.event_name}
                  </Link>
                }
                status={<StatusBadge status={event.status} compact />}
                metaLine={
                  <>
                    Client: <span className="font-medium text-text-primary">{event.client_name}</span>
                    {" | "}Date: <span className="font-medium text-text-primary">{formatDisplayDate(event.event_date)}</span>
                    {" | "}Type: <span className="font-medium text-text-primary">{event.event_type}</span>
                  </>
                }
                subLine={
                  <>
                    Code: <span className="font-medium text-text-primary">{event.event_code}</span>
                    {" | "}Attended: <span className="font-medium text-text-primary">{event.attended_guests}</span> /{" "}
                    <span className="font-medium text-text-primary">{event.total_guests}</span>
                    {" | "}Seating: <span className="font-medium text-text-primary">{event.seating_mode}</span>
                  </>
                }
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Button type="button" variant="ghost" size="xs" asChild>
                    <Link href={`/events/${event.event_id}`}>Open</Link>
                  </Button>
                  <Button type="button" variant="secondary" size="xs" asChild>
                    <Link href={`/events/${event.event_id}/live`}>Live</Link>
                  </Button>
                  <Button type="button" variant="ghost" size="xs" asChild>
                    <Link href={`/events/${event.event_id}/report`}>Report</Link>
                  </Button>
                  <Button type="button" variant="ghost" size="xs" asChild>
                    <Link href={`/events/check-in?event_code=${encodeURIComponent(event.event_code)}`}>Kiosk</Link>
                  </Button>
                  <PillBadge label={event.event_type} compact tone="blue" />
                </div>
              </ItemCard>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}
