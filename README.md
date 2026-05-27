# Client Servicing Command Centre (Phase 1 - Sprint 1 Foundation)

This repository contains Sprint 1 foundation for the brand-new standalone internal app for Aegis Communication Sdn Bhd.

## What Sprint 1 Includes

- Next.js 14+ App Router + TypeScript strict mode foundation
- Tailwind CSS + Shadcn/ui baseline setup
- Supabase client layers:
  - browser client (anon key)
  - server client (cookie/session)
  - server-only admin/service-role client
- Supabase Auth login/logout flow scaffold
- Protected route middleware scaffold
- Application shell:
  - fixed sidebar
  - top bar
  - global search placeholder
  - quick add placeholder
  - user profile/role placeholder
- Placeholder pages:
  - `/`
  - `/clients`
  - `/deliverables`
  - `/tasks`
  - `/approvals`
  - `/calendar`
  - `/admin/users`
- Full Supabase schema migrations for all 9 Phase 1 tables
- Conservative RLS scaffolding (deny-by-default where ownership is not safely expressible)

## What Sprint 1 Intentionally Defers

- Client module workflows
- Deliverables/task status transition engine
- Approval auto-creation/resolution engine
- Dashboard widget query logic
- Cron overdue processing
- Advanced touchpoint automation
- Full production role-policy hardening beyond Sprint 1 conservative baseline

## Prerequisites

- Node.js LTS (18.18+ or 20+ recommended)
- npm
- Supabase project
- Supabase CLI (`npm i -g supabase` or local alternative)

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env template:

```bash
cp .env.example .env.local
```

3. Fill `.env.local` values:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

4. Run dev server:

```bash
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. In Supabase Dashboard, copy:
   - Project URL
   - Anon key
   - Service role key
3. Add those values to `.env.local` and deployment environment variables.
4. Ensure Email/Password sign-in is enabled in Auth settings.

## Migration Setup

Migrations are stored in:

- `supabase/migrations/001_create_enums.sql`
- `supabase/migrations/002_create_users.sql`
- `supabase/migrations/003_create_clients.sql`
- `supabase/migrations/004_create_contacts.sql`
- `supabase/migrations/005_create_deliverables.sql`
- `supabase/migrations/006_create_tasks.sql`
- `supabase/migrations/007_create_approvals.sql`
- `supabase/migrations/008_create_client_communication_logs.sql`
- `supabase/migrations/009_create_activity_logs.sql`
- `supabase/migrations/010_create_key_dates.sql`
- `supabase/migrations/011_create_rls_policies.sql`
- `supabase/migrations/012_create_functions.sql`
- `supabase/migrations/013_seed_data.sql`

Apply via Supabase CLI in your linked project context.

Typical flow:

```bash
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

## Security Notes

- `SUPABASE_SERVICE_ROLE_KEY` is server-side only.
- Never import `lib/supabase/admin.ts` in client components.
- Normal user-facing data access should use user-context Supabase client and respect RLS.

## Scripts

- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run lint`
- `npm run typecheck`

## Dashboard Testing

Use the Sprint 4 dashboard test pack to validate counts, filters, and row links.

1. Seed dashboard test data:

```bash
psql "<your-supabase-connection-string>" -f supabase/seed_dashboard_test_data.sql
```

2. Follow manual acceptance checklist:

- `docs/testing/sprint4-dashboard-acceptance.md`

3. Remove dashboard test data:

```sql
begin;
delete from public.tasks where task_title like 'TEST Dashboard - %';
delete from public.deliverables where deliverable_name like 'TEST Dashboard - %';
delete from public.clients where client_name like 'TEST Dashboard - %';
commit;
```

Note:
- No automated dashboard E2E framework is configured yet. For now, use the manual checklist above as the lightest validation path.
