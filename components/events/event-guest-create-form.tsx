"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EVENT_GUEST_CATEGORIES, EVENT_GUEST_RSVP_STATUSES, type AttendanceSeatingMode } from "@/types/domain"

export function EventGuestCreateForm({
  action,
  returnTo,
  eventId,
  seatingMode,
  resetKey,
}: {
  action: (formData: FormData) => void | Promise<void>
  returnTo: string
  eventId: string
  seatingMode: AttendanceSeatingMode
  resetKey?: string
}) {
  const [submitting, setSubmitting] = useState(false)

  return (
    <form
      key={resetKey ?? "create-event-guest-form"}
      action={action}
      onSubmit={(event) => {
        if (submitting) {
          event.preventDefault()
          return
        }
        setSubmitting(true)
      }}
      className="grid grid-cols-1 gap-3 md:grid-cols-2"
    >
      <fieldset disabled={submitting} className="contents">
        <input type="hidden" name="return_to" value={returnTo} />
        <input type="hidden" name="event_id" value={eventId} />
        <Input name="guest_name" placeholder="Guest Name" required />
        <Input name="company" placeholder="Company" />
        <Input name="designation" placeholder="Designation" />
        <select name="category" defaultValue="Guest" className="h-10 rounded-md border border-border px-3 text-sm">
          {EVENT_GUEST_CATEGORIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <Input name="email" type="email" placeholder="Email" />
        <Input name="phone" placeholder="Phone" />
        <select name="rsvp_status" defaultValue="Unknown" className="h-10 rounded-md border border-border px-3 text-sm">
          {EVENT_GUEST_RSVP_STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        {seatingMode === "With Table" ? (
          <>
            <Input name="table_no" placeholder="Table No" />
            <Input name="seat_no" placeholder="Seat No" />
          </>
        ) : (
          <>
            <input type="hidden" name="table_no" value="" />
            <input type="hidden" name="seat_no" value="" />
          </>
        )}
        <textarea
          name="remarks"
          placeholder="Remarks"
          className="min-h-[90px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
        />
        <input type="hidden" name="attendance_status" value="Not Arrived" />
        <div className="md:col-span-2">
          <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Guest"}</Button>
        </div>
      </fieldset>
    </form>
  )
}

