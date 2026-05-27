"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { requireAuth } from "@/lib/auth"
import { requireDeliverableWriteAccess, requireTaskWriteAccess } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { workItemExternalContactSchema } from "@/lib/validation/schemas"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key).trim()
  return value.length > 0 ? value : null
}

function parsePeopleInvolvedPayload(formData: FormData) {
  return workItemExternalContactSchema.parse({
    client_id: getString(formData, "client_id"),
    external_contact_id: getString(formData, "external_contact_id"),
    deliverable_id: getNullableString(formData, "deliverable_id"),
    task_id: getNullableString(formData, "task_id"),
    purpose: getString(formData, "purpose"),
    involvement_status: getString(formData, "involvement_status"),
    scheduled_date: getNullableString(formData, "scheduled_date"),
    completed_date: getNullableString(formData, "completed_date"),
    outcome: getNullableString(formData, "outcome"),
    notes: getNullableString(formData, "notes"),
  })
}

async function assertWorkItemWriteAccess(
  clientId: string,
  deliverableId: string | null,
  taskId: string | null
) {
  const supabase = await createClient()

  if (deliverableId) {
    const { data: deliverable, error } = await supabase
      .from("deliverables")
      .select("deliverable_id, client_id, pic_id")
      .eq("deliverable_id", deliverableId)
      .single<{ deliverable_id: string; client_id: string; pic_id: string }>()

    if (error || !deliverable) throw new Error("Deliverable not found")
    if (deliverable.client_id !== clientId) throw new Error("Deliverable is not linked to this client")

    await requireDeliverableWriteAccess(deliverable.client_id, deliverable.pic_id)
    return { clientId: deliverable.client_id }
  }

  if (taskId) {
    const { data: task, error } = await supabase
      .from("tasks")
      .select("task_id, client_id, pic_id")
      .eq("task_id", taskId)
      .single<{ task_id: string; client_id: string | null; pic_id: string }>()

    if (error || !task) throw new Error("Task not found")
    if (!task.client_id) throw new Error("Global tasks cannot use People Involved in MVP")
    if (task.client_id !== clientId) throw new Error("Task is not linked to this client")

    await requireTaskWriteAccess(task.client_id, task.pic_id)
    return { clientId: task.client_id }
  }

  throw new Error("Missing work item target")
}

function revalidatePeopleInvolvedPaths(clientId: string) {
  revalidatePath("/deliverables")
  revalidatePath("/tasks")
  revalidatePath(`/clients/${clientId}`)
  revalidatePath(`/clients/${clientId}?tab=deliverables`)
  revalidatePath(`/clients/${clientId}?tab=tasks`)
  revalidatePath("/external-contacts")
}

export async function addPeopleInvolvedAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/deliverables")
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    const auth = await requireAuth()
    const payload = parsePeopleInvolvedPayload(formData)
    const { clientId } = await assertWorkItemWriteAccess(payload.client_id, payload.deliverable_id, payload.task_id)
    const supabase = await createClient()

    const { data: contact, error: contactError } = await supabase
      .from("external_contacts")
      .select("external_contact_id")
      .eq("external_contact_id", payload.external_contact_id)
      .single<{ external_contact_id: string }>()

    if (contactError || !contact) throw new Error("External contact not found")

    const { error } = await supabase.from("work_item_external_contacts").insert({
      client_id: clientId,
      external_contact_id: payload.external_contact_id,
      deliverable_id: payload.deliverable_id,
      task_id: payload.task_id,
      purpose: payload.purpose,
      involvement_status: payload.involvement_status,
      scheduled_date: payload.scheduled_date,
      completed_date: payload.completed_date,
      outcome: payload.outcome,
      notes: payload.notes,
      created_by: auth.profile.user_id,
    })

    if (error) {
      if (error.code === "23505") {
        throw new Error("This person is already linked to the selected work item.")
      }
      throw new Error(error.message)
    }

    revalidatePeopleInvolvedPaths(clientId)
    redirectTarget = withFeedback(returnTo, "success", "People Involved updated successfully.")
  } catch (error) {
    if (error instanceof Error) {
      const lower = error.message.toLowerCase()
      if (
        lower.includes("required") ||
        lower.includes("invalid") ||
        lower.includes("not found") ||
        lower.includes("linked") ||
        lower.includes("global tasks") ||
        lower.includes("already linked")
      ) {
        redirectTarget = withFeedback(returnTo, "error", error.message)
      }
    }
  }

  redirect(redirectTarget)
}

export async function updatePeopleInvolvedAction(formData: FormData) {
  const linkId = getString(formData, "link_id")
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/deliverables")
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    if (!linkId) throw new Error("Missing link_id")

    const payload = parsePeopleInvolvedPayload(formData)
    const supabase = await createClient()

    const { data: link, error: linkError } = await supabase
      .from("work_item_external_contacts")
      .select("link_id, client_id, deliverable_id, task_id")
      .eq("link_id", linkId)
      .single<{ link_id: string; client_id: string; deliverable_id: string | null; task_id: string | null }>()

    if (linkError || !link) throw new Error("People Involved record not found")

    if (
      link.client_id !== payload.client_id ||
      link.deliverable_id !== payload.deliverable_id ||
      link.task_id !== payload.task_id
    ) {
      throw new Error("People Involved record target mismatch")
    }

    const { clientId } = await assertWorkItemWriteAccess(link.client_id, link.deliverable_id, link.task_id)

    const { error } = await supabase
      .from("work_item_external_contacts")
      .update({
        purpose: payload.purpose,
        involvement_status: payload.involvement_status,
        scheduled_date: payload.scheduled_date,
        completed_date: payload.completed_date,
        outcome: payload.outcome,
        notes: payload.notes,
      })
      .eq("link_id", linkId)

    if (error) throw new Error(error.message)

    revalidatePeopleInvolvedPaths(clientId)
    redirectTarget = withFeedback(returnTo, "success", "People Involved details updated successfully.")
  } catch (error) {
    if (error instanceof Error) {
      const lower = error.message.toLowerCase()
      if (lower.includes("required") || lower.includes("invalid") || lower.includes("not found") || lower.includes("mismatch")) {
        redirectTarget = withFeedback(returnTo, "error", error.message)
      }
    }
  }

  redirect(redirectTarget)
}

export async function unlinkPeopleInvolvedAction(formData: FormData) {
  const linkId = getString(formData, "link_id")
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/deliverables")
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    if (!linkId) throw new Error("Missing link_id")
    const supabase = await createClient()

    const { data: link, error: linkError } = await supabase
      .from("work_item_external_contacts")
      .select("link_id, client_id, deliverable_id, task_id")
      .eq("link_id", linkId)
      .single<{ link_id: string; client_id: string; deliverable_id: string | null; task_id: string | null }>()

    if (linkError || !link) throw new Error("People Involved record not found")
    const { clientId } = await assertWorkItemWriteAccess(link.client_id, link.deliverable_id, link.task_id)

    const { error } = await supabase.from("work_item_external_contacts").delete().eq("link_id", linkId)
    if (error) throw new Error(error.message)

    revalidatePeopleInvolvedPaths(clientId)
    redirectTarget = withFeedback(returnTo, "success", "Person removed from People Involved.")
  } catch (error) {
    if (error instanceof Error) {
      const lower = error.message.toLowerCase()
      if (lower.includes("not found")) {
        redirectTarget = withFeedback(returnTo, "error", error.message)
      }
    }
  }

  redirect(redirectTarget)
}
