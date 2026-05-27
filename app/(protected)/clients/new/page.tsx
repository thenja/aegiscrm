import Link from "next/link"

import { createClientAction } from "@/app/actions/clients"
import { ActionFeedback } from "@/components/ui/action-feedback"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormSection, PageHeader, SectionCard } from "@/components/ui/patterns"
import { requireRoleAuth } from "@/lib/auth"
import { getUsersForClientAssignments } from "@/lib/data/clients"
import { hasRole } from "@/lib/permissions"
import {
  CLIENT_STATUSES,
  CLIENT_TYPES,
  ENGAGEMENT_TYPES,
  HEALTH_STATUSES,
  MARKET_TYPES,
  SERVICING_FREQUENCIES,
} from "@/types/domain"

export default async function NewClientPage({
  searchParams,
}: {
  searchParams?: { feedback?: string; message?: string }
}) {
  const auth = await requireRoleAuth(["Director", "Team Lead", "Admin"])
  const users = await getUsersForClientAssignments()
  const canEditFee = hasRole(auth.profile.role, ["Director"])

  return (
    <div className="space-y-6">
      <ActionFeedback feedback={searchParams?.feedback} message={searchParams?.message} />

      <PageHeader title="Create Client" description="Add a new client record for servicing operations." />

      <SectionCard>
        <FormSection title="Client Details" description="Fill required fields first; optional fields can be completed as available.">
          <form action={createClientAction} className="space-y-4">
            <input type="hidden" name="return_to" value="/clients" />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Input name="client_name" placeholder="Client Name" required />
              <Input name="stock_code" placeholder="Stock Code" />

              <select name="market" className="h-10 rounded-md border border-border px-3 text-sm">
                <option value="">Market (Optional)</option>
                {MARKET_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <Input name="sector" placeholder="Sector" />

              <select name="engagement_type" required className="h-10 rounded-md border border-border px-3 text-sm">
                {ENGAGEMENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select name="client_type" required className="h-10 rounded-md border border-border px-3 text-sm">
                {CLIENT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>

              <select name="status" required className="h-10 rounded-md border border-border px-3 text-sm">
                {CLIENT_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <select name="health_status" required className="h-10 rounded-md border border-border px-3 text-sm">
                {HEALTH_STATUSES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>

              <select name="internal_pic_id" required className="h-10 rounded-md border border-border px-3 text-sm">
                <option value="">Select Internal PIC</option>
                {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
              </select>
              <select name="backup_pic_id" className="h-10 rounded-md border border-border px-3 text-sm">
                <option value="">Select Backup PIC (Optional)</option>
                {users.map((u) => <option key={u.user_id} value={u.user_id}>{u.full_name}</option>)}
              </select>

              <select name="servicing_frequency" required className="h-10 rounded-md border border-border px-3 text-sm">
                {SERVICING_FREQUENCIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <Input name="required_monthly_contacts" type="number" min="0" required defaultValue="4" />

              <Input name="touchpoint_overdue_days" type="number" min="1" required defaultValue="7" />
              <Input name="contract_start" type="date" />
              <Input name="contract_end" type="date" />
              {canEditFee ? <Input name="monthly_fee" type="number" step="0.01" min="0" placeholder="Monthly Fee" /> : null}
            </div>

            <textarea name="scope_of_work" required placeholder="Scope of work" className="min-h-[100px] w-full rounded-md border border-border px-3 py-2 text-sm" />
            <textarea name="notes" placeholder="Notes" className="min-h-[80px] w-full rounded-md border border-border px-3 py-2 text-sm" />

            <div className="flex gap-2">
              <Button type="submit">Create Client</Button>
              <Link href="/clients"><Button type="button" variant="secondary">Back</Button></Link>
            </div>
          </form>
        </FormSection>
      </SectionCard>
    </div>
  )
}
