"use client"

import { useMemo, useState } from "react"

import { deleteContactAction, updateContactAction } from "@/app/actions/contacts"
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
import { EmptyState, ItemCard, PillBadge } from "@/components/ui/patterns"
import { CONTACT_TYPES } from "@/types/domain"

type ContactRow = {
  contact_id: string
  contact_name: string
  designation: string | null
  email: string | null
  phone: string | null
  contact_type: (typeof CONTACT_TYPES)[number]
  is_primary: boolean
  notes: string | null
}

export function ContactsListWithDrawer({
  contacts,
  clientId,
  returnTo,
  canEdit,
}: {
  contacts: ContactRow[]
  clientId: string
  returnTo: string
  canEdit: boolean
}) {
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null)
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.contact_id === selectedContactId) ?? null,
    [contacts, selectedContactId]
  )

  if (contacts.length === 0) {
    return <EmptyState title="No contacts yet" description="Add a contact to start tracking key client stakeholders." />
  }

  return (
    <>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <ItemCard
            key={contact.contact_id}
            title={
              <button type="button" className="text-left hover:underline" onClick={() => setSelectedContactId(contact.contact_id)}>
                <span className="flex flex-wrap items-center gap-2">
                  {contact.contact_name}
                  <PillBadge label={contact.contact_type} tone="blue" />
                  {contact.is_primary ? <PillBadge label="Primary" tone="green" /> : null}
                </span>
              </button>
            }
            metaLine={
              <>
                Designation: <span className="font-medium text-text-primary">{contact.designation ?? "-"}</span>
              </>
            }
            subLine={
              <>
                Email: <span className="font-medium text-text-primary">{contact.email ?? "-"}</span> | Phone:{" "}
                <span className="font-medium text-text-primary">{contact.phone ?? "-"}</span>
              </>
            }
          >
            <DrawerActions>
              <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedContactId(contact.contact_id)}>
                View
              </Button>
            </DrawerActions>
          </ItemCard>
        ))}
      </div>

      <DetailDrawer
        open={Boolean(selectedContact)}
        onClose={() => setSelectedContactId(null)}
        title={selectedContact?.contact_name ?? "Contact"}
        subtitle="Contact detail"
      >
        {selectedContact ? (
          <div className="space-y-3">
            <DrawerHeader
              title={selectedContact.contact_name}
              badge={<PillBadge label={selectedContact.contact_type} tone="blue" />}
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "Designation", value: selectedContact.designation ?? "-" },
                    { label: "Primary", value: selectedContact.is_primary ? "Yes" : "No" },
                  ]}
                />
              }
            />
            <DrawerSection title="Contact Context">
              <DrawerMetaRow
                items={[
                  { label: "Email", value: selectedContact.email ?? "-" },
                  { label: "Phone", value: selectedContact.phone ?? "-" },
                ]}
              />
              <p className="mt-2 text-xs text-text-secondary">
                Notes: <span className="font-medium text-text-primary">{selectedContact.notes ?? "-"}</span>
              </p>
            </DrawerSection>
            {canEdit ? (
              <DrawerSection title="Edit Contact">
                <form action={updateContactAction} className="grid grid-cols-1 gap-2">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="contact_id" value={selectedContact.contact_id} />
                  <input type="hidden" name="client_id" value={clientId} />
                  <Input name="contact_name" defaultValue={selectedContact.contact_name} required />
                  <Input name="designation" defaultValue={selectedContact.designation ?? ""} />
                  <Input name="email" defaultValue={selectedContact.email ?? ""} />
                  <Input name="phone" defaultValue={selectedContact.phone ?? ""} />
                  <select name="contact_type" defaultValue={selectedContact.contact_type} className="h-10 rounded-md border border-border px-3 text-sm">
                    {CONTACT_TYPES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                  <select name="is_primary" defaultValue={selectedContact.is_primary ? "true" : "false"} className="h-10 rounded-md border border-border px-3 text-sm">
                    <option value="false">Secondary</option>
                    <option value="true">Primary</option>
                  </select>
                  <textarea name="notes" defaultValue={selectedContact.notes ?? ""} className="min-h-[80px] rounded-md border border-border px-3 py-2 text-sm" />
                  <DrawerActions>
                    <Button type="submit" variant="secondary">Save Contact Changes</Button>
                    <ConfirmDialog
                      triggerLabel="Delete Contact"
                      triggerVariant="danger"
                      title="Delete contact?"
                      description="Are you sure you want to delete this contact?"
                      confirmNode={
                        <button formAction={deleteContactAction} type="submit" className="inline-flex h-9 items-center justify-center rounded-md bg-status-red px-4 text-sm font-medium text-white">
                          Confirm Delete
                        </button>
                      }
                    />
                  </DrawerActions>
                </form>
              </DrawerSection>
            ) : null}
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}
