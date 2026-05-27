drop function if exists public.kiosk_get_event(text);

create function public.kiosk_get_event(p_event_code text)
returns table (
  event_id uuid,
  client_name text,
  event_name text,
  event_date date,
  venue text,
  seating_mode text,
  status text,
  total_guests integer,
  attended_guests integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    e.event_id,
    c.client_name::text,
    e.event_name::text,
    e.event_date,
    e.venue::text,
    e.seating_mode::text,
    e.status::text,
    count(g.guest_id)::integer as total_guests,
    count(g.guest_id) filter (where g.attendance_status = 'Attended')::integer as attended_guests
  from public.events e
  join public.clients c on c.client_id = e.client_id
  left join public.event_guests g on g.event_id = e.event_id
  where upper(e.event_code) = upper(trim(p_event_code))
  group by e.event_id, c.client_name, e.event_name, e.event_date, e.venue, e.seating_mode, e.status;
end;
$$;

revoke all on function public.kiosk_get_event(text) from public;
grant execute on function public.kiosk_get_event(text) to anon, authenticated;