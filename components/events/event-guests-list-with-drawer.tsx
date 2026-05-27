"use client"

import { useMemo, useState } from "react"

import {
  checkInEventGuestInternalAction,
  deleteEventGuestAction,
  undoEventGuestCheckInAction,
  updateEventGuestAction,
} from "@/app/actions/events"
import { Button } from "@/components/ui/button"
import {
  ConfirmDialog,
  DetailDrawer,
  DrawerActions,
  DrawerHeader,
  DrawerMetaRow,
  DrawerSection,
} from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import { CollapsibleEditSection, EmptyState, ItemCard, PillBadge } from "@/components/ui/patterns"
import { StatusBadge } from "@/components/ui/status-badge"
import {
  EVENT_GUEST_CATEGORIES,
  EVENT_GUEST_RSVP_STATUSES,
  type EventGuestRow,
  type AttendanceSeatingMode,
} from "@/types/domain"

type EventGuestDrawerRow = EventGuestRow

export function EventGuestsListWithDrawer({
  guests,
  returnTo,
  canManage,
  canUndoCheckIn,
  seatingMode,
  initialSelectedGuestId,
}: {
  guests: EventGuestDrawerRow[]
  returnTo: string
  canManage: boolean
  canUndoCheckIn: boolean
  seatingMode: AttendanceSeatingMode
  initialSelectedGuestId?: string | null
}) {
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(initialSelectedGuestId ?? null)
  const selectedGuest = useMemo(
    () => guests.find((guest) => guest.guest_id === selectedGuestId) ?? null,
    [guests, selectedGuestId]
  )

  if (guests.length === 0) {
    return <EmptyState title="No guests found" description="Import guests from Excel or add guests manually." />
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {guests.map((guest) => (
          <ItemCard
            key={guest.guest_id}
            title={
              <button type="button" className="text-left hover:underline" onClick={() => setSelectedGuestId(guest.guest_id)}>
                {guest.guest_name}
              </button>
            }
            status={<StatusBadge status={guest.attendance_status} compact />}
            metaLine={
              <>
                Company: <span className="font-medium text-text-primary">{guest.company ?? "-"}</span>
                {" | "}Category: <span className="font-medium text-text-primary">{guest.category}</span>
                {seatingMode === "With Table" ? (
                  <>
                    {" | "}Table: <span className="font-medium text-text-primary">{guest.table_no ?? "-"}</span>
                  </>
                ) : null}
              </>
            }
            subLine={
              guest.checked_in_at ? (
                <>
                  Checked in by <span className="font-medium text-text-primary">{guest.checked_in_by_nickname ?? "-"}</span>{" "}
                  at <span className="font-medium text-text-primary">{new Date(guest.checked_in_at).toLocaleString("en-MY")}</span>
                </>
              ) : (
                <>Not arrived yet.</>
              )
            }
          >
            <DrawerActions>
              <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedGuestId(guest.guest_id)}>
                View
              </Button>
              {canManage && guest.attendance_status === "Not Arrived" ? (
                <form action={checkInEventGuestInternalAction}>
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="event_id" value={guest.event_id} />
                  <input type="hidden" name="guest_id" value={guest.guest_id} />
                  <Button type="submit" size="xs" variant="secondary">
                    Check In
                  </Button>
                </form>
              ) : null}
              {canUndoCheckIn && guest.attendance_status === "Attended" ? (
                <form action={undoEventGuestCheckInAction}>
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="event_id" value={guest.event_id} />
                  <input type="hidden" name="guest_id" value={guest.guest_id} />
                  <ConfirmDialog
                    triggerLabel="Undo"
                    triggerVariant="danger"
                    title="Undo guest check-in?"
                    description="This will set attendance back to Not Arrived and add an audit log."
                    confirmNode={
                      <button
                        type="submit"
                        className="inline-flex h-8 items-center justify-center rounded-md bg-status-red px-3 text-xs font-medium text-white"
                      >
                        Confirm Undo
                      </button>
                    }
                  />
                </form>
              ) : null}
            </DrawerActions>
          </ItemCard>
        ))}
      </div>

      <DetailDrawer
        open={Boolean(selectedGuest)}
        onClose={() => setSelectedGuestId(null)}
        title={selectedGuest?.guest_name ?? "Guest"}
        subtitle="Guest attendance quick view"
      >
        {selectedGuest ? (
          <div className="space-y-3">
            <DrawerHeader
              title={selectedGuest.guest_name}
              badge={<StatusBadge status={selectedGuest.attendance_status} compact />}
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "Company", value: selectedGuest.company ?? "-" },
                    { label: "Category", value: selectedGuest.category },
                    {
                      label: "Checked In",
                      value: selectedGuest.checked_in_at
                        ? `${new Date(selectedGuest.checked_in_at).toLocaleString("en-MY")} by ${selectedGuest.checked_in_by_nickname ?? "-"}`
                        : "-",
                    },
                  ]}
                />
              }
            />

            <DrawerSection title="Guest Details">
              <DrawerMetaRow
                items={[
                  { label: "Designation", value: selectedGuest.designation ?? "-" },
                  { label: "Email", value: selectedGuest.email ?? "-" },
                  { label: "Phone", value: selectedGuest.phone ?? "-" },
                  { label: "RSVP", value: selectedGuest.rsvp_status },
                ]}
              />
              {seatingMode === "With Table" ? (
                <p className="mt-2 text-xs text-text-secondary">
                  Table: <span className="font-medium text-text-primary">{selectedGuest.table_no ?? "-"}</span>
                  {" | "}Seat: <span className="font-medium text-text-primary">{selectedGuest.seat_no ?? "-"}</span>
                </p>
              ) : null}
              <p className="mt-2 text-xs text-text-secondary">
                Remarks: <span className="font-medium text-text-primary">{selectedGuest.remarks ?? "-"}</span>
              </p>
            </DrawerSection>

            {canManage ? (
              <CollapsibleEditSection title="Edit Guest Details">
                <form action={updateEventGuestAction} className="grid grid-cols-1 gap-2">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="guest_id" value={selectedGuest.guest_id} />
                  <input type="hidden" name="event_id" value={selectedGuest.event_id} />
                  <Input name="guest_name" defaultValue={selectedGuest.guest_name} required />
                  <Input name="company" defaultValue={selectedGuest.company ?? ""} placeholder="Company" />
                  <Input name="designation" defaultValue={selectedGuest.designation ?? ""} placeholder="Designation" />
                  <select name="category" defaultValue={selectedGuest.category} className="h-9 rounded-md border border-border px-2 text-sm">
                    {EVENT_GUEST_CATEGORIES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <Input name="email" type="email" defaultValue={selectedGuest.email ?? ""} placeholder="Email" />
                  <Input name="phone" defaultValue={selectedGuest.phone ?? ""} placeholder="Phone" />
                  <select name="rsvp_status" defaultValue={selectedGuest.rsvp_status} className="h-9 rounded-md border border-border px-2 text-sm">
                    {EVENT_GUEST_RSVP_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  {seatingMode === "With Table" ? (
                    <div className="grid grid-cols-2 gap-2">
                      <Input name="table_no" defaultValue={selectedGuest.table_no ?? ""} placeholder="Table No" />
                      <Input name="seat_no" defaultValue={selectedGuest.seat_no ?? ""} placeholder="Seat No" />
                    </div>
                  ) : (
                    <>
                      <input type="hidden" name="table_no" value={selectedGuest.table_no ?? ""} />
                      <input type="hidden" name="seat_no" value={selectedGuest.seat_no ?? ""} />
                    </>
                  )}
                  <textarea
                    name="remarks"
                    defaultValue={selectedGuest.remarks ?? ""}
                    className="min-h-[80px] rounded-md border border-border px-2 py-2 text-sm"
                    placeholder="Remarks"
                  />
                  <input type="hidden" name="attendance_status" value={selectedGuest.attendance_status} />
                  <input type="hidden" name="checked_in_at" value={selectedGuest.checked_in_at ?? ""} />
                  <input type="hidden" name="checked_in_by_nickname" value={selectedGuest.checked_in_by_nickname ?? ""} />
                  <input type="hidden" name="checked_in_session_id" value={selectedGuest.checked_in_session_id ?? ""} />
                  <Button type="submit" size="xs" variant="secondary">
                    Save
                  </Button>
                </form>
              </CollapsibleEditSection>
            ) : null}

            {canManage ? (
              <DrawerSection title="Attendance Actions">
                <DrawerActions>
                  {selectedGuest.attendance_status === "Not Arrived" ? (
                    <form action={checkInEventGuestInternalAction}>
                      <input type="hidden" name="return_to" value={returnTo} />
                      <input type="hidden" name="event_id" value={selectedGuest.event_id} />
                      <input type="hidden" name="guest_id" value={selectedGuest.guest_id} />
                      <Button type="submit" size="xs" variant="secondary">
                        Mark Attended
                      </Button>
                    </form>
                  ) : null}

                  {canUndoCheckIn && selectedGuest.attendance_status === "Attended" ? (
                    <form action={undoEventGuestCheckInAction}>
                      <input type="hidden" name="return_to" value={returnTo} />
                      <input type="hidden" name="event_id" value={selectedGuest.event_id} />
                      <input type="hidden" name="guest_id" value={selectedGuest.guest_id} />
                      <Button type="submit" size="xs" variant="danger">
                        Undo Check In
                      </Button>
                    </form>
                  ) : null}

                  <form action={deleteEventGuestAction}>
                    <input type="hidden" name="return_to" value={returnTo} />
                    <input type="hidden" name="event_id" value={selectedGuest.event_id} />
                    <input type="hidden" name="guest_id" value={selectedGuest.guest_id} />
                    <ConfirmDialog
                      triggerLabel="Delete"
                      triggerVariant="danger"
                      title="Delete guest?"
                      description="This removes the guest from the event list."
                      confirmNode={
                        <button
                          type="submit"
                          className="inline-flex h-8 items-center justify-center rounded-md bg-status-red px-3 text-xs font-medium text-white"
                        >
                          Confirm Delete
                        </button>
                      }
                    />
                  </form>
                </DrawerActions>
              </DrawerSection>
            ) : null}

            <DrawerActions>
              <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedGuestId(null)}>
                Close
              </Button>
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}
