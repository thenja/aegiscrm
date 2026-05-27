# Sprint 4 Dashboard Acceptance Checklist

This checklist validates Sprint 4 dashboard counts, filters, and row links using deterministic **TEST DATA**.

## 1) Apply seed data

Run the seed SQL:

```bash
psql "<your-supabase-connection-string>" -f supabase/seed_dashboard_test_data.sql
```

Or run contents of `supabase/seed_dashboard_test_data.sql` in Supabase SQL Editor.

Seed inserts these test entities:
- Clients:
  - `TEST Dashboard - Alpha Client`
  - `TEST Dashboard - Beta Client`
  - `TEST Dashboard - Gamma Client`
- Deliverables/tasks with names prefixed by `TEST Dashboard - ...`

## 2) Login and open dashboard

1. Login with a valid app user.
2. Go to `/` dashboard.
3. Confirm all Sprint 4 sections render:
   - Summary cards
   - Overdue list
   - Due This Week list
   - Pending Items by Status
   - Team Workload by PIC
   - Client Workload Summary

## 3) Expected seeded item mapping

Seeded work items should map as follows:

- `TEST Dashboard - Due Today Deliverable`
  - Due Today, Due This Week, Open Work Items
- `TEST Dashboard - Due This Week Task`
  - Due Today (seeded to today), Due This Week, Open Work Items
- `TEST Dashboard - Overdue Deliverable`
  - Overdue, Open Work Items
- `TEST Dashboard - Pending Internal Task`
  - Pending Internal, Due Today, Due This Week, Open Work Items
- `TEST Dashboard - Pending Client Deliverable`
  - Pending Client, Due Today, Due This Week, Open Work Items
- `TEST Dashboard - Pending External Task`
  - Pending External, Due Today, Due This Week, Open Work Items
- `TEST Dashboard - Completed This Month Deliverable`
  - Completed This Month only
- `TEST Dashboard - Completed Outside This Month Task`
  - Completed only; NOT counted in Completed This Month
- `TEST Dashboard - Cancelled Deliverable`
  - Should not count as open/overdue
- `TEST Dashboard - On Hold Task`
  - Should be excluded from Due Today, Due This Week, Overdue, and Open Work Items
  - Can be surfaced by applying Status filter = `On Hold`
- `TEST Dashboard - Global Internal Task`
  - Due Today, Due This Week, Open Work Items
  - Should link to `/tasks`

## 4) Deterministic count checks (recommended)

Because existing non-test data may already exist, verify deterministic counts by filtering to each TEST client.

### A) Client = `TEST Dashboard - Alpha Client`
Expected:
- Due Today: **2**
- Due This Week: **2**
- Overdue: **1**
- Pending Internal: **0**
- Pending Client: **0**
- Pending External: **1**
- Completed This Month: **1**
- Open Work Items: **3**

### B) Client = `TEST Dashboard - Beta Client`
Expected:
- Due Today: **2**
- Due This Week: **2**
- Overdue: **0**
- Pending Internal: **1**
- Pending Client: **0**
- Pending External: **0**
- Completed This Month: **0**
- Open Work Items: **2**

### C) Client = `TEST Dashboard - Gamma Client`
Expected with current Sprint 4 logic:
- Due Today: **1**
- Due This Week: **1**
- Overdue: **0**
- Pending Internal: **0**
- Pending Client: **1**
- Pending External: **0**
- Completed This Month: **0**
- Open Work Items: **1**

Week window rule:
- `Due This Week` card and `Due This Week` list both use current SG week window (Monday to Sunday).

## 5) Filter tests

### Client filter
- Select each TEST client and verify counts match section 4.

### PIC filter
- Select one PIC and confirm only rows owned by that PIC remain.
- Team workload should rank only visible PIC rows.

### Category filter
- Use `PR`, `IR`, `Event`, `Media`, `Other` and verify matching seeded rows appear.

### Status filter
- Select statuses (e.g., `Pending Internal Review`, `Pending Client Approval`, `Completed`) and verify row sections and cards update accordingly.

### My Items Only
- Toggle `My Items Only`.
- Confirm list rows and counts are scoped to logged-in user’s `pic_id` ownership only.

## 6) Row link tests

From dashboard lists:
- Deliverable row click -> `/clients/[clientId]?tab=deliverables`
- Task row with client click -> `/clients/[clientId]?tab=tasks`
- `TEST Dashboard - Global Internal Task` row click -> `/tasks`
- Client workload row click -> `/clients/[clientId]`

## 7) Role visibility tests

Run with each role account (where available):
- Director: should see all allowed rows under RLS
- Team Lead: should see all allowed rows under RLS
- Team Member: should see own/owned scope only
- Admin: read-only visibility based on existing read access

Checks:
- Card counts differ by role scope (expected)
- No role can see rows outside RLS

## 8) Cleanup test data

Run:

```sql
begin;
delete from public.tasks where task_title like 'TEST Dashboard - %';
delete from public.deliverables where deliverable_name like 'TEST Dashboard - %';
delete from public.clients where client_name like 'TEST Dashboard - %';
commit;
```

