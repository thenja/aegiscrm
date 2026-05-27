"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { requireDeliverableWriteAccess } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { deliverableSchema } from "@/lib/validation/schemas"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key).trim()
  return value.length > 0 ? value : null
}

function getBoolean(formData: FormData, key: string) {
  return getString(formData, key) === "true"
}

function parseDeliverablePayload(formData: FormData) {
  return deliverableSchema.parse({
    client_id: getString(formData, "client_id"),
    deliverable_name: getString(formData, "deliverable_name"),
    category: getString(formData, "category"),
    recurrence: getString(formData, "recurrence"),
    due_date: getString(formData, "due_date"),
    pic_id: getString(formData, "pic_id"),
    status: getString(formData, "status"),
    priority: getString(formData, "priority"),
    requires_client_approval: getBoolean(formData, "requires_client_approval"),
    requires_internal_review: getBoolean(formData, "requires_internal_review"),
    exception_reason: getNullableString(formData, "exception_reason"),
    deferred_to_date: getNullableString(formData, "deferred_to_date"),
    pending_data_comm_log_id: getNullableString(formData, "pending_data_comm_log_id"),
    reviewer_id: getNullableString(formData, "reviewer_id"),
    review_deadline: getNullableString(formData, "review_deadline"),
    review_status: getNullableString(formData, "review_status"),
    review_comments: getNullableString(formData, "review_comments"),
    version_number: getNullableString(formData, "version_number"),
    completion_date: getNullableString(formData, "completion_date"),
    final_file_link: getNullableString(formData, "final_file_link"),
    sent_date: getNullableString(formData, "sent_date"),
    sent_by_id: getNullableString(formData, "sent_by_id"),
    sent_to_name: getNullableString(formData, "sent_to_name"),
    client_confirmation: getNullableString(formData, "client_confirmation"),
    proof_link: getNullableString(formData, "proof_link"),
    notes: getNullableString(formData, "notes"),
  })
}

function revalidateDeliverablePaths(clientId: string) {
  revalidatePath("/deliverables")
  revalidatePath(`/clients/${clientId}`)
  revalidatePath(`/clients/${clientId}?tab=deliverables`)
}

export async function createDeliverableAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/deliverables")

  try {
    const payload = parseDeliverablePayload(formData)
    await requireDeliverableWriteAccess(payload.client_id, payload.pic_id)

    const supabase = await createClient()
    const { error } = await supabase.from("deliverables").insert(payload)
    if (error) {
      throw new Error(error.message)
    }

    revalidateDeliverablePaths(payload.client_id)
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }

  redirect(
    withFeedback(returnTo, "success", "Deliverable created successfully.", {
      reset_create_deliverable: Date.now().toString(),
    })
  )
}

export async function updateDeliverableAction(formData: FormData) {
  const deliverableId = getString(formData, "deliverable_id")
  const fallback = "/deliverables"
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)

  try {
    if (!deliverableId) {
      throw new Error("Missing deliverable_id")
    }

    const payload = parseDeliverablePayload(formData)
    await requireDeliverableWriteAccess(payload.client_id, payload.pic_id)

    const supabase = await createClient()
    const { error } = await supabase.from("deliverables").update(payload).eq("deliverable_id", deliverableId)

    if (error) {
      throw new Error(error.message)
    }

    revalidateDeliverablePaths(payload.client_id)
    redirect(withFeedback(returnTo, "success", "Deliverable updated successfully."))
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}

export async function updateDeliverableStatusAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/deliverables")
  let clientId = ""

  try {
    const deliverableId = getString(formData, "deliverable_id")
    clientId = getString(formData, "client_id")
    const picId = getString(formData, "pic_id")
    const status = getString(formData, "status")
    const notes = getNullableString(formData, "notes")

    if (!deliverableId || !clientId || !picId || !status) {
      throw new Error("Missing required fields")
    }

    await requireDeliverableWriteAccess(clientId, picId)

    const supabase = await createClient()
    const { error } = await supabase
      .from("deliverables")
      .update({ status, notes })
      .eq("deliverable_id", deliverableId)

    if (error) {
      throw new Error(error.message)
    }

    revalidateDeliverablePaths(clientId)
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }

  redirect(withFeedback(returnTo, "success", "Deliverable status updated successfully."))
}
