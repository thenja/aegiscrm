-- Generic updated_at trigger
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_users_updated_at
before update on public.users
for each row execute function public.update_updated_at();

create trigger trg_clients_updated_at
before update on public.clients
for each row execute function public.update_updated_at();

create trigger trg_deliverables_updated_at
before update on public.deliverables
for each row execute function public.update_updated_at();

create trigger trg_tasks_updated_at
before update on public.tasks
for each row execute function public.update_updated_at();

create trigger trg_key_dates_updated_at
before update on public.key_dates
for each row execute function public.update_updated_at();

-- Keep role claim in app metadata for RLS role checks.
create or replace function public.set_user_role_app_metadata()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update auth.users
  set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new.role::text)
  where id = new.user_id;
  return new;
end;
$$;

create trigger trg_users_set_role_on_insert
after insert on public.users
for each row execute function public.set_user_role_app_metadata();

create trigger trg_users_set_role_on_update
after update of role on public.users
for each row execute function public.set_user_role_app_metadata();
