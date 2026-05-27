create table public.deliverables (
  deliverable_id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(client_id) on delete restrict,
  deliverable_name varchar(300) not null,
  category public.category_type not null,
  recurrence public.recurrence_type not null,
  due_date date not null,
  pic_id uuid not null references public.users(user_id),
  status public.deliverable_status not null,
  priority public.priority_level not null,
  requires_client_approval boolean not null,
  requires_internal_review boolean not null,
  exception_reason text,
  deferred_to_date date,
  pending_data_comm_log_id uuid,
  reviewer_id uuid references public.users(user_id),
  review_deadline date,
  review_status public.review_status,
  review_comments text,
  version_number varchar(20),
  completion_date date,
  final_file_link text,
  sent_date date,
  sent_by_id uuid references public.users(user_id),
  sent_to_name varchar(200),
  client_confirmation public.confirmation_status,
  proof_link text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_deliverables_client_id on public.deliverables(client_id);
create index idx_deliverables_pic_id on public.deliverables(pic_id);
create index idx_deliverables_status on public.deliverables(status);
create index idx_deliverables_due_date on public.deliverables(due_date);
create index idx_deliverables_category on public.deliverables(category);
create index idx_deliverables_reviewer_id on public.deliverables(reviewer_id);
