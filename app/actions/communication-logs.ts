"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { requireClientCommunicationLogAccess } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { communicationLogSchema } from "@/lib/validation/schemas"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

export async function createCommunicationLogAction(formData: FormData) {
  const clientId = getString(formData, "client_id")
  const fallback = `/clients/${clientId}?tab=communication`
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)

  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    const payload = communicationLogSchema.parse({
      client_id: clientId,
      communication_date: getString(formData, "communication_date"),
      channel: getString(formData, "channel"),
      direction: getString(formData, "direction"),
      counterpart_name: getString(formData, "counterpart_name"),
      counterpart_designation: getString(formData, "counterpart_designation"),
      summary: getString(formData, "summary"),
      related_deliverable_id: getString(formData, "related_deliverable_id"),
      related_task_id: getString(formData, "related_task_id"),
      attachment_link: getString(formData, "attachment_link"),
    })

    const auth = await requireClientCommunicationLogAccess(payload.client_id)
    const supabase = await createClient()

    if (payload.related_deliverable_id && payload.related_task_id) {
      throw new Error("Please select either related deliverable or related task, not both.")
    }

    if (payload.related_deliverable_id) {
      const { data: relatedDeliverable, error } = await supabase
        .from("deliverables")
        .select("deliverable_id, client_id")
        .eq("deliverable_id", payload.related_deliverable_id)
        .single<{ deliverable_id: string; client_id: string }>()

      if (error || !relatedDeliverable || relatedDeliverable.client_id !== payload.client_id) {
        throw new Error("Selected deliverable is not linked to this client.")
      }
    }

    if (payload.related_task_id) {
      const { data: relatedTask, error } = await supabase
        .from("tasks")
        .select("task_id, client_id")
        .eq("task_id", payload.related_task_id)
        .single<{ task_id: string; client_id: string | null }>()

      if (error || !relatedTask || relatedTask.client_id !== payload.client_id) {
        throw new Error("Selected task is not linked to this client.")
      }
    }

    const referenceType = payload.related_deliverable_id
      ? "Deliverable"
      : payload.related_task_id
        ? "Task"
        : "None"
    const referenceId = payload.related_deliverable_id ?? payload.related_task_id ?? null

    const { error: insertError } = await supabase.from("client_communication_logs").insert({
      client_id: payload.client_id,
      comm_date: `${payload.communication_date}T12:00:00+08:00`,
      channel: payload.channel,
      summary: payload.summary,
      counterpart_name: payload.counterpart_name,
      counterpart_designation: payload.counterpart_designation,
      direction: payload.direction,
      logged_by: auth.profile.user_id,
      reference_type: referenceType,
      reference_id: referenceId,
      attachments: payload.attachment_link,
    })

    if (insertError) {
      throw new Error(insertError.message)
    }

    revalidatePath("/clients")
    revalidatePath(`/clients/${payload.client_id}`)
    revalidatePath("/")

    redirectTarget = withFeedback(returnTo, "success", "Communication log added successfully.", {
      reset_create_comm_log: Date.now().toString(),
    })
  } catch (error) {
    if (error instanceof Error) {
      const lower = error.message.toLowerCase()
      if (
        lower.includes("future") ||
        lower.includes("required") ||
        lower.includes("invalid") ||
        lower.includes("linked to this client") ||
        lower.includes("either related deliverable or related task")
      ) {
        redirectTarget = withFeedback(returnTo, "error", error.message)
      }
    }
  }

  redirect(redirectTarget)
}
