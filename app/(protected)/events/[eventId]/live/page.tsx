import Link from "next/link"
import { notFound } from "next/navigation"

import { EventLiveDashboard } from "@/components/events/event-live-dashboard"
import { Button } from "@/components/ui/button"
import { PageHeader } from "@/components/ui/patterns"
import { requireAuth } from "@/lib/auth"
import { getEventLiveData } from "@/lib/data/events"
import { formatDisplayDate } from "@/lib/date"

type Params = {
  params: {
    eventId: string
  }
}

export default async function EventLivePage({ params }: Params) {
  await requireAuth()
  const payload = await getEventLiveData(params.eventId)
  if (!payload.event) {
    notFound()
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title={`${payload.event.event_name} — Live Attendance`}
        description={`${payload.event.client_name} | ${formatDisplayDate(payload.event.event_date)}${payload.event.venue ? ` | ${payload.event.venue}` : ""}`}
        action={
          <div className="flex gap-2">
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/events/${params.eventId}`}>Back to Event</Link>
            </Button>
            <Button size="sm" variant="secondary" asChild>
              <Link href={`/events/check-in?event_code=${encodeURIComponent(payload.event.event_code)}`}>Open Kiosk</Link>
            </Button>
          </div>
        }
      />

      <EventLiveDashboard eventId={params.eventId} initialData={payload} />
    </div>
  )
}
