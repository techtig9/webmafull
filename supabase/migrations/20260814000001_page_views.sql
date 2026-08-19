-- Basic analytics: pageviews for published/exported/deployed sites, tracked
-- via a script injected into every generated site's root layout (see
-- buildRootLayout in scaffold.ts). Public-facing (see
-- /api/public/analytics/track) — a site visitor is never authenticated with
-- webma, so this table is written to by the service-role client only.

create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  path text not null default '/',
  referrer text,
  -- Not an IP, not a persistent cookie/device id — a hash of (IP + calendar
  -- day + a server-side salt), rotating daily specifically so it can answer
  -- "how many distinct visitors today" without being usable to track one
  -- visitor's behavior across days or being reversible back to an IP.
  visitor_hash text,
  created_at timestamptz not null default now()
);

create index if not exists page_views_project_id_idx on public.page_views (project_id, created_at desc);

alter table public.page_views enable row level security;
