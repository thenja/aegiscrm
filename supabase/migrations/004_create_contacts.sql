create table public.contacts (
  contact_id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(client_id) on delete cascade,
  contact_name varchar(200) not null,
  designation varchar(200),
  email varchar(200),
  phone varchar(50),
  contact_type public.contact_type not null,
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now()
);

create index idx_contacts_client_id on public.contacts(client_id);
create index idx_contacts_contact_type on public.contacts(contact_type);
