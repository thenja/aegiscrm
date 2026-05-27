"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { requireExternalContactManageAccess } from "@/lib/permissions"
import { createClient } from "@/lib/supabase/server"
import { externalContactSchema } from "@/lib/validation/schemas"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function getBoolean(formData: FormData, key: string) {
  return getString(formData, key) === "true"
}

function parseExternalContactPayload(formData: FormData) {
  return externalContactSchema.parse({
    name: getString(formData, "name"),
    organisation: getString(formData, "organisation"),
    contact_type: getString(formData, "contact_type"),
    designation: getString(formData, "designation"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    sector_beat: getString(formData, "sector_beat"),
    language: getString(formData, "language"),
    country_market: getString(formData, "country_market"),
    relationship_status: getString(formData, "relationship_status"),
    notes: getString(formData, "notes"),
    is_active: getBoolean(formData, "is_active"),
  })
}

function revalidateExternalContactPaths() {
  revalidatePath("/external-contacts")
}

export async function createExternalContactAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/external-contacts")
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    await requireExternalContactManageAccess()
    const payload = parseExternalContactPayload(formData)
    const supabase = await createClient()

    const duplicateQuery = supabase
      .from("external_contacts")
      .select("external_contact_id, name, organisation, email")
      .ilike("name", payload.name)
      .limit(5)

    const { data: duplicates, error: duplicateError } = await duplicateQuery
    if (duplicateError) throw new Error(duplicateError.message)

    const likelyDuplicate = (duplicates ?? []).some((row) => {
      const sameName = (row.name as string).trim().toLowerCase() === payload.name.trim().toLowerCase()
      const sameOrg =
        !!payload.organisation &&
        !!row.organisation &&
        (row.organisation as string).trim().toLowerCase() === payload.organisation.trim().toLowerCase()
      const sameEmail =
        !!payload.email &&
        !!row.email &&
        (row.email as string).trim().toLowerCase() === payload.email.trim().toLowerCase()

      return sameName && (sameOrg || sameEmail)
    })

    const { error } = await supabase.from("external_contacts").insert(payload)
    if (error) throw new Error(error.message)

    revalidateExternalContactPaths()
    redirectTarget = withFeedback(
      returnTo,
      "success",
      likelyDuplicate
        ? "External contact created successfully. Similar contact exists, please review for duplicates."
        : "External contact created successfully.",
      { reset_create_external_contact: Date.now().toString() }
    )
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("invalid"))) {
      redirectTarget = withFeedback(returnTo, "error", error.message)
    }
  }

  redirect(redirectTarget)
}

export async function updateExternalContactAction(formData: FormData) {
  const externalContactId = getString(formData, "external_contact_id")
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/external-contacts")
  let redirectTarget = withFeedback(returnTo, "error", "Something went wrong. Please try again.")

  try {
    if (!externalContactId) throw new Error("Missing external_contact_id")
    await requireExternalContactManageAccess()

    const payload = parseExternalContactPayload(formData)
    const supabase = await createClient()
    const { error } = await supabase
      .from("external_contacts")
      .update(payload)
      .eq("external_contact_id", externalContactId)

    if (error) throw new Error(error.message)

    revalidateExternalContactPaths()
    redirectTarget = withFeedback(returnTo, "success", "External contact updated successfully.")
  } catch (error) {
    if (error instanceof Error && (error.message.includes("required") || error.message.includes("invalid"))) {
      redirectTarget = withFeedback(returnTo, "error", error.message)
    }
  }

  redirect(redirectTarget)
}
