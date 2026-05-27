-- RLS utility role extractor
create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'role', 'Team Member')
$$;

-- Enable RLS on all tables
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.contacts enable row level security;
alter table public.deliverables enable row level security;
alter table public.tasks enable row level security;
alter table public.approvals enable row level security;
alter table public.client_communication_logs enable row level security;
alter table public.activity_logs enable row level security;
alter table public.key_dates enable row level security;

-- USERS
create policy users_select_authenticated
on public.users
for select
to authenticated
using (true);

create policy users_insert_director_admin
on public.users
for insert
to authenticated
with check (public.current_app_role() in ('Director', 'Admin'));

create policy users_update_director_admin
on public.users
for update
to authenticated
using (public.current_app_role() in ('Director', 'Admin'))
with check (public.current_app_role() in ('Director', 'Admin'));

create policy users_update_own_safe_profile
on public.users
for update
to authenticated
using (user_id = auth.uid())
with check (
  user_id = auth.uid()
  and role = (select role from public.users u where u.user_id = auth.uid())
  and is_active = (select is_active from public.users u where u.user_id = auth.uid())
);

-- CLIENTS
create policy clients_select_scoped
on public.clients
for select
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or internal_pic_id = auth.uid()
  or backup_pic_id = auth.uid()
);

create policy clients_insert_director_teamlead
on public.clients
for insert
to authenticated
with check (public.current_app_role() in ('Director', 'Team Lead'));

create policy clients_update_director_teamlead
on public.clients
for update
to authenticated
using (public.current_app_role() in ('Director', 'Team Lead'))
with check (public.current_app_role() in ('Director', 'Team Lead'));

-- CONTACTS
create policy contacts_select_by_client_access
on public.contacts
for select
to authenticated
using (
  exists (
    select 1 from public.clients c
    where c.client_id = contacts.client_id
      and (
        public.current_app_role() in ('Director', 'Team Lead', 'Admin')
        or c.internal_pic_id = auth.uid()
        or c.backup_pic_id = auth.uid()
      )
  )
);

create policy contacts_write_director_teamlead
on public.contacts
for all
to authenticated
using (public.current_app_role() in ('Director', 'Team Lead'))
with check (public.current_app_role() in ('Director', 'Team Lead'));

-- DELIVERABLES
create policy deliverables_select_scoped
on public.deliverables
for select
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or (
    pic_id = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.client_id = deliverables.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
);

create policy deliverables_insert_scoped
on public.deliverables
for insert
to authenticated
with check (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    pic_id = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.client_id = deliverables.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
);

create policy deliverables_update_scoped
on public.deliverables
for update
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    pic_id = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.client_id = deliverables.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
)
with check (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    pic_id = auth.uid()
    and exists (
      select 1 from public.clients c
      where c.client_id = deliverables.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
);

-- TASKS
create policy tasks_select_scoped
on public.tasks
for select
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or (
    pic_id = auth.uid()
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.client_id = tasks.client_id
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
    )
  )
);

create policy tasks_insert_scoped
on public.tasks
for insert
to authenticated
with check (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    pic_id = auth.uid()
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.client_id = tasks.client_id
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
    )
  )
);

create policy tasks_update_scoped
on public.tasks
for update
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    pic_id = auth.uid()
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.client_id = tasks.client_id
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
    )
  )
)
with check (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    pic_id = auth.uid()
    and (
      client_id is null
      or exists (
        select 1 from public.clients c
        where c.client_id = tasks.client_id
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
    )
  )
);

-- APPROVALS
create policy approvals_select_scoped
on public.approvals
for select
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or pic_id = auth.uid()
);

create policy approvals_update_director_teamlead
on public.approvals
for update
to authenticated
using (public.current_app_role() in ('Director', 'Team Lead'))
with check (public.current_app_role() in ('Director', 'Team Lead'));

-- COMM LOGS (insert-only after creation)
create policy comm_logs_select_by_client_access
on public.client_communication_logs
for select
to authenticated
using (
  exists (
    select 1 from public.clients c
    where c.client_id = client_communication_logs.client_id
      and (
        public.current_app_role() in ('Director', 'Team Lead', 'Admin')
        or c.internal_pic_id = auth.uid()
        or c.backup_pic_id = auth.uid()
      )
  )
);

create policy comm_logs_insert_scoped
on public.client_communication_logs
for insert
to authenticated
with check (
  logged_by = auth.uid()
  and exists (
    select 1 from public.clients c
    where c.client_id = client_communication_logs.client_id
      and (
        public.current_app_role() in ('Director', 'Team Lead')
        or c.internal_pic_id = auth.uid()
        or c.backup_pic_id = auth.uid()
      )
  )
);

-- ACTIVITY LOGS (append-only and system-managed; no user writes)
create policy activity_logs_select_by_client_access
on public.activity_logs
for select
to authenticated
using (
  client_id is null
  or exists (
    select 1 from public.clients c
    where c.client_id = activity_logs.client_id
      and (
        public.current_app_role() in ('Director', 'Team Lead', 'Admin')
        or c.internal_pic_id = auth.uid()
        or c.backup_pic_id = auth.uid()
      )
  )
);

-- KEY DATES
create policy key_dates_select_scoped
on public.key_dates
for select
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or exists (
    select 1 from public.clients c
    where c.client_id = key_dates.client_id
      and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
  )
);

create policy key_dates_insert_scoped
on public.key_dates
for insert
to authenticated
with check (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    exists (
      select 1 from public.clients c
      where c.client_id = key_dates.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
    and (pic_id is null or pic_id = auth.uid())
  )
);

create policy key_dates_update_scoped
on public.key_dates
for update
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead')
  or exists (
    select 1 from public.clients c
    where c.client_id = key_dates.client_id
      and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
  )
)
with check (
  public.current_app_role() in ('Director', 'Team Lead')
  or exists (
    select 1 from public.clients c
    where c.client_id = key_dates.client_id
      and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
  )
);

create policy key_dates_delete_director_admin
on public.key_dates
for delete
to authenticated
using (public.current_app_role() in ('Director', 'Admin'));
