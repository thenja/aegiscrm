"use client"

import { useMemo, useState } from "react"

import { deactivateUserAction, updateUserAction } from "@/app/actions/users"
import { Button } from "@/components/ui/button"
import {
  ConfirmDialog,
  DetailDrawer,
  DrawerActions,
  DrawerHeader,
  DrawerMetaRow,
  DrawerSection,
} from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import { FormSubmitButton } from "@/components/ui/form-submit-button"
import { EmptyState, ItemCard, PillBadge } from "@/components/ui/patterns"
import { APP_ROLES } from "@/types/roles"

type UserRow = {
  user_id: string
  full_name: string
  email: string
  role: "Director" | "Team Lead" | "Team Member" | "Admin"
  department: string | null
  is_active: boolean
}

export function UsersListWithDrawer({
  users,
  returnTo,
}: {
  users: UserRow[]
  returnTo: string
}) {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const selectedUser = useMemo(() => users.find((u) => u.user_id === selectedUserId) ?? null, [users, selectedUserId])

  if (users.length === 0) {
    return <EmptyState title="No users yet" description="Create a user to start assigning ownership and roles." />
  }

  return (
    <>
      <div className="space-y-3">
        {users.map((user) => (
          <ItemCard
            key={user.user_id}
            title={
              <button type="button" className="text-left hover:underline" onClick={() => setSelectedUserId(user.user_id)}>
                <span className="flex flex-wrap items-center gap-2">
                  {user.full_name}
                  <PillBadge label={user.role} tone="blue" />
                  <PillBadge label={user.is_active ? "Active" : "Inactive"} tone={user.is_active ? "green" : "neutral"} />
                </span>
              </button>
            }
            metaLine={
              <>
                Email: <span className="font-medium text-text-primary">{user.email}</span> | Department:{" "}
                <span className="font-medium text-text-primary">{user.department ?? "-"}</span>
              </>
            }
          >
            <DrawerActions>
              <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedUserId(user.user_id)}>
                View
              </Button>
              {user.is_active ? (
                <ConfirmDialog
                  triggerLabel="Deactivate User"
                  triggerVariant="danger"
                  title="Deactivate user?"
                  description="Are you sure you want to deactivate this user?"
                  confirmNode={
                    <form action={deactivateUserAction}>
                      <input type="hidden" name="return_to" value={returnTo} />
                      <input type="hidden" name="user_id" value={user.user_id} />
                      <Button type="submit" variant="danger" size="sm">Confirm Deactivate</Button>
                    </form>
                  }
                />
              ) : null}
            </DrawerActions>
          </ItemCard>
        ))}
      </div>

      <DetailDrawer
        open={Boolean(selectedUser)}
        onClose={() => setSelectedUserId(null)}
        title={selectedUser?.full_name ?? "User"}
        subtitle="User quick details"
      >
        {selectedUser ? (
          <div className="space-y-3">
            <DrawerHeader
              title={selectedUser.full_name}
              badge={<PillBadge label={selectedUser.is_active ? "Active" : "Inactive"} tone={selectedUser.is_active ? "green" : "neutral"} />}
              subtitle={<DrawerMetaRow items={[{ label: "Email", value: selectedUser.email }, { label: "Role", value: selectedUser.role }]} />}
            />
            <DrawerSection title="Edit Details">
              <form action={updateUserAction} className="grid grid-cols-1 gap-2">
                <input type="hidden" name="return_to" value={returnTo} />
                <input type="hidden" name="user_id" value={selectedUser.user_id} />
                <Input name="full_name" defaultValue={selectedUser.full_name} required />
                <Input value={selectedUser.email} disabled readOnly />
                <select name="role" defaultValue={selectedUser.role} className="h-10 rounded-md border border-border px-3 text-sm">
                  {APP_ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                </select>
                <Input name="department" defaultValue={selectedUser.department ?? ""} placeholder="Department" />
                <select name="is_active" defaultValue={selectedUser.is_active ? "true" : "false"} className="h-10 rounded-md border border-border px-3 text-sm">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
                <FormSubmitButton idleLabel="Save User Changes" pendingLabel="Saving..." variant="secondary" size="sm" />
              </form>
            </DrawerSection>
            <DrawerActions>
              {selectedUser.is_active ? (
                <ConfirmDialog
                  triggerLabel="Deactivate User"
                  triggerVariant="danger"
                  title="Deactivate user?"
                  description="Are you sure you want to deactivate this user?"
                  confirmNode={
                    <form action={deactivateUserAction}>
                      <input type="hidden" name="return_to" value={returnTo} />
                      <input type="hidden" name="user_id" value={selectedUser.user_id} />
                      <Button type="submit" variant="danger" size="sm">Confirm Deactivate</Button>
                    </form>
                  }
                />
              ) : null}
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}
