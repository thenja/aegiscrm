create table public.key_dates (
  key_date_id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(client_id) on delete cascade,
  date date not null,
  event_type public.event_type not null,
  description varchar(300) not null,
  pic_id uuid references public.users(user_id),
  preparation_status public.prep_status,
  reminder_days_before integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_key_dates_client_id on public.key_dates(client_id);
create index idx_key_dates_date on public.key_dates(date);
create index idx_key_dates_pic_id on public.key_dates(pic_id);
create index idx_key_dates_preparation_status on public.key_dates(preparation_status);
