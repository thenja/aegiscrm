-- Sprint 9: Event Attendance module (MVP).

create type public.attendance_event_type as enum (
  'IPO Prospectus Launch',
  'Bursa Listing Ceremony',
  'Analyst Briefing',
  'Media Event',
  'Other'
);

create type public.attendance_seating_mode as enum ('With Table', 'Without Table');
create type public.attendance_event_status as enum ('Draft', 'Active', 'Closed');
create type public.event_guest_category as enum ('VIP', 'Media', 'Analyst', 'Management', 'Guest', 'Staff', 'Other');
create type public.event_guest_attendance_status as enum ('Not Arrived', 'Attended');
create type public.event_guest_rsvp_status as enum ('Unknown', 'Invited', 'Confirmed', 'Declined');
create type public.event_attendance_action as enum ('Check In', 'Undo Check In', 'Edit Guest');
create type public.event_action_source as enum ('Kiosk', 'Internal');
create type public.event_import_status as enum ('Previewed', 'Imported', 'Failed', 'Cancelled');
create type public.event_duplicate_mode as enum ('Skip Duplicate', 'Import Anyway');

create table public.events (
  event_id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(client_id) on delete restrict,
  event_name varchar(300) not null,
  event_date date not null,
  venue varchar(300),
  event_type public.attendance_event_type not null default 'Other',
  seating_mode public.attendance_seating_mode not null default 'Without Table',
  event_code varchar(24) not null unique,
  status public.attendance_event_status not null default 'Draft',
  starts_at timestamptz,
  ends_at timestamptz,
  notes text,
  created_by uuid not null references public.users(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_events_client_id on public.events(client_id);
create index idx_events_event_date on public.events(event_date);
create index idx_events_status on public.events(status);
create index idx_events_event_code on public.events(event_code);

create table public.event_guests (
  guest_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(event_id) on delete cascade,
  guest_name varchar(240) not null,
  company varchar(240),
  designation varchar(240),
  category public.event_guest_category not null default 'Guest',
  email varchar(255),
  phone varchar(64),
  rsvp_status public.event_guest_rsvp_status not null default 'Unknown',
  table_no varchar(40),
  seat_no varchar(40),
  remarks text,
  attendance_status public.event_guest_attendance_status not null default 'Not Arrived',
  checked_in_at timestamptz,
  checked_in_by_nickname varchar(120),
  checked_in_session_id varchar(120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_event_guests_event_id on public.event_guests(event_id);
create index idx_event_guests_event_status on public.event_guests(event_id, attendance_status);
create index idx_event_guests_event_name on public.event_guests(event_id, guest_name);
create index idx_event_guests_event_company on public.event_guests(event_id, company);
create index idx_event_guests_event_phone on public.event_guests(event_id, phone);
create index idx_event_guests_event_email on public.event_guests(event_id, email);
create index idx_event_guests_event_category on public.event_guests(event_id, category);
create index idx_event_guests_event_table on public.event_guests(event_id, table_no);
create index idx_event_guests_duplicate_name_company
  on public.event_guests(event_id, lower(guest_name), lower(coalesce(company, '')));

create table public.event_attendance_logs (
  attendance_log_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(event_id) on delete cascade,
  guest_id uuid not null references public.event_guests(guest_id) on delete cascade,
  action public.event_attendance_action not null,
  staff_nickname varchar(120) not null,
  acted_by_user_id uuid references public.users(user_id),
  acted_at timestamptz not null default now(),
  notes text,
  session_id varchar(120),
  device_info text,
  source public.event_action_source not null
);

create index idx_event_attendance_logs_event_id on public.event_attendance_logs(event_id);
create index idx_event_attendance_logs_guest_id on public.event_attendance_logs(guest_id);
create index idx_event_attendance_logs_acted_at on public.event_attendance_logs(acted_at desc);

create table public.event_import_batches (
  import_batch_id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(event_id) on delete cascade,
  uploaded_by uuid not null references public.users(user_id),
  file_name varchar(260) not null,
  status public.event_import_status not null,
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  duplicate_rows integer not null default 0,
  imported_rows integer not null default 0,
  skipped_rows integer not null default 0,
  duplicate_mode public.event_duplicate_mode,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_event_import_batches_event_id on public.event_import_batches(event_id);
create index idx_event_import_batches_uploaded_by on public.event_import_batches(uploaded_by);
create index idx_event_import_batches_created_at on public.event_import_batches(created_at desc);

create trigger trg_events_updated_at
before update on public.events
for each row execute function public.update_updated_at();

create trigger trg_event_guests_updated_at
before update on public.event_guests
for each row execute function public.update_updated_at();

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel pr
    join pg_class c on c.oid = pr.prrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_publication p on p.oid = pr.prpubid
    where p.pubname = 'supabase_realtime'
      and n.nspname = 'public'
      and c.relname = 'event_guests'
  ) then
    alter publication supabase_realtime add table public.event_guests;
  end if;
end
$$;

create or replace function public.kiosk_get_event(p_event_code text)
returns table (
  event_id uuid,
  event_name text,
  event_date date,
  venue text,
  seating_mode text,
  status text,
  total_guests integer,
  attended_guests integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    e.event_id,
    e.event_name::text,
    e.event_date,
    e.venue::text,
    e.seating_mode::text,
    e.status::text,
    count(g.guest_id)::integer as total_guests,
    count(g.guest_id) filter (where g.attendance_status = 'Attended')::integer as attended_guests
  from public.events e
  left join public.event_guests g on g.event_id = e.event_id
  where upper(e.event_code) = upper(trim(p_event_code))
  group by e.event_id, e.event_name, e.event_date, e.venue, e.seating_mode, e.status;
end;
$$;

create or replace function public.kiosk_search_guests(
  p_event_code text,
  p_query text,
  p_limit integer default 30
)
returns table (
  guest_id uuid,
  event_id uuid,
  guest_name text,
  company text,
  designation text,
  category text,
  table_no text,
  attendance_status text,
  checked_in_at timestamptz,
  checked_in_by_nickname text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_query text;
  v_limit integer;
begin
  select e.event_id
    into v_event_id
  from public.events e
  where upper(e.event_code) = upper(trim(p_event_code))
    and e.status = 'Active';

  if v_event_id is null then
    return;
  end if;

  v_query := trim(coalesce(p_query, ''));
  v_limit := least(greatest(coalesce(p_limit, 30), 1), 100);

  if v_query = '' then
    return query
    select
      g.guest_id,
      g.event_id,
      g.guest_name::text,
      g.company::text,
      g.designation::text,
      g.category::text,
      g.table_no::text,
      g.attendance_status::text,
      g.checked_in_at,
      g.checked_in_by_nickname::text
    from public.event_guests g
    where g.event_id = v_event_id
    order by
      case when g.attendance_status = 'Not Arrived' then 0 else 1 end,
      g.guest_name asc
    limit v_limit;
    return;
  end if;

  return query
  select
    g.guest_id,
    g.event_id,
    g.guest_name::text,
    g.company::text,
    g.designation::text,
    g.category::text,
    g.table_no::text,
    g.attendance_status::text,
    g.checked_in_at,
    g.checked_in_by_nickname::text
  from public.event_guests g
  where g.event_id = v_event_id
    and (
      g.guest_name ilike '%' || v_query || '%'
      or coalesce(g.company, '') ilike '%' || v_query || '%'
      or coalesce(g.phone, '') ilike '%' || v_query || '%'
      or coalesce(g.table_no, '') ilike '%' || v_query || '%'
      or g.category::text ilike '%' || v_query || '%'
    )
  order by
    case when g.attendance_status = 'Not Arrived' then 0 else 1 end,
    g.guest_name asc
  limit v_limit;
end;
$$;

create or replace function public.kiosk_check_in_guest(
  p_event_code text,
  p_staff_nickname text,
  p_guest_id uuid,
  p_session_id text default null,
  p_device_info text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
  v_event_status public.attendance_event_status;
  v_guest record;
  v_now timestamptz;
begin
  if trim(coalesce(p_staff_nickname, '')) = '' then
    return jsonb_build_object('ok', false, 'code', 'NICKNAME_REQUIRED', 'message', 'Staff nickname is required.');
  end if;

  select e.event_id, e.status
    into v_event_id, v_event_status
  from public.events e
  where upper(e.event_code) = upper(trim(p_event_code));

  if v_event_id is null then
    return jsonb_build_object('ok', false, 'code', 'EVENT_NOT_FOUND', 'message', 'Event code not found.');
  end if;

  if v_event_status <> 'Active' then
    return jsonb_build_object('ok', false, 'code', 'EVENT_NOT_ACTIVE', 'message', 'This event is not active for check-in.');
  end if;

  select g.*
    into v_guest
  from public.event_guests g
  where g.guest_id = p_guest_id
    and g.event_id = v_event_id;

  if not found then
    return jsonb_build_object('ok', false, 'code', 'GUEST_NOT_FOUND', 'message', 'Guest not found for this event.');
  end if;

  v_now := now();

  update public.event_guests g
  set
    attendance_status = 'Attended',
    checked_in_at = v_now,
    checked_in_by_nickname = trim(p_staff_nickname),
    checked_in_session_id = nullif(trim(coalesce(p_session_id, '')), '')
  where g.guest_id = p_guest_id
    and g.event_id = v_event_id
    and g.attendance_status = 'Not Arrived';

  if found then
    insert into public.event_attendance_logs (
      event_id,
      guest_id,
      action,
      staff_nickname,
      acted_by_user_id,
      acted_at,
      notes,
      session_id,
      device_info,
      source
    ) values (
      v_event_id,
      p_guest_id,
      'Check In',
      trim(p_staff_nickname),
      null,
      v_now,
      null,
      nullif(trim(coalesce(p_session_id, '')), ''),
      nullif(trim(coalesce(p_device_info, '')), ''),
      'Kiosk'
    );

    return jsonb_build_object(
      'ok', true,
      'code', 'CHECKED_IN',
      'message', 'Guest checked in successfully.',
      'checked_in_at', v_now,
      'checked_in_by_nickname', trim(p_staff_nickname)
    );
  end if;

  select g.checked_in_at, g.checked_in_by_nickname
    into v_guest
  from public.event_guests g
  where g.guest_id = p_guest_id
    and g.event_id = v_event_id;

  return jsonb_build_object(
    'ok', false,
    'code', 'ALREADY_CHECKED_IN',
    'message', 'Already checked in.',
    'checked_in_at', v_guest.checked_in_at,
    'checked_in_by_nickname', v_guest.checked_in_by_nickname
  );
end;
$$;

revoke all on function public.kiosk_get_event(text) from public;
revoke all on function public.kiosk_search_guests(text, text, integer) from public;
revoke all on function public.kiosk_check_in_guest(text, text, uuid, text, text) from public;

grant execute on function public.kiosk_get_event(text) to anon, authenticated;
grant execute on function public.kiosk_search_guests(text, text, integer) to anon, authenticated;
grant execute on function public.kiosk_check_in_guest(text, text, uuid, text, text) to anon, authenticated;

alter table public.events enable row level security;
alter table public.event_guests enable row level security;
alter table public.event_attendance_logs enable row level security;
alter table public.event_import_batches enable row level security;

create policy events_select_scoped
on public.events
for select
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead', 'Admin')
  or exists (
    select 1
    from public.clients c
    where c.client_id = events.client_id
      and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
  )
);

create policy events_insert_scoped
on public.events
for insert
to authenticated
with check (
  created_by = auth.uid()
  and (
    public.current_app_role() in ('Director', 'Team Lead')
    or (
      public.current_app_role() = 'Team Member'
      and exists (
        select 1
        from public.clients c
        where c.client_id = events.client_id
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
    )
  )
);

create policy events_update_scoped
on public.events
for update
to authenticated
using (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    public.current_app_role() = 'Team Member'
    and exists (
      select 1
      from public.clients c
      where c.client_id = events.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
)
with check (
  public.current_app_role() in ('Director', 'Team Lead')
  or (
    public.current_app_role() = 'Team Member'
    and exists (
      select 1
      from public.clients c
      where c.client_id = events.client_id
        and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
    )
  )
);

create policy event_guests_select_scoped
on public.event_guests
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_guests.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead', 'Admin')
        or (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
  )
);

create policy event_guests_insert_scoped
on public.event_guests
for insert
to authenticated
with check (
  exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_guests.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead')
        or (
          public.current_app_role() = 'Team Member'
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
  )
);

create policy event_guests_update_scoped
on public.event_guests
for update
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_guests.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead')
        or (
          public.current_app_role() = 'Team Member'
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
  )
)
with check (
  exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_guests.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead')
        or (
          public.current_app_role() = 'Team Member'
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
  )
);

create policy event_guests_delete_scoped
on public.event_guests
for delete
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_guests.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead')
        or (
          public.current_app_role() = 'Team Member'
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
  )
);

create policy event_attendance_logs_select_scoped
on public.event_attendance_logs
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_attendance_logs.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead', 'Admin')
        or (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
  )
);

create policy event_attendance_logs_insert_internal
on public.event_attendance_logs
for insert
to authenticated
with check (
  source = 'Internal'
  and staff_nickname <> ''
  and acted_by_user_id = auth.uid()
  and exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_attendance_logs.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead')
        or (
          public.current_app_role() = 'Team Member'
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
  )
);

create policy event_import_batches_select_scoped
on public.event_import_batches
for select
to authenticated
using (
  exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_import_batches.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead', 'Admin')
        or (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
  )
);

create policy event_import_batches_insert_scoped
on public.event_import_batches
for insert
to authenticated
with check (
  uploaded_by = auth.uid()
  and exists (
    select 1
    from public.events e
    join public.clients c on c.client_id = e.client_id
    where e.event_id = event_import_batches.event_id
      and (
        public.current_app_role() in ('Director', 'Team Lead')
        or (
          public.current_app_role() = 'Team Member'
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
        )
      )
  )
);

create policy event_import_batches_update_scoped
on public.event_import_batches
for update
to authenticated
using (
  uploaded_by = auth.uid()
  or public.current_app_role() in ('Director', 'Team Lead')
)
with check (
  uploaded_by = auth.uid()
  or public.current_app_role() in ('Director', 'Team Lead')
);
