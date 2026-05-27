"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { createClient } from "@/lib/supabase/server"
import { requireRoleAuth } from "@/lib/auth"
import { hasRole } from "@/lib/permissions"
import { clientSchema } from "@/lib/validation/schemas"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function nullIfEmpty(value: string) {
  return value.trim().length > 0 ? value : null
}

function parseInteger(value: string) {
  if (!value) return NaN
  return Number.parseInt(value, 10)
}

function parseDecimal(value: string) {
  if (!value) return null
  const num = Number.parseFloat(value)
  return Number.isFinite(num) ? num : null
}

function parseDate(value: string) {
  return value ? value : null
}

function parseClientPayload(formData: FormData) {
  return clientSchema.parse({
    client_name: getString(formData, "client_name"),
    stock_code: getString(formData, "stock_code"),
    market: nullIfEmpty(getString(formData, "market")),
    sector: getString(formData, "sector"),
    engagement_type: getString(formData, "engagement_type"),
    client_type: getString(formData, "client_type"),
    status: getString(formData, "status"),
    internal_pic_id: getString(formData, "internal_pic_id"),
    backup_pic_id: nullIfEmpty(getString(formData, "backup_pic_id")),
    scope_of_work: getString(formData, "scope_of_work"),
    health_status: getString(formData, "health_status"),
    servicing_frequency: getString(formData, "servicing_frequency"),
    required_monthly_contacts: parseInteger(getString(formData, "required_monthly_contacts")),
    touchpoint_overdue_days: parseInteger(getString(formData, "touchpoint_overdue_days")),
    contract_start: parseDate(getString(formData, "contract_start")),
    contract_end: parseDate(getString(formData, "contract_end")),
    monthly_fee: parseDecimal(getString(formData, "monthly_fee")),
    notes: getString(formData, "notes"),
  })
}

export async function createClientAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/clients")
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    const auth = await requireRoleAuth(["Director", "Team Lead", "Admin"])
    const payload = parseClientPayload(formData)

    if (!hasRole(auth.profile.role, ["Director"]) && payload.monthly_fee !== null) {
      throw new Error("Only Director can set monthly fee")
    }

    const supabase = await createClient()
    const { error } = await supabase.from("clients").insert(payload)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath("/clients")
    redirectTarget = withFeedback(returnTo, "success", "Client created successfully.")
  } catch {
    // keep generic error feedback target
  }

  redirect(redirectTarget)
}

export async function updateClientAction(formData: FormData) {
  const fallback = `/clients/${getString(formData, "client_id")}?tab=details`
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    const auth = await requireRoleAuth(["Director", "Team Lead", "Admin"])
    const clientId = getString(formData, "client_id")
    if (!clientId) {
      throw new Error("Missing client_id")
    }

    const payload = parseClientPayload(formData)
    const hasMonthlyFeeField = formData.has("monthly_fee")

    const supabase = await createClient()
    const { data: existing, error: existingError } = await supabase
      .from("clients")
      .select("monthly_fee, health_status, internal_pic_id, backup_pic_id")
      .eq("client_id", clientId)
      .single<{
        monthly_fee: number | null
        health_status: string
        internal_pic_id: string
        backup_pic_id: string | null
      }>()

    if (existingError || !existing) {
      throw new Error(existingError?.message || "Client not found")
    }

    if (!hasMonthlyFeeField) {
      payload.monthly_fee = existing.monthly_fee
    }

    if (auth.profile.role === "Team Lead" && payload.monthly_fee !== existing.monthly_fee) {
      throw new Error("Team Lead cannot edit monthly fee")
    }

    if (auth.profile.role === "Admin") {
      if (payload.monthly_fee !== existing.monthly_fee) {
        throw new Error("Admin cannot edit monthly fee")
      }
      if (payload.health_status !== existing.health_status) {
        throw new Error("Admin cannot edit health status")
      }
      if (payload.internal_pic_id !== existing.internal_pic_id || payload.backup_pic_id !== existing.backup_pic_id) {
        throw new Error("Admin cannot reassign PIC")
      }
    }

    const { error } = await supabase.from("clients").update(payload).eq("client_id", clientId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath("/clients")
    revalidatePath(`/clients/${clientId}`)
    redirectTarget = withFeedback(returnTo, "success", "Client details updated successfully.")
  } catch {
    // keep generic error feedback target
  }

  redirect(redirectTarget)
}
