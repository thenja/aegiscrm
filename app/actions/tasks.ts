"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { requireTaskWriteAccess } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { taskSchema } from "@/lib/validation/schemas"

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

function parseTaskPayload(formData: FormData) {
  return taskSchema.parse({
    client_id: getNullableString(formData, "client_id"),
    task_title: getString(formData, "task_title"),
    description: getNullableString(formData, "description"),
    requester: getNullableString(formData, "requester"),
    pic_id: getString(formData, "pic_id"),
    priority: getString(formData, "priority"),
    due_date: getString(formData, "due_date"),
    status: getString(formData, "status"),
    category: getNullableString(formData, "category"),
    requires_client_approval: getBoolean(formData, "requires_client_approval"),
    requires_internal_review: getBoolean(formData, "requires_internal_review"),
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
    attachments: getNullableString(formData, "attachments"),
  })
}

function revalidateTaskPaths(clientId: string | null) {
  revalidatePath("/tasks")
  if (clientId) {
    revalidatePath(`/clients/${clientId}`)
    revalidatePath(`/clients/${clientId}?tab=tasks`)
  }
}

export async function createTaskAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/tasks")
  let resetToken = ""

  try {
    const payload = parseTaskPayload(formData)
    const clientContext = getString(formData, "client_context") === "true"

    if (clientContext && !payload.client_id) {
      throw new Error("client_id is required for client-context task creation")
    }

    await requireTaskWriteAccess(payload.client_id, payload.pic_id)

    const supabase = await createClient()
    const { error } = await supabase.from("tasks").insert(payload)
    if (error) {
      throw new Error(error.message)
    }

    revalidateTaskPaths(payload.client_id)
    resetToken = Date.now().toString()
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }

  redirect(
    withFeedback(returnTo, "success", "Task created successfully.", {
      reset_create_task: resetToken || Date.now().toString(),
    })
  )
}

export async function updateTaskAction(formData: FormData) {
  const taskId = getString(formData, "task_id")
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/tasks")

  try {
    if (!taskId) {
      throw new Error("Missing task_id")
    }

    const payload = parseTaskPayload(formData)
    await requireTaskWriteAccess(payload.client_id, payload.pic_id)

    const supabase = await createClient()
    const { error } = await supabase.from("tasks").update(payload).eq("task_id", taskId)

    if (error) {
      throw new Error(error.message)
    }

    revalidateTaskPaths(payload.client_id)
    redirect(withFeedback(returnTo, "success", "Task updated successfully."))
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}

export async function updateTaskStatusAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/tasks")

  try {
    const taskId = getString(formData, "task_id")
    const picId = getString(formData, "pic_id")
    const clientId = getNullableString(formData, "client_id")
    const status = getString(formData, "status")
    const description = getNullableString(formData, "description")

    if (!taskId || !picId || !status) {
      throw new Error("Missing required fields")
    }

    await requireTaskWriteAccess(clientId, picId)

    const supabase = await createClient()
    const { error } = await supabase
      .from("tasks")
      .update({ status, description })
      .eq("task_id", taskId)

    if (error) {
      throw new Error(error.message)
    }

    revalidateTaskPaths(clientId)
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }

  redirect(withFeedback(returnTo, "success", "Task status updated successfully."))
}
