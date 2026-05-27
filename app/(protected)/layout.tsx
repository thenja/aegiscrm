import { redirect } from "next/navigation"

import { AppShell } from "@/components/layout/app-shell"
import { getAuthUser } from "@/lib/auth"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const auth = await getAuthUser()
  if (!auth) {
    redirect("/login")
  }

  return <AppShell profile={auth.profile}>{children}</AppShell>
}
