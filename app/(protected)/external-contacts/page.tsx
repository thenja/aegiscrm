import { createExternalContactAction } from "@/app/actions/external-contacts"
import { ExternalContactsListWithDrawer } from "@/components/external-contacts/external-contacts-list-with-drawer"
import { ActionFeedback } from "@/components/ui/action-feedback"
import { Button } from "@/components/ui/button"
import { ModalForm } from "@/components/ui/detail-drawer"
import { Input } from "@/components/ui/input"
import { EmptyState, FilterBar, FormSection, PageHeader, SectionCard } from "@/components/ui/patterns"
import { requireAuth } from "@/lib/auth"
import {
  listExternalContacts,
  listRelatedWorkByExternalContactIds,
} from "@/lib/data/external-contacts"
import { hasRole } from "@/lib/permissions"
import { EXTERNAL_CONTACT_TYPES } from "@/types/domain"

type SearchParams = {
  query?: string
  contact_type?: string
  is_active?: string
  external_contact_id?: string
  feedback?: string
  message?: string
  reset_create_external_contact?: string
}

export default async function ExternalContactsPage({ searchParams }: { searchParams?: SearchParams }) {
  const auth = await requireAuth()
  const canManage = hasRole(auth.profile.role, ["Director", "Team Lead"])

  const contacts = await listExternalContacts({
    query: searchParams?.query,
    contact_type: searchParams?.contact_type,
    is_active: searchParams?.is_active,
  })

  const relatedWorkByExternalContactId = await listRelatedWorkByExternalContactIds(
    contacts.map((contact) => contact.external_contact_id)
  )

  const activeFilters = Boolean(searchParams?.query || searchParams?.contact_type || searchParams?.is_active)

  return (
    <div className="space-y-4">
      <ActionFeedback feedback={searchParams?.feedback} message={searchParams?.message} />

      <PageHeader
        title="External Contacts"
        description="Track media, analysts, investors, and other external contacts involved in client work."
        action={
          canManage ? (
            <ModalForm triggerLabel="+ Add External Contact" title="Add External Contact">
              <FormSection title="External Contact Details" description="Required details first. Optional fields are available in Advanced / Optional Details.">
                <form
                  key={searchParams?.reset_create_external_contact ?? "create-external-contact-form"}
                  action={createExternalContactAction}
                  className="grid grid-cols-1 gap-3 md:grid-cols-2"
                >
                  <input type="hidden" name="return_to" value="/external-contacts" />
                  <Input name="name" placeholder="Name" required />
                  <Input name="organisation" placeholder="Organisation" />
                  <select name="contact_type" defaultValue="Other" className="h-10 rounded-md border border-border px-3 text-sm" required>
                    {EXTERNAL_CONTACT_TYPES.map((value) => (
                      <option key={value} value={value}>{value}</option>
                    ))}
                  </select>
                  <Input name="designation" placeholder="Designation" />
                  <Input name="email" type="email" placeholder="Email" />
                  <Input name="phone" placeholder="Phone" />

                  <details className="rounded-md border border-border bg-white p-3 md:col-span-2">
                    <summary className="cursor-pointer text-sm font-semibold text-navy">Advanced / Optional Details</summary>
                    <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Input name="sector_beat" placeholder="Sector / Beat" />
                      <Input name="language" placeholder="Language" />
                      <Input name="country_market" placeholder="Country / Market" />
                      <Input name="relationship_status" placeholder="Relationship Status" />
                      <textarea
                        name="notes"
                        placeholder="Notes"
                        className="min-h-[90px] rounded-md border border-border px-3 py-2 text-sm md:col-span-2"
                      />
                    </div>
                  </details>

                  <input type="hidden" name="is_active" value="true" />
                  <div className="md:col-span-2">
                    <Button type="submit">Create External Contact</Button>
                  </div>
                </form>
              </FormSection>
            </ModalForm>
          ) : null
        }
      />

      <SectionCard title="Filters" description="Search by name, organisation, or contact type.">
        <FilterBar>
          <form method="get" className="grid grid-cols-1 gap-3 md:grid-cols-4">
            <Input name="query" defaultValue={searchParams?.query ?? ""} placeholder="Search name / organisation / email / phone" />
            <select name="contact_type" defaultValue={searchParams?.contact_type ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="">All Types</option>
              {EXTERNAL_CONTACT_TYPES.map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
            <select name="is_active" defaultValue={searchParams?.is_active ?? ""} className="h-10 rounded-md border border-border px-3 text-sm">
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <div className="flex items-center gap-2">
              <Button type="submit" variant="secondary">Apply</Button>
              <Button type="button" variant="ghost" asChild>
                <a href="/external-contacts">Reset</a>
              </Button>
            </div>
          </form>
        </FilterBar>
      </SectionCard>

      <SectionCard title="External Contacts Directory" description="Use People Involved in deliverables and tasks to track participation over time.">
        {contacts.length === 0 ? (
          <EmptyState
            title={activeFilters ? "No contacts match current filters" : "No external contacts yet"}
            description={activeFilters ? "Try changing filters or search terms." : "Add an external contact to get started."}
          />
        ) : (
          <ExternalContactsListWithDrawer
            contacts={contacts}
            relatedWorkByExternalContactId={relatedWorkByExternalContactId}
            returnTo="/external-contacts"
            canManage={canManage}
            initialSelectedId={searchParams?.external_contact_id ?? null}
          />
        )}
      </SectionCard>
    </div>
  )
}
