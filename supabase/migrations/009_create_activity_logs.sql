create table public.activity_logs (
  log_id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(client_id) on delete set null,
  activity_date timestamptz not null,
  activity_type public.activity_type not null,
  description text not null,
  triggered_by uuid not null references public.users(user_id),
  reference_type public.activity_ref_type,
  reference_id uuid,
  is_auto boolean not null default true,
  created_at timestamptz not null default now()
);

create index idx_activity_logs_client_activity_date on public.activity_logs(client_id, activity_date desc);
create index idx_activity_logs_triggered_by on public.activity_logs(triggered_by);
create index idx_activity_logs_activity_type on public.activity_logs(activity_type);
