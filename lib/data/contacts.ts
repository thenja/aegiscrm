import { createClient } from "@/lib/supabase/server"
import type { ContactRow } from "@/types/domain"

export async function getContactById(contactId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("contact_id", contactId)
    .single<ContactRow>()

  if (error) {
    throw new Error(error.message)
  }

  return data
}

