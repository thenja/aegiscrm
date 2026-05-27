create table public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name varchar(200) not null,
  email varchar(200) not null unique,
  role public.user_role not null default 'Team Member',
  department varchar(100),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_users_role on public.users(role);
create index idx_users_is_active on public.users(is_active);
