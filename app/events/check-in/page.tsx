import { Suspense } from "react"
import { EventKioskCheckin } from "@/components/events/event-kiosk-checkin"

export default function EventCheckInPage() {
  return (
    <Suspense fallback={<div>Loading kiosk...</div>}>
      <EventKioskCheckin />
    </Suspense>
  )
}
