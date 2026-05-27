-- Sprint 5: communication log permissions and client touchpoint sync.

drop policy if exists comm_logs_insert_scoped on public.client_communication_logs;

create policy comm_logs_insert_scoped
on public.client_communication_logs
for insert
to authenticated
with check (
  logged_by = auth.uid()
  and (
    public.current_app_role() in ('Director', 'Team Lead')
    or (
      public.current_app_role() = 'Team Member'
      and exists (
        select 1
        from public.clients c
        where c.client_id = client_communication_logs.client_id
          and (c.internal_pic_id = auth.uid() or c.backup_pic_id = auth.uid())
      )
    )
  )
);

create or replace function public.sync_client_last_touchpoint_from_comm_logs()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  comm_date_sg date;
begin
  comm_date_sg := (new.comm_date at time zone 'Asia/Singapore')::date;

  update public.clients
  set last_client_touchpoint = greatest(coalesce(last_client_touchpoint, comm_date_sg), comm_date_sg)
  where client_id = new.client_id;

  return new;
end;
$$;

drop trigger if exists trg_comm_logs_sync_client_touchpoint on public.client_communication_logs;

create trigger trg_comm_logs_sync_client_touchpoint
after insert on public.client_communication_logs
for each row execute function public.sync_client_last_touchpoint_from_comm_logs();
