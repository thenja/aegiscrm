"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { requireRoleAuth } from "@/lib/auth"
import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { requireEventManageAccess } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { eventGuestSchema, eventSchema } from "@/lib/validation/schemas"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function nullIfEmpty(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function getBoolean(formData: FormData, key: string) {
  return getString(formData, key) === "true"
}

function buildEventCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let token = ""
  for (let index = 0; index < 8; index += 1) {
    token += alphabet[Math.floor(Math.random() * alphabet.length)]
  }
  return `AEG-${token}`
}

async function generateUniqueEventCode(supabase: Awaited<ReturnType<typeof createClient>>) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const eventCode = buildEventCode()
    const { data, error } = await supabase.from("events").select("event_id").eq("event_code", eventCode).limit(1)
    if (error) throw new Error(error.message)
    if (!data || data.length === 0) {
      return eventCode
    }
  }
  throw new Error("Unable to generate unique event code")
}

function parseEventPayload(formData: FormData, generatedEventCode: string) {
  return eventSchema.parse({
    client_id: getString(formData, "client_id"),
    event_name: getString(formData, "event_name"),
    event_date: getString(formData, "event_date"),
    venue: getString(formData, "venue"),
    event_type: getString(formData, "event_type"),
    seating_mode: getString(formData, "seating_mode"),
    event_code: nullIfEmpty(getString(formData, "event_code")) ?? generatedEventCode,
    status: getString(formData, "status") || "Draft",
    starts_at: getString(formData, "starts_at"),
    ends_at: getString(formData, "ends_at"),
    notes: getString(formData, "notes"),
  })
}

function parseEventGuestPayload(formData: FormData) {
  return eventGuestSchema.parse({
    event_id: getString(formData, "event_id"),
    guest_name: getString(formData, "guest_name"),
    company: getString(formData, "company"),
    designation: getString(formData, "designation"),
    category: getString(formData, "category"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    rsvp_status: getString(formData, "rsvp_status"),
    table_no: getString(formData, "table_no"),
    seat_no: getString(formData, "seat_no"),
    remarks: getString(formData, "remarks"),
    attendance_status: getString(formData, "attendance_status") || "Not Arrived",
    checked_in_at: getString(formData, "checked_in_at"),
    checked_in_by_nickname: getString(formData, "checked_in_by_nickname"),
    checked_in_session_id: getString(formData, "checked_in_session_id"),
  })
}

function revalidateEventPaths(eventId: string) {
  revalidatePath("/events")
  revalidatePath(`/events/${eventId}`)
  revalidatePath(`/events/${eventId}/live`)
}

function guestActionResetParams() {
  return {
    reset_event_guest_action: Date.now().toString(),
  }
}

async function getEventForAction(eventId: string) {
  const supabase = await createClient()
  const { data: event, error } = await supabase
    .from("events")
    .select("event_id, client_id, event_code")
    .eq("event_id", eventId)
    .single<{ event_id: string; client_id: string; event_code: string }>()

  if (error || !event) {
    throw new Error(error?.message || "Event not found")
  }

  return event
}

function isLikelyDuplicateGuest({
  guestName,
  company,
  email,
  phone,
  existingRows,
}: {
  guestName: string
  company: string | null
  email: string | null
  phone: string | null
  existingRows: Array<{ guest_name: string; company: string | null; email: string | null; phone: string | null }>
}) {
  const normalizedName = guestName.trim().toLowerCase()
  const normalizedCompany = (company ?? "").trim().toLowerCase()
  const normalizedEmail = (email ?? "").trim().toLowerCase()
  const normalizedPhone = (phone ?? "").replace(/\s+/g, "")

  return existingRows.some((row) => {
    const sameNameCompany =
      row.guest_name.trim().toLowerCase() === normalizedName &&
      (row.company ?? "").trim().toLowerCase() === normalizedCompany
    const sameEmail =
      normalizedEmail.length > 0 &&
      (row.email ?? "").trim().toLowerCase().length > 0 &&
      (row.email ?? "").trim().toLowerCase() === normalizedEmail
    const samePhone =
      normalizedPhone.length > 0 &&
      (row.phone ?? "").replace(/\s+/g, "").length > 0 &&
      (row.phone ?? "").replace(/\s+/g, "") === normalizedPhone
    return sameNameCompany || sameEmail || samePhone
  })
}

export async function createEventAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/events")
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    const supabase = await createClient()
    const payload = parseEventPayload(formData, await generateUniqueEventCode(supabase))
    const auth = await requireEventManageAccess(payload.client_id)

    const { error } = await supabase.from("events").insert({
      ...payload,
      created_by: auth.profile.user_id,
    })

    if (error) throw new Error(error.message)

    revalidatePath("/events")
    redirectTarget = withFeedback(returnTo, "success", "Event created successfully.", {
      reset_create_event: Date.now().toString(),
    })
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("invalid"))) {
      redirectTarget = withFeedback(returnTo, "error", error.message)
    }
  }

  redirect(redirectTarget)
}

export async function updateEventAction(formData: FormData) {
  const eventId = getString(formData, "event_id")
  const fallback = eventId ? `/events/${eventId}` : "/events"
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    if (!eventId) throw new Error("Missing event_id")

    const event = await getEventForAction(eventId)
    await requireEventManageAccess(event.client_id)

    const supabase = await createClient()
    const payload = parseEventPayload(formData, event.event_code)
    const { error } = await supabase.from("events").update(payload).eq("event_id", eventId)
    if (error) throw new Error(error.message)

    revalidateEventPaths(eventId)
    redirectTarget = withFeedback(returnTo, "success", "Event details updated successfully.")
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("invalid"))) {
      redirectTarget = withFeedback(returnTo, "error", error.message)
    }
  }

  redirect(redirectTarget)
}

export async function createEventGuestAction(formData: FormData) {
  const eventId = getString(formData, "event_id")
  const fallback = eventId ? `/events/${eventId}` : "/events"
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    const payload = parseEventGuestPayload(formData)
    const event = await getEventForAction(payload.event_id)
    await requireEventManageAccess(event.client_id)

    const supabase = await createClient()
    const { data: existingGuests, error: existingError } = await supabase
      .from("event_guests")
      .select("guest_name, company, email, phone")
      .eq("event_id", payload.event_id)

    if (existingError) throw new Error(existingError.message)

    const allowDuplicate = getBoolean(formData, "allow_duplicate")
    const duplicateFound = isLikelyDuplicateGuest({
      guestName: payload.guest_name,
      company: payload.company,
      email: payload.email,
      phone: payload.phone,
      existingRows: (existingGuests ?? []) as Array<{
        guest_name: string
        company: string | null
        email: string | null
        phone: string | null
      }>,
    })

    if (duplicateFound && !allowDuplicate) {
      throw new Error("Possible duplicate guest detected. Please review before adding.")
    }

    const { error } = await supabase.from("event_guests").insert(payload)
    if (error) throw new Error(error.message)

    revalidateEventPaths(payload.event_id)
    redirectTarget = withFeedback(returnTo, "success", "Guest added successfully.", {
      reset_create_event_guest: Date.now().toString(),
      ...guestActionResetParams(),
    })
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("required") ||
        error.message.includes("invalid") ||
        error.message.includes("duplicate"))
    ) {
      redirectTarget = withFeedback(returnTo, "error", error.message)
    }
  }

  redirect(redirectTarget)
}

export async function updateEventGuestAction(formData: FormData) {
  const guestId = getString(formData, "guest_id")
  const eventId = getString(formData, "event_id")
  const fallback = eventId ? `/events/${eventId}` : "/events"
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    if (!guestId) throw new Error("Missing guest_id")
    const payload = parseEventGuestPayload(formData)
    const event = await getEventForAction(payload.event_id)
    await requireEventManageAccess(event.client_id)

    const supabase = await createClient()
    const { error } = await supabase.from("event_guests").update(payload).eq("guest_id", guestId)
    if (error) throw new Error(error.message)

    const auth = await requireRoleAuth(["Director", "Team Lead", "Team Member"])
    await supabase.from("event_attendance_logs").insert({
      event_id: payload.event_id,
      guest_id: guestId,
      action: "Edit Guest",
      staff_nickname: auth.profile.full_name,
      acted_by_user_id: auth.profile.user_id,
      source: "Internal",
      notes: "Guest details updated",
    })

    revalidateEventPaths(payload.event_id)
    redirectTarget = withFeedback(returnTo, "success", "Guest updated successfully.", guestActionResetParams())
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("invalid"))) {
      redirectTarget = withFeedback(returnTo, "error", error.message)
    }
  }

  redirect(redirectTarget)
}

export async function deleteEventGuestAction(formData: FormData) {
  const guestId = getString(formData, "guest_id")
  const eventId = getString(formData, "event_id")
  const fallback = eventId ? `/events/${eventId}` : "/events"
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)

  try {
    if (!guestId || !eventId) throw new Error("Missing guest_id or event_id")
    const event = await getEventForAction(eventId)
    await requireEventManageAccess(event.client_id)

    const supabase = await createClient()
    const { error } = await supabase.from("event_guests").delete().eq("guest_id", guestId)
    if (error) throw new Error(error.message)

    revalidateEventPaths(eventId)
    redirect(withFeedback(returnTo, "success", "Guest removed successfully.", guestActionResetParams()))
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}

export async function checkInEventGuestInternalAction(formData: FormData) {
  const guestId = getString(formData, "guest_id")
  const eventId = getString(formData, "event_id")
  const fallback = eventId ? `/events/${eventId}` : "/events"
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)

  try {
    if (!guestId || !eventId) throw new Error("Missing guest_id or event_id")
    const event = await getEventForAction(eventId)
    const auth = await requireEventManageAccess(event.client_id)
    const supabase = await createClient()

    const nowIso = new Date().toISOString()
    const { data: updated, error: updateError } = await supabase
      .from("event_guests")
      .update({
        attendance_status: "Attended",
        checked_in_at: nowIso,
        checked_in_by_nickname: auth.profile.full_name,
        checked_in_session_id: null,
      })
      .eq("guest_id", guestId)
      .eq("event_id", eventId)
      .eq("attendance_status", "Not Arrived")
      .select("guest_id")

    if (updateError) throw new Error(updateError.message)

    if (!updated || updated.length === 0) {
      const { data: currentGuest } = await supabase
        .from("event_guests")
        .select("checked_in_at, checked_in_by_nickname")
        .eq("guest_id", guestId)
        .single<{ checked_in_at: string | null; checked_in_by_nickname: string | null }>()

      const when = currentGuest?.checked_in_at ? new Date(currentGuest.checked_in_at).toLocaleString("en-MY") : "-"
      redirect(
        withFeedback(
          returnTo,
          "error",
          `Already checked in by ${currentGuest?.checked_in_by_nickname ?? "-"} at ${when}.`
        )
      )
    }

    const { error: logError } = await supabase.from("event_attendance_logs").insert({
      event_id: eventId,
      guest_id: guestId,
      action: "Check In",
      staff_nickname: auth.profile.full_name,
      acted_by_user_id: auth.profile.user_id,
      source: "Internal",
      notes: "Checked in from internal event dashboard",
    })

    if (logError) throw new Error(logError.message)

    revalidateEventPaths(eventId)
    redirect(withFeedback(returnTo, "success", "Guest checked in successfully.", guestActionResetParams()))
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}

export async function undoEventGuestCheckInAction(formData: FormData) {
  const guestId = getString(formData, "guest_id")
  const eventId = getString(formData, "event_id")
  const fallback = eventId ? `/events/${eventId}` : "/events"
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)

  try {
    if (!guestId || !eventId) throw new Error("Missing guest_id or event_id")

    const auth = await requireRoleAuth(["Director", "Team Lead"])
    const event = await getEventForAction(eventId)
    await requireEventManageAccess(event.client_id)

    const supabase = await createClient()
    const { data: updated, error: updateError } = await supabase
      .from("event_guests")
      .update({
        attendance_status: "Not Arrived",
        checked_in_at: null,
        checked_in_by_nickname: null,
        checked_in_session_id: null,
      })
      .eq("guest_id", guestId)
      .eq("event_id", eventId)
      .eq("attendance_status", "Attended")
      .select("guest_id")

    if (updateError) throw new Error(updateError.message)
    if (!updated || updated.length === 0) {
      throw new Error("Guest is not checked in")
    }

    const { error: logError } = await supabase.from("event_attendance_logs").insert({
      event_id: eventId,
      guest_id: guestId,
      action: "Undo Check In",
      staff_nickname: auth.profile.full_name,
      acted_by_user_id: auth.profile.user_id,
      source: "Internal",
      notes: "Undo check-in from internal event dashboard",
    })

    if (logError) throw new Error(logError.message)

    revalidateEventPaths(eventId)
    redirect(withFeedback(returnTo, "success", "Check-in undone successfully.", guestActionResetParams()))
  } catch (error) {
    if (error instanceof Error && error.message === "Guest is not checked in") {
      redirect(withFeedback(returnTo, "error", "Guest is not currently checked in."))
    }
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}
