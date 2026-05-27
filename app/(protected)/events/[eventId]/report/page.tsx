import Link from "next/link"
import { notFound } from "next/navigation"

import { Button } from "@/components/ui/button"
import { EmptyState, PageHeader, SectionCard } from "@/components/ui/patterns"
import { requireAuth } from "@/lib/auth"
import { getEventAttendanceSummary, getEventById, listEventGuests } from "@/lib/data/events"
import { formatDisplayDate } from "@/lib/date"

type Params = {
  params: {
    eventId: string
  } | Promise<{ eventId: string }>
}

export default async function EventReportPage({ params }: Params) {
  await requireAuth()
  const resolvedParams = await params

  const [event, summary, guests] = await Promise.all([
    getEventById(resolvedParams.eventId),
    getEventAttendanceSummary(resolvedParams.eventId),
    listEventGuests(resolvedParams.eventId),
  ])

  if (!event) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${event.event_name} - Attendance Report`}
        description={`${event.client_name} | ${formatDisplayDate(event.event_date)}${event.venue ? ` | ${event.venue}` : ""}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/events/${resolvedParams.eventId}`}>Back to Event</Link>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <a href={`/api/events/${resolvedParams.eventId}/export?format=csv`}>Export CSV</a>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <a href={`/api/events/${resolvedParams.eventId}/export?format=xlsx`}>Export Excel</a>
            </Button>
          </div>
        }
      />

      <SectionCard title="Attendance Summary">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <div className="rounded-md border border-border/80 bg-white/92 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-text-secondary">Total Guests</p>
            <p className="mt-1 text-base font-semibold text-navy">{summary.totalGuests}</p>
          </div>
          <div className="rounded-md border border-border/80 bg-white/92 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-text-secondary">Attended</p>
            <p className="mt-1 text-base font-semibold text-navy">{summary.attendedGuests}</p>
          </div>
          <div className="rounded-md border border-border/80 bg-white/92 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-text-secondary">Absent</p>
            <p className="mt-1 text-base font-semibold text-navy">{summary.notArrivedGuests}</p>
          </div>
          <div className="rounded-md border border-border/80 bg-white/92 p-2.5">
            <p className="text-[11px] uppercase tracking-wide text-text-secondary">Attendance Rate</p>
            <p className="mt-1 text-base font-semibold text-navy">{summary.attendanceRate}%</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="By Category">
        {summary.byCategory.length === 0 ? (
          <EmptyState title="No category data" description="Category totals will appear once guest list is available." />
        ) : (
          <div className="space-y-2">
            {summary.byCategory.map((row) => (
              <article key={row.category} className="rounded-md border border-border/80 bg-white/92 p-2.5 text-sm">
                <span className="font-medium text-text-primary">{row.category}</span>: {row.attended} / {row.total} attended
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="By Table">
        {event.seating_mode === "Without Table" ? (
          <EmptyState title="Table mode disabled" description="This event is set to Without Table." />
        ) : summary.byTable.length === 0 ? (
          <EmptyState title="No table summary yet" description="Assign table numbers in guest list to view this breakdown." />
        ) : (
          <div className="space-y-2">
            {summary.byTable.map((row) => (
              <article key={row.tableNo} className="rounded-md border border-border/80 bg-white/92 p-2.5 text-sm">
                <span className="font-medium text-text-primary">Table {row.tableNo}</span>: {row.attended} / {row.total} attended
              </article>
            ))}
          </div>
        )}
      </SectionCard>

      <SectionCard title="Attendance List">
        {guests.length === 0 ? (
          <EmptyState title="No guests found" description="Import or add guests to generate attendance report." />
        ) : (
          <div className="space-y-2">
            {guests.map((guest) => (
              <article key={guest.guest_id} className="rounded-md border border-border/80 bg-white/92 p-2.5">
                <p className="text-sm font-medium text-navy">{guest.guest_name}</p>
                <p className="text-xs text-text-secondary">
                  {guest.company ?? "-"} | {guest.category}
                  {" | "}Status: <span className="font-medium text-text-primary">{guest.attendance_status}</span>
                  {guest.checked_in_at ? ` | Checked in at ${new Date(guest.checked_in_at).toLocaleString("en-MY")}` : ""}
                </p>
              </article>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

