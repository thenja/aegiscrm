-- Sprint 8: External Contacts + People Involved many-to-many linking.

create type public.external_contact_type as enum ('Media', 'Analyst', 'Investor', 'Other');
create type public.external_involvement_purpose as enum (
  'Analyst Briefing',
  'Media Interview',
  'Press Release',
  'RSVP',
  'Follow-up',
  'Coverage',
  'Other'
);
create type public.external_involvement_status as enum (
  'Invited',
  'Confirmed',
  'Attended',
  'Scheduled',
  'Done',
  'Follow-up Needed',
  'Declined',
  'Cancelled'
);

create table public.external_contacts (
  external_contact_id uuid primary key default gen_random_uuid(),
  name varchar(200) not null,
  organisation varchar(200),
  contact_type public.external_contact_type not null default 'Other',
  designation varchar(200),
  email varchar(255),
  phone varchar(50),
  sector_beat varchar(120),
  language varchar(120),
  country_market varchar(120),
  relationship_status varchar(120),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_external_contacts_name on public.external_contacts(name);
create index idx_external_contacts_org on public.external_contacts(organisation);
create index idx_external_contacts_type on public.external_contacts(contact_type);
create index idx_external_contacts_active on public.external_contacts(is_active);

create table public.work_item_external_contacts (
  link_id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(client_id) on delete cascade,
  external_contact_id uuid not null references public.external_contacts(external_contact_id) on delete cascade,
  deliverable_id uuid references public.deliverables(deliverable_id) on delete cascade,
  task_id uuid references public.tasks(task_id) on delete cascade,
  purpose public.external_involvement_purpose not null default 'Other',
  involvement_status public.external_involvement_status not null default 'Invited',
  scheduled_date date,
  completed_date date,
  outcome text,
  notes text,
  created_by uuid not null references public.users(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_work_item_external_contacts_one_target
    check (
      (deliverable_id is not null and task_id is null)
      or (deliverable_id is null and task_id is not null)
    )
);

create index idx_work_item_external_contacts_client on public.work_item_external_contacts(client_id);
create index idx_work_item_external_contacts_external_contact on public.work_item_external_contacts(external_contact_id);
create index idx_work_item_external_contacts_deliverable on public.work_item_external_contacts(deliverable_id);
create index idx_work_item_external_contacts_task on public.work_item_external_contacts(task_id);
create index idx_work_item_external_contacts_status on public.work_item_external_contacts(involvement_status);

create unique index uq_work_item_external_contacts_deliverable_pair
on public.work_item_external_contacts(external_contact_id, deliverable_id)
where deliverable_id is not null;

create unique index uq_work_item_external_contacts_task_pair
on public.work_item_external_contacts(external_contact_id, task_id)
where task_id is not null;

create or replace function public.validate_work_item_external_contacts()
returns trigger
language plpgsql
as $$
declare
  deliverable_client_id uuid;
  task_client_id uuid;
begin
  if new.deliverable_id is not null then
    select d.client_id into deliverable_client_id
    from public.deliverables d
    where d.deliverable_id = new.deliverable_id;

    if deliverable_client_id is null then
      raise exception 'Deliverable not found for People Involved link';
    end if;

    if deliverable_client_id <> new.client_id then
      raise exception 'Deliverable client does not match People Involved client';
    end if;
  end if;

  if new.task_id is not null then
    select t.client_id into task_client_id
    from public.tasks t
    where t.task_id = new.task_id;

    if task_client_id is null then
      raise exception 'Global tasks cannot be linked to People Involved in MVP';
    end if;

    if task_client_id <> new.client_id then
      raise exception 'Task client does not match People Involved client';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_external_contacts_updated_at
before update on public.external_contacts
for each row execute function public.update_updated_at();

create trigger trg_work_item_external_contacts_updated_at
before update on public.work_item_external_contacts
for each row execute function public.update_updated_at();

create trigger trg_validate_work_item_external_contacts
before insert or update on public.work_item_external_contacts
for each row execute function public.validate_work_item_external_contacts();

alter table public.external_contacts enable row level security;
alter table public.work_item_external_contacts enable row level security;

create policy external_contacts_select_authenticated
on public.external_contacts
for select
to authenticated
using (true);

create policy external_contacts_insert_director_teamlead
on public.external_contacts
for insert
to authenticated
with check (public.current_app_role() in ('Director', 'Team Lead'));

create policy external_contacts_update_director_teamlead
on public.external_contacts
for update
to authenticated
using (public.current_app_role() in ('Director', 'Team Lead'))
with check (public.current_app_role() in ('Director', 'Team Lead'));

create policy work_item_external_contacts_select_scoped
on public.work_item_external_contacts
for select
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or exists (
    select 1
    from public.clients c
    where c.client_id = work_item_external_contacts.client_id
      and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
  )
);

create policy work_item_external_contacts_insert_scoped
on public.work_item_external_contacts
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.current_app_role() in ('Director', 'Team Lead')
    or (
      public.current_app_role() = 'Team Member'
      and (
        (
          deliverable_id is not null
          and exists (
            select 1
            from public.deliverables d
            join public.clients c on c.client_id = d.client_id
            where d.deliverable_id = work_item_external_contacts.deliverable_id
              and d.pic_id = auth.uid()
              and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
          )
        )
        or (
          task_id is not null
          and exists (
            select 1
            from public.tasks t
            join public.clients c on c.client_id = t.client_id
            where t.task_id = work_item_external_contacts.task_id
              and t.pic_id = auth.uid()
              and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
          )
        )
      )
    )
  )
);

create policy work_item_external_contacts_update_scoped
on public.work_item_external_contacts
for update
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    public.current_app_role() = 'Team Member'
    and (
      (
        deliverable_id is not null
        and exists (
          select 1
          from public.deliverables d
          join public.clients c on c.client_id = d.client_id
          where d.deliverable_id = work_item_external_contacts.deliverable_id
            and d.pic_id = auth.uid()
            and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
      or (
        task_id is not null
        and exists (
          select 1
          from public.tasks t
          join public.clients c on c.client_id = t.client_id
          where t.task_id = work_item_external_contacts.task_id
            and t.pic_id = auth.uid()
            and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
    )
  )
)
with check (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    public.current_app_role() = 'Team Member'
    and (
      (
        deliverable_id is not null
        and exists (
          select 1
          from public.deliverables d
          join public.clients c on c.client_id = d.client_id
          where d.deliverable_id = work_item_external_contacts.deliverable_id
            and d.pic_id = auth.uid()
            and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
      or (
        task_id is not null
        and exists (
          select 1
          from public.tasks t
          join public.clients c on c.client_id = t.client_id
          where t.task_id = work_item_external_contacts.task_id
            and t.pic_id = auth.uid()
            and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
    )
  )
);

create policy work_item_external_contacts_delete_scoped
on public.work_item_external_contacts
for delete
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    public.current_app_role() = 'Team Member'
    and (
      (
        deliverable_id is not null
        and exists (
          select 1
          from public.deliverables d
          join public.clients c on c.client_id = d.client_id
          where d.deliverable_id = work_item_external_contacts.deliverable_id
            and d.pic_id = auth.uid()
            and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
      or (
        task_id is not null
        and exists (
          select 1
          from public.tasks t
          join public.clients c on c.client_id = t.client_id
          where t.task_id = work_item_external_contacts.task_id
            and t.pic_id = auth.uid()
            and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
    )
  )
);
