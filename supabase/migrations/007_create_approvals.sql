create table public.approvals (
  approval_id uuid primary key default gen_random_uuid(),
  reference_type public.approval_reference_type not null,
  reference_id uuid not null,
  client_id uuid not null references public.clients(client_id) on delete restrict,
  approval_type public.approval_type not null,
  sent_to_name varchar(200) not null,
  sent_to_email varchar(200),
  date_sent timestamptz not null,
  follow_up_count integer not null default 0,
  last_follow_up_date date,
  pending_reason text,
  dependency text,
  follow_up_tone public.follow_up_tone,
  escalation_needed boolean,
  escalation_reason text,
  follow_up_remarks text,
  pic_id uuid not null references public.users(user_id),
  status public.approval_status not null,
  resolution_date date,
  resolution_notes text,
  created_at timestamptz not null default now()
);

create index idx_approvals_client_id on public.approvals(client_id);
create index idx_approvals_pic_id on public.approvals(pic_id);
create index idx_approvals_status on public.approvals(status);
create index idx_approvals_date_sent on public.approvals(date_sent);
create index idx_approvals_reference on public.approvals(reference_type, reference_id);
