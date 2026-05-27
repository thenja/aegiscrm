"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { createClient } from "@/lib/supabase/server"
import { requireClientWriteAccess } from "@/lib/permissions"
import { contactSchema } from "@/lib/validation/schemas"
import { getContactById } from "@/lib/data/contacts"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

function parseContactPayload(formData: FormData) {
  return contactSchema.parse({
    client_id: getString(formData, "client_id"),
    contact_name: getString(formData, "contact_name"),
    designation: getString(formData, "designation"),
    email: getString(formData, "email"),
    phone: getString(formData, "phone"),
    contact_type: getString(formData, "contact_type"),
    is_primary: getString(formData, "is_primary") === "true",
    notes: getString(formData, "notes"),
  })
}

export async function createContactAction(formData: FormData) {
  const fallback = `/clients/${getString(formData, "client_id")}?tab=contacts`
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)

  try {
    const payload = parseContactPayload(formData)
    await requireClientWriteAccess(payload.client_id)

    const supabase = await createClient()

    if (payload.is_primary) {
      await supabase
        .from("contacts")
        .update({ is_primary: false })
        .eq("client_id", payload.client_id)
    }

    const { error } = await supabase.from("contacts").insert(payload)
    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/clients/${payload.client_id}?tab=contacts`)
    redirect(
      withFeedback(returnTo, "success", "Contact added successfully.", {
        reset_create_contact: Date.now().toString(),
      })
    )
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}

export async function updateContactAction(formData: FormData) {
  const fallback = `/clients/${getString(formData, "client_id")}?tab=contacts`
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)

  try {
    const contactId = getString(formData, "contact_id")
    if (!contactId) {
      throw new Error("Missing contact_id")
    }

    const payload = parseContactPayload(formData)
    await requireClientWriteAccess(payload.client_id)

    const supabase = await createClient()

    if (payload.is_primary) {
      await supabase
        .from("contacts")
        .update({ is_primary: false })
        .eq("client_id", payload.client_id)
        .neq("contact_id", contactId)
    }

    const { error } = await supabase
      .from("contacts")
      .update({
        contact_name: payload.contact_name,
        designation: payload.designation,
        email: payload.email,
        phone: payload.phone,
        contact_type: payload.contact_type,
        is_primary: payload.is_primary,
        notes: payload.notes,
      })
      .eq("contact_id", contactId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/clients/${payload.client_id}?tab=contacts`)
    redirect(withFeedback(returnTo, "success", "Contact updated successfully."))
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}

export async function deleteContactAction(formData: FormData) {
  const fallback = `/clients/${getString(formData, "client_id")}?tab=contacts`
  const returnTo = safeReturnTo(getString(formData, "return_to"), fallback)

  try {
    const contactId = getString(formData, "contact_id")
    if (!contactId) {
      throw new Error("Missing contact_id")
    }

    const contact = await getContactById(contactId)
    await requireClientWriteAccess(contact.client_id)

    const supabase = await createClient()
    const { error } = await supabase.from("contacts").delete().eq("contact_id", contactId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath(`/clients/${contact.client_id}?tab=contacts`)
    redirect(withFeedback(returnTo, "success", "Contact deleted successfully."))
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}
