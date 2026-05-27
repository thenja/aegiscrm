create table public.tasks (
  task_id uuid primary key default gen_random_uuid(),
  client_id uuid references public.clients(client_id) on delete set null,
  task_title varchar(300) not null,
  description text,
  requester varchar(200),
  pic_id uuid not null references public.users(user_id),
  priority public.priority_level not null,
  due_date date not null,
  status public.task_status not null,
  category public.category_type,
  requires_client_approval boolean not null,
  requires_internal_review boolean not null,
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
  attachments text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tasks_client_id on public.tasks(client_id);
create index idx_tasks_pic_id on public.tasks(pic_id);
create index idx_tasks_status on public.tasks(status);
create index idx_tasks_due_date on public.tasks(due_date);
create index idx_tasks_priority on public.tasks(priority);
create index idx_tasks_reviewer_id on public.tasks(reviewer_id);
