create table public.client_communication_logs (
  comm_log_id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(client_id) on delete cascade,
  comm_date timestamptz not null,
  channel public.comm_channel not null,
  summary text not null,
  counterpart_name varchar(200) not null,
  counterpart_designation varchar(200),
  direction public.comm_direction not null,
  logged_by uuid not null references public.users(user_id),
  reference_type public.comm_reference_type,
  reference_id uuid,
  attachments text,
  created_at timestamptz not null default now()
);

alter table public.deliverables
  add constraint fk_deliverables_pending_data_comm_log
  foreign key (pending_data_comm_log_id)
  references public.client_communication_logs(comm_log_id)
  on delete set null;

create index idx_comm_logs_client_id on public.client_communication_logs(client_id);
create index idx_comm_logs_logged_by on public.client_communication_logs(logged_by);
create index idx_comm_logs_comm_date on public.client_communication_logs(comm_date desc);
