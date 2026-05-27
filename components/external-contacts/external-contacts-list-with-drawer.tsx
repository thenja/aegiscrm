"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"

import { updateExternalContactAction } from "@/app/actions/external-contacts"
import { Button } from "@/components/ui/button"
import {
  DetailDrawer,
  DrawerActions,
  DrawerHeader,
  DrawerMetaRow,
  DrawerSection,
} from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import { FormSubmitButton } from "@/components/ui/form-submit-button"
import { CollapsibleEditSection, EmptyState, ItemCard, PillBadge } from "@/components/ui/patterns"
import { formatDisplayDate } from "@/lib/date"
import type { ExternalContactViewRow, ExternalContactRelatedWorkRow } from "@/lib/data/external-contacts"
import { EXTERNAL_CONTACT_TYPES } from "@/types/domain"

export function ExternalContactsListWithDrawer({
  contacts,
  relatedWorkByExternalContactId,
  returnTo,
  canManage,
  initialSelectedId,
}: {
  contacts: ExternalContactViewRow[]
  relatedWorkByExternalContactId: Record<string, ExternalContactRelatedWorkRow[]>
  returnTo: string
  canManage: boolean
  initialSelectedId?: string | null
}) {
  const [selectedId, setSelectedId] = useState<string | null>(initialSelectedId ?? null)
  useEffect(() => {
    setSelectedId(initialSelectedId ?? null)
  }, [initialSelectedId])

  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.external_contact_id === selectedId) ?? null,
    [contacts, selectedId]
  )
  const relatedRows = selectedContact
    ? relatedWorkByExternalContactId[selectedContact.external_contact_id] ?? []
    : []

  if (contacts.length === 0) {
    return (
      <EmptyState
        title="No external contacts found"
        description="Add an external contact to start tracking People Involved."
      />
    )
  }

  return (
    <>
      <div className="space-y-3">
        {contacts.map((contact) => (
          <ItemCard
            key={contact.external_contact_id}
            title={
              <button type="button" className="text-left hover:underline" onClick={() => setSelectedId(contact.external_contact_id)}>
                {contact.name}
              </button>
            }
            status={<PillBadge label={contact.contact_type} tone="blue" compact />}
            metaLine={
              <>
                Organisation: <span className="font-medium text-text-primary">{contact.organisation ?? "-"}</span>
                {" | "}
                Linked Work: <span className="font-medium text-text-primary">{contact.linked_work_count}</span>
                {" | "}
                Status:{" "}
                <span className="font-medium text-text-primary">{contact.is_active ? "Active" : "Inactive"}</span>
              </>
            }
            subLine={
              <>
                Email: <span className="font-medium text-text-primary">{contact.email ?? "-"}</span>
                {" | "}
                Phone: <span className="font-medium text-text-primary">{contact.phone ?? "-"}</span>
              </>
            }
          >
            <DrawerActions>
              <Button type="button" variant="ghost" size="xs" onClick={() => setSelectedId(contact.external_contact_id)}>
                View
              </Button>
            </DrawerActions>
          </ItemCard>
        ))}
      </div>

      <DetailDrawer
        open={Boolean(selectedContact)}
        onClose={() => setSelectedId(null)}
        title={selectedContact?.name ?? "External Contact"}
        subtitle="External contact quick view"
      >
        {selectedContact ? (
          <div className="space-y-3">
            <DrawerHeader
              title={selectedContact.name}
              badge={<PillBadge label={selectedContact.contact_type} tone="blue" compact />}
              subtitle={
                <DrawerMetaRow
                  items={[
                    { label: "Organisation", value: selectedContact.organisation ?? "-" },
                    { label: "Designation", value: selectedContact.designation ?? "-" },
                    { label: "Active", value: selectedContact.is_active ? "Yes" : "No" },
                  ]}
                />
              }
            />

            <DrawerSection title="Contact Details">
              <DrawerMetaRow
                items={[
                  { label: "Email", value: selectedContact.email ?? "-" },
                  { label: "Phone", value: selectedContact.phone ?? "-" },
                  { label: "Sector/Beat", value: selectedContact.sector_beat ?? "-" },
                  { label: "Language", value: selectedContact.language ?? "-" },
                ]}
              />
              <p className="mt-2 text-xs text-text-secondary">
                Country/Market:{" "}
                <span className="font-medium text-text-primary">{selectedContact.country_market ?? "-"}</span>
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Relationship:{" "}
                <span className="font-medium text-text-primary">{selectedContact.relationship_status ?? "-"}</span>
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Notes: <span className="font-medium text-text-primary">{selectedContact.notes ?? "-"}</span>
              </p>
            </DrawerSection>

            <DrawerSection title="Related Work">
              {relatedRows.length === 0 ? (
                <p className="text-xs text-text-secondary">No related deliverables or tasks yet.</p>
              ) : (
                <div className="space-y-2">
                  {relatedRows.map((row) => (
                    <article key={row.link_id} className="rounded-md border border-border p-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-navy">{row.client_name}</p>
                          <p className="text-sm font-medium text-text-primary">{row.item_name}</p>
                        </div>
                        <PillBadge label={row.involvement_status} tone="amber" compact />
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">
                        {row.item_type} | Status: <span className="font-medium text-text-primary">{row.item_status}</span>
                        {" | "}Due: <span className="font-medium text-text-primary">{formatDisplayDate(row.due_date)}</span>
                      </p>
                      <p className="mt-1 text-xs text-text-secondary">
                        Purpose: <span className="font-medium text-text-primary">{row.purpose}</span>
                        {row.scheduled_date ? (
                          <>
                            {" | "}Scheduled: <span className="font-medium text-text-primary">{formatDisplayDate(row.scheduled_date)}</span>
                          </>
                        ) : null}
                        {row.completed_date ? (
                          <>
                            {" | "}Completed: <span className="font-medium text-text-primary">{formatDisplayDate(row.completed_date)}</span>
                          </>
                        ) : null}
                      </p>
                      <DrawerActions>
                        <Button type="button" size="xs" variant="ghost" asChild>
                          <Link href={row.href}>Open</Link>
                        </Button>
                        <Button type="button" size="xs" variant="secondary" asChild>
                          <Link href={`/clients/${row.client_id}`}>Client</Link>
                        </Button>
                      </DrawerActions>
                    </article>
                  ))}
                </div>
              )}
            </DrawerSection>

            {canManage ? (
              <DrawerSection title="Edit Details">
                <form action={updateExternalContactAction} className="grid grid-cols-1 gap-2">
                  <input type="hidden" name="return_to" value={returnTo} />
                  <input type="hidden" name="external_contact_id" value={selectedContact.external_contact_id} />
                  <Input name="name" defaultValue={selectedContact.name} required />
                  <Input name="organisation" defaultValue={selectedContact.organisation ?? ""} placeholder="Organisation" />
                  <select name="contact_type" defaultValue={selectedContact.contact_type} className="h-9 rounded-md border border-border px-2 text-sm">
                    {EXTERNAL_CONTACT_TYPES.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <Input name="designation" defaultValue={selectedContact.designation ?? ""} placeholder="Designation" />
                  <Input name="email" defaultValue={selectedContact.email ?? ""} placeholder="Email" />
                  <Input name="phone" defaultValue={selectedContact.phone ?? ""} placeholder="Phone" />
                  <CollapsibleEditSection title="Advanced / Optional Details">
                    <div className="grid grid-cols-1 gap-2">
                      <Input name="sector_beat" defaultValue={selectedContact.sector_beat ?? ""} placeholder="Sector / Beat" />
                      <Input name="language" defaultValue={selectedContact.language ?? ""} placeholder="Language" />
                      <Input name="country_market" defaultValue={selectedContact.country_market ?? ""} placeholder="Country / Market" />
                      <Input
                        name="relationship_status"
                        defaultValue={selectedContact.relationship_status ?? ""}
                        placeholder="Relationship Status"
                      />
                      <textarea
                        name="notes"
                        defaultValue={selectedContact.notes ?? ""}
                        className="min-h-[80px] rounded-md border border-border px-2 py-2 text-sm"
                        placeholder="Notes"
                      />
                    </div>
                  </CollapsibleEditSection>
                  <select name="is_active" defaultValue={selectedContact.is_active ? "true" : "false"} className="h-9 rounded-md border border-border px-2 text-sm">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                  <FormSubmitButton idleLabel="Save" pendingLabel="Saving..." variant="secondary" size="xs" />
                </form>
              </DrawerSection>
            ) : null}

            <DrawerActions>
              <Button type="button" size="xs" variant="ghost" asChild>
                <Link href="/external-contacts">Open</Link>
              </Button>
            </DrawerActions>
          </div>
        ) : null}
      </DetailDrawer>
    </>
  )
}
