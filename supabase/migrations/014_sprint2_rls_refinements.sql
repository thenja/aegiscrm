-- Sprint 2 policy refinements for Admin Users + Client Master + Contacts.

-- Clients: allow Admin create/update in addition to Director/Team Lead.
drop policy if exists clients_insert_director_teamlead on public.clients;
drop policy if exists clients_update_director_teamlead on public.clients;
drop policy if exists clients_insert_director_teamlead_admin on public.clients;
drop policy if exists clients_update_director_teamlead_admin on public.clients;

create policy clients_insert_director_teamlead_admin
on public.clients
for insert
to authenticated
with check (public.current_app_role() in ('Director', 'Team Lead', 'Admin'));

create policy clients_update_director_teamlead_admin
on public.clients
for update
to authenticated
using (public.current_app_role() in ('Director', 'Team Lead', 'Admin'))
with check (public.current_app_role() in ('Director', 'Team Lead', 'Admin'));

-- Contacts: allow Admin writes and Team Member writes only for owned clients.
drop policy if exists contacts_write_director_teamlead on public.contacts;
drop policy if exists contacts_insert_scoped on public.contacts;
drop policy if exists contacts_update_scoped on public.contacts;
drop policy if exists contacts_delete_scoped on public.contacts;

create policy contacts_insert_scoped
on public.contacts
for insert
to authenticated
with check (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or (
    public.current_app_role() = 'Team Member'
    and exists (
      select 1
      from public.clients c
      where c.client_id = contacts.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
);

create policy contacts_update_scoped
on public.contacts
for update
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or (
    public.current_app_role() = 'Team Member'
    and exists (
      select 1
      from public.clients c
      where c.client_id = contacts.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
)
with check (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or (
    public.current_app_role() = 'Team Member'
    and exists (
      select 1
      from public.clients c
      where c.client_id = contacts.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
);

create policy contacts_delete_scoped
on public.contacts
for delete
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or (
    public.current_app_role() = 'Team Member'
    and exists (
      select 1
      from public.clients c
      where c.client_id = contacts.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
);
