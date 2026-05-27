create table public.clients (
  client_id uuid primary key default gen_random_uuid(),
  client_name varchar(200) not null,
  stock_code varchar(20),
  market public.market_type,
  sector varchar(100),
  engagement_type public.engagement_type not null,
  client_type public.client_type not null,
  status public.client_status not null,
  internal_pic_id uuid not null references public.users(user_id),
  backup_pic_id uuid references public.users(user_id),
  scope_of_work text not null,
  health_status public.health_status not null,
  servicing_frequency public.servicing_frequency not null,
  required_monthly_contacts integer not null,
  last_client_touchpoint date,
  next_scheduled_touchpoint date,
  touchpoint_overdue_days integer not null,
  contract_start date,
  contract_end date,
  monthly_fee numeric(10,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_internal_pic_id on public.clients(internal_pic_id);
create index idx_clients_backup_pic_id on public.clients(backup_pic_id);
create index idx_clients_status on public.clients(status);
create index idx_clients_client_type on public.clients(client_type);
create index idx_clients_engagement_type on public.clients(engagement_type);
