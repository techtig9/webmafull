-- Native form builder: stores submissions from contact/lead forms on
-- generated sites. Public-facing (see /api/public/forms/submit) — a site
-- visitor is never authenticated with webma, so this table is written to by
-- the service-role client only, never directly from a visitor's session.

create table if not exists public.form_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  page_slug text not null default 'index',
  form_name text not null default 'contact',
  data jsonb not null,
  -- Hashed, not raw — this table is readable by the project owner via a
  -- normal authenticated query, and a raw IP is more than a spam-throttling
  -- signal needs to retain about a site visitor who never agreed to
  -- anything webma-specific.
  submitter_ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists form_submissions_project_id_idx on public.form_submissions (project_id, created_at desc);

alter table public.form_submissions enable row level security;
