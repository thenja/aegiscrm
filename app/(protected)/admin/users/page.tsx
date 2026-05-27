import { createUserAction } from "@/app/actions/users"
import { listUsers } from "@/lib/data/users"
import { requireDirectorOrAdmin } from "@/lib/permissions"
import { APP_ROLES } from "@/types/roles"
import { UsersListWithDrawer } from "@/components/users/users-list-with-drawer"
import { ActionFeedback } from "@/components/ui/action-feedback"
import { Button } from "@/components/ui/button"
import { ModalForm } from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import {
  FormSection,
  PageHeader,
  SectionCard,
} from "@/components/ui/patterns"

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams?: { feedback?: string; message?: string; reset_create_user?: string }
}) {
  await requireDirectorOrAdmin()
  const users = await listUsers()

  return (
    <div className="space-y-6">
      <ActionFeedback feedback={searchParams?.feedback} message={searchParams?.message} />

      <PageHeader title="User Management" description="Manage internal users, roles, and account status." />

      <SectionCard
        title="Create New User"
        action={
          <ModalForm triggerLabel="+ New User" title="Create New User">
            <FormSection title="Create New User" description="Invite a new user with role and temporary password.">
              <form
                key={searchParams?.reset_create_user ?? "create-user-form"}
                action={createUserAction}
                className="grid grid-cols-1 gap-3 md:grid-cols-2"
              >
                <input type="hidden" name="return_to" value="/admin/users" />
                <Input name="full_name" placeholder="Full Name" required />
                <Input name="email" type="email" placeholder="Email" required />
                <select name="role" required className="h-10 rounded-md border border-border px-3 text-sm">
                  {APP_ROLES.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
                <Input name="department" placeholder="Department (optional)" />
                <Input name="temporary_password" type="password" placeholder="Temporary password" required />
                <div className="md:col-span-2">
                  <Button type="submit">Create User</Button>
                </div>
              </form>
            </FormSection>
          </ModalForm>
        }
      >
        <p className="text-sm text-text-secondary">Use + New User to invite team members.</p>
      </SectionCard>

      <SectionCard title="Existing Users" description="Review summary, then expand Edit Details when changes are needed.">
        <UsersListWithDrawer users={users} returnTo="/admin/users" />
      </SectionCard>
    </div>
  )
}
