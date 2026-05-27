"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import { safeReturnTo, withFeedback } from "@/lib/action-feedback"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { requireDirectorOrAdmin } from "@/lib/permissions"
import { adminUserCreateSchema, adminUserUpdateSchema } from "@/lib/validation/schemas"

function getString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === "string" ? value : ""
}

export async function createUserAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/admin/users")

  let createdUserId: string | null = null

  try {
    await requireDirectorOrAdmin()

    const payload = adminUserCreateSchema.parse({
      email: getString(formData, "email"),
      full_name: getString(formData, "full_name"),
      role: getString(formData, "role"),
      department: getString(formData, "department"),
      temporary_password: getString(formData, "temporary_password"),
    })

    const admin = createAdminClient()

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: payload.email,
      password: payload.temporary_password,
      email_confirm: true,
      user_metadata: {
        full_name: payload.full_name,
      },
      app_metadata: {
        role: payload.role,
      },
    })

    if (createError || !created.user) {
      throw new Error(createError?.message || "Failed to create auth user")
    }
    createdUserId = created.user.id

    const { error: profileError } = await admin.from("users").insert({
      user_id: createdUserId,
      full_name: payload.full_name,
      email: payload.email,
      role: payload.role,
      department: payload.department,
      is_active: true,
    })

    if (profileError) {
      await admin.auth.admin.deleteUser(createdUserId)
      throw new Error(profileError.message)
    }
  } catch {
    if (createdUserId) {
      const admin = createAdminClient()
      await admin.auth.admin.deleteUser(createdUserId)
    }
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }

  revalidatePath("/admin/users")
  redirect(
    withFeedback(returnTo, "success", "User created successfully.", {
      reset_create_user: Date.now().toString(),
    })
  )
}

export async function updateUserAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/admin/users")

  try {
    await requireDirectorOrAdmin()

    const payload = adminUserUpdateSchema.parse({
      user_id: getString(formData, "user_id"),
      full_name: getString(formData, "full_name"),
      role: getString(formData, "role"),
      department: getString(formData, "department"),
      is_active: getString(formData, "is_active") === "true",
    })

    const supabase = await createClient()
    const { error } = await supabase
      .from("users")
      .update({
        full_name: payload.full_name,
        role: payload.role,
        department: payload.department,
        is_active: payload.is_active,
      })
      .eq("user_id", payload.user_id)

    if (error) {
      throw new Error(error.message)
    }

    const admin = createAdminClient()
    await admin.auth.admin.updateUserById(payload.user_id, {
      app_metadata: { role: payload.role },
      user_metadata: { full_name: payload.full_name },
    })

    revalidatePath("/admin/users")
    redirect(withFeedback(returnTo, "success", "User updated successfully."))
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}

export async function deactivateUserAction(formData: FormData) {
  const returnTo = safeReturnTo(getString(formData, "return_to"), "/admin/users")

  try {
    await requireDirectorOrAdmin()

    const userId = getString(formData, "user_id")
    if (!userId) {
      throw new Error("Missing user_id")
    }

    const supabase = await createClient()
    const { error } = await supabase
      .from("users")
      .update({ is_active: false })
      .eq("user_id", userId)

    if (error) {
      throw new Error(error.message)
    }

    revalidatePath("/admin/users")
    redirect(withFeedback(returnTo, "success", "User deactivated successfully."))
  } catch {
    redirect(withFeedback(returnTo, "error", "Something went wrong. Please try again."))
  }
}
