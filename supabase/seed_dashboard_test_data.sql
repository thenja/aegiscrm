-- ============================================================================
-- TEST DATA ONLY: Sprint 4 Dashboard Test Pack
-- File: supabase/seed_dashboard_test_data.sql
--
-- Purpose:
-- Seed deterministic test rows for dashboard count/filter/link verification.
--
-- Safety:
-- 1) Deletes only rows with names prefixed by 'TEST Dashboard - '.
-- 2) Does not touch non-test data.
-- 3) Requires at least one active user in public.users for PIC assignment.
--
-- Usage:
--   psql "<connection_string>" -f supabase/seed_dashboard_test_data.sql
--
-- Cleanup-only snippet is provided at the bottom of this file.
-- ============================================================================

begin;

-- --------------------------------------------------------------------------
-- Cleanup previous Dashboard TEST DATA (idempotent reseed)
-- --------------------------------------------------------------------------
delete from public.tasks where task_title like 'TEST Dashboard - %';
delete from public.deliverables where deliverable_name like 'TEST Dashboard - %';
delete from public.clients where client_name like 'TEST Dashboard - %';

-- Ensure there is at least one active user to own seeded records.
do $$
declare
  v_active_users integer;
begin
  select count(*) into v_active_users from public.users where is_active = true;
  if v_active_users = 0 then
    raise exception 'Dashboard test seed requires at least one active user in public.users.';
  end if;
end
$$;

with active_users as (
  select user_id
  from public.users
  where is_active = true
  order by full_name
),
picked_users as (
  select
    (select user_id from active_users offset 0 limit 1) as pic_1,
    coalesce(
      (select user_id from active_users offset 1 limit 1),
      (select user_id from active_users offset 0 limit 1)
    ) as pic_2
),
date_vars as (
  select
    (now() at time zone 'Asia/Singapore')::date as today_sg,
    ((now() at time zone 'Asia/Singapore')::date - ((extract(isodow from (now() at time zone 'Asia/Singapore')::date)::int) - 1))::date as week_start_sg,
    (date_trunc('month', (now() at time zone 'Asia/Singapore')::date::timestamp) - interval '1 day')::date as prev_month_last_day
),
insert_clients as (
  insert into public.clients (
    client_id,
    client_name,
    stock_code,
    market,
    sector,
    engagement_type,
    client_type,
    status,
    internal_pic_id,
    backup_pic_id,
    scope_of_work,
    health_status,
    servicing_frequency,
    required_monthly_contacts,
    last_client_touchpoint,
    next_scheduled_touchpoint,
    touchpoint_overdue_days,
    contract_start,
    contract_end,
    monthly_fee,
    notes
  )
  select
    'a1111111-1111-4111-8111-111111111111'::uuid,
    'TEST Dashboard - Alpha Client'::text,
    'TDA'::text,
    'Main'::market_type,
    'Test Sector'::text,
    'Retainer'::engagement_type,
    'Monthly PR Retainer'::client_type,
    'Active'::client_status,
    pu.pic_1,
    pu.pic_2,
    'TEST DATA: Dashboard verification scope.'::text,
    'Healthy'::health_status,
    'Weekly'::servicing_frequency,
    4::integer,
    (dv.today_sg - 3)::date,
    (dv.today_sg + 7)::date,
    7::integer,
    (dv.today_sg - 30)::date,
    (dv.today_sg + 335)::date,
    10000.00::numeric,
    'TEST DATA ONLY'::text
  from picked_users pu, date_vars dv

  union all

  select
    'b2222222-2222-4222-8222-222222222222'::uuid,
    'TEST Dashboard - Beta Client'::text,
    'TDB'::text,
    'ACE'::market_type,
    'Test Sector'::text,
    'Retainer'::engagement_type,
    'Listed Company Retainer'::client_type,
    'Active'::client_status,
    pu.pic_2,
    pu.pic_1,
    'TEST DATA: Dashboard verification scope.'::text,
    'At Risk'::health_status,
    'Weekly'::servicing_frequency,
    4::integer,
    (dv.today_sg - 5)::date,
    (dv.today_sg + 5)::date,
    7::integer,
    (dv.today_sg - 60)::date,
    (dv.today_sg + 300)::date,
    12000.00::numeric,
    'TEST DATA ONLY'::text
  from picked_users pu, date_vars dv

  union all

  select
    'c3333333-3333-4333-8333-333333333333'::uuid,
    'TEST Dashboard - Gamma Client'::text,
    'TDG'::text,
    'LEAP'::market_type,
    'Test Sector'::text,
    'Retainer'::engagement_type,
    'Project-Only Client'::client_type,
    'Active'::client_status,
    pu.pic_1,
    pu.pic_2,
    'TEST DATA: Dashboard verification scope.'::text,
    'Critical'::health_status,
    'As Needed'::servicing_frequency,
    2::integer,
    (dv.today_sg - 10)::date,
    (dv.today_sg + 3)::date,
    7::integer,
    (dv.today_sg - 90)::date,
    (dv.today_sg + 270)::date,
    9000.00::numeric,
    'TEST DATA ONLY'::text
  from picked_users pu, date_vars dv
  returning client_id
)
insert into public.deliverables (
  deliverable_id,
  client_id,
  deliverable_name,
  category,
  recurrence,
  due_date,
  pic_id,
  status,
  priority,
  requires_client_approval,
  requires_internal_review,
  completion_date,
  notes
)
select
  'd1111111-1111-4111-8111-111111111111'::uuid,
  'a1111111-1111-4111-8111-111111111111'::uuid,
  'TEST Dashboard - Due Today Deliverable'::text,
  'PR'::category_type,
  'Monthly'::recurrence_type,
  dv.today_sg::date,
  pu.pic_1,
  'In Progress'::deliverable_status,
  'High'::priority_level,
  false::boolean,
  false::boolean,
  null::date,
  'TEST DATA: Due Today'::text
from picked_users pu, date_vars dv

union all

select
  'd2222222-2222-4222-8222-222222222222'::uuid,
  'a1111111-1111-4111-8111-111111111111'::uuid,
  'TEST Dashboard - Overdue Deliverable'::text,
  'Event'::category_type,
  'Monthly'::recurrence_type,
  (dv.today_sg - 10)::date,
  pu.pic_1,
  'In Progress'::deliverable_status,
  'Critical'::priority_level,
  false::boolean,
  false::boolean,
  null::date,
  'TEST DATA: Overdue'::text
from picked_users pu, date_vars dv

union all

select
  'd3333333-3333-4333-8333-333333333333'::uuid,
  'c3333333-3333-4333-8333-333333333333'::uuid,
  'TEST Dashboard - Pending Client Deliverable'::text,
  'IR'::category_type,
  'Monthly'::recurrence_type,
  dv.today_sg::date,
  pu.pic_2,
  'Pending Client Approval'::deliverable_status,
  'Medium'::priority_level,
  true::boolean,
  false::boolean,
  null::date,
  'TEST DATA: Pending Client'::text
from picked_users pu, date_vars dv

union all

select
  'd4444444-4444-4444-8444-444444444444'::uuid,
  'a1111111-1111-4111-8111-111111111111'::uuid,
  'TEST Dashboard - Completed This Month Deliverable'::text,
  'PR'::category_type,
  'Monthly'::recurrence_type,
  (dv.today_sg - 7)::date,
  pu.pic_1,
  'Completed'::deliverable_status,
  'Low'::priority_level,
  false::boolean,
  false::boolean,
  dv.today_sg::date,
  'TEST DATA: Completed This Month'::text
from picked_users pu, date_vars dv

union all

select
  'd5555555-5555-4555-8555-555555555555'::uuid,
  'c3333333-3333-4333-8333-333333333333'::uuid,
  'TEST Dashboard - Cancelled Deliverable'::text,
  'Event'::category_type,
  'Monthly'::recurrence_type,
  (dv.today_sg - 5)::date,
  pu.pic_1,
  'Cancelled'::deliverable_status,
  'Low'::priority_level,
  false::boolean,
  false::boolean,
  null::date,
  'TEST DATA: Cancelled'::text
from picked_users pu, date_vars dv;

with active_users as (
  select user_id
  from public.users
  where is_active = true
  order by full_name
),
picked_users as (
  select
    (select user_id from active_users offset 0 limit 1) as pic_1,
    coalesce(
      (select user_id from active_users offset 1 limit 1),
      (select user_id from active_users offset 0 limit 1)
    ) as pic_2
),
date_vars as (
  select
    (now() at time zone 'Asia/Singapore')::date as today_sg,
    ((now() at time zone 'Asia/Singapore')::date - ((extract(isodow from (now() at time zone 'Asia/Singapore')::date)::int) - 1))::date as week_start_sg,
    (date_trunc('month', (now() at time zone 'Asia/Singapore')::date::timestamp) - interval '1 day')::date as prev_month_last_day
)
insert into public.tasks (
  task_id,
  client_id,
  task_title,
  description,
  pic_id,
  priority,
  due_date,
  status,
  category,
  requires_client_approval,
  requires_internal_review,
  completion_date
)
select
  'e1111111-1111-4111-8111-111111111111'::uuid,
  'b2222222-2222-4222-8222-222222222222'::uuid,
  'TEST Dashboard - Due This Week Task'::text,
  'TEST DATA: Due This Week'::text,
  pu.pic_2,
  'High'::priority_level,
  dv.today_sg::date,
  'In Progress'::task_status,
  'IR'::category_type,
  false::boolean,
  false::boolean,
  null::date
from picked_users pu, date_vars dv

union all

select
  'e2222222-2222-4222-8222-222222222222'::uuid,
  'b2222222-2222-4222-8222-222222222222'::uuid,
  'TEST Dashboard - Pending Internal Task'::text,
  'TEST DATA: Pending Internal'::text,
  pu.pic_1,
  'Medium'::priority_level,
  dv.today_sg::date,
  'Pending Internal Review'::task_status,
  'PR'::category_type,
  false::boolean,
  true::boolean,
  null::date
from picked_users pu, date_vars dv

union all

select
  'e3333333-3333-4333-8333-333333333333'::uuid,
  'a1111111-1111-4111-8111-111111111111'::uuid,
  'TEST Dashboard - Pending External Task'::text,
  'TEST DATA: Pending External'::text,
  pu.pic_1,
  'Medium'::priority_level,
  dv.today_sg::date,
  'Pending External Party'::task_status,
  'Media'::category_type,
  false::boolean,
  false::boolean,
  null::date
from picked_users pu, date_vars dv

union all

select
  'e4444444-4444-4444-8444-444444444444'::uuid,
  'b2222222-2222-4222-8222-222222222222'::uuid,
  'TEST Dashboard - Completed Outside This Month Task'::text,
  'TEST DATA: Completed Outside This Month'::text,
  pu.pic_2,
  'Low'::priority_level,
  dv.prev_month_last_day::date,
  'Completed'::task_status,
  'IR'::category_type,
  false::boolean,
  false::boolean,
  dv.prev_month_last_day::date
from picked_users pu, date_vars dv

union all

select
  'e5555555-5555-4555-8555-555555555555'::uuid,
  'c3333333-3333-4333-8333-333333333333'::uuid,
  'TEST Dashboard - On Hold Task'::text,
  'TEST DATA: On Hold'::text,
  pu.pic_2,
  'Low'::priority_level,
  (dv.today_sg - 10)::date,
  'On Hold'::task_status,
  'PR'::category_type,
  false::boolean,
  false::boolean,
  null::date
from picked_users pu, date_vars dv

union all

select
  'e6666666-6666-4666-8666-666666666666'::uuid,
  null::uuid,
  'TEST Dashboard - Global Internal Task'::text,
  'TEST DATA: Global Internal (no client_id)'::text,
  pu.pic_1,
  'High'::priority_level,
  dv.today_sg::date,
  'In Progress'::task_status,
  'Other'::category_type,
  false::boolean,
  false::boolean,
  null::date
from picked_users pu, date_vars dv;

commit;

-- ============================================================================
-- Cleanup-only SQL (manual use)
-- ============================================================================
-- begin;
-- delete from public.tasks where task_title like 'TEST Dashboard - %';
-- delete from public.deliverables where deliverable_name like 'TEST Dashboard - %';
-- delete from public.clients where client_name like 'TEST Dashboard - %';
-- commit;
