-- Webma baseline schema (reconstructed).
--
-- WHY THIS FILE EXISTS
-- Only two migrations existed in version control before this one, and both
-- are additive ALTER statements that assume tables like public.projects,
-- public.deployments, and public.deploy_connections already exist. The base
-- schema that created those tables was never captured in git history, which
-- means this repository could not stand up a fresh database on its own.
--
-- HOW THIS WAS BUILT
-- Reconstructed from src/lib/supabase/database.types.ts, which is the
-- generated output of `supabase gen types typescript` run against the real
-- project (see package.json's db:types script). Table names, columns,
-- nullability, foreign keys, and enum values below all come directly from
-- that generated file, so this should match the live schema's structure.
--
-- WHAT THIS FILE DOES NOT COVER (verify against the live project before relying on it)
-- 1. Row Level Security policies — TypeScript types do not encode RLS, so no
--    policies are defined here. Every table below almost certainly has RLS
--    enabled in production (the app relies on it for multi-tenant isolation).
--    Pull the real policies with:
--      supabase db dump --db-url <prod-url> --schema public -f schema_dump.sql
--    and diff them against this file before treating this as authoritative.
-- 2. Function bodies — decrement_credits, increment_credits, is_admin,
--    is_org_member, deploy_token_encrypt, and deploy_token_decrypt are
--    declared below with their real signatures (from the generated types)
--    but STUB bodies that raise an exception rather than a guessed
--    implementation. deploy_token_encrypt/decrypt in particular are
--    security-sensitive — do not fill these in from memory. Pull the real
--    definitions from the live database with:
--      select pg_get_functiondef(oid) from pg_proc where proname = '<name>';
-- 3. Triggers, grants, and storage bucket policies (e.g. for the assets
--    table's storage_path) are not captured here.
--
-- This migration is intentionally idempotent-safe to run before the two
-- existing additive migrations (both use "if not exists"), so applying all
-- three in order against a fresh database reproduces the current schema's
-- table structure. Run `supabase db diff` against a real environment to
-- confirm before trusting this for disaster recovery.

create extension if not exists pgcrypto;

-- ---------- Enums ----------
do $$ begin
  create type public.user_role as enum ('user', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.plan_type as enum ('free', 'starter', 'pro', 'business');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.sub_status as enum ('active', 'past_due', 'canceled', 'paused');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.org_role as enum ('owner', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feedback_type as enum ('bug', 'feature', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.feedback_status as enum ('open', 'reviewed', 'closed');
exception when duplicate_object then null; end $$;

-- ---------- Core tables ----------
create table if not exists public.users (
  id uuid primary key,
  email text not null,
  name text not null default '',
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null references public.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  user_id uuid not null references public.users(id),
  role public.org_role not null default 'member',
  invited_email text,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  tier_required text not null default 'free',
  thumbnail text,
  structure jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  organization_id uuid references public.organizations(id),
  template_id uuid references public.templates(id),
  name text not null,
  description text,
  status text not null default 'draft',
  archived boolean not null default false,
  current_version integer not null default 1,
  seo_title text,
  seo_description text,
  seo_og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  version integer not null,
  files jsonb not null,
  pages jsonb,
  prompt_answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  file_name text not null,
  mime_type text not null,
  size_bytes integer not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.custom_domains (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  domain text not null,
  status text not null default 'pending',
  verification_token text not null default encode(gen_random_bytes(16), 'hex'),
  provider_domain_id text,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.deploy_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  provider text not null,
  provider_account_email text,
  access_token_secret_id uuid,
  refresh_token_secret_id uuid,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id),
  provider text not null,
  provider_deployment_id text,
  status text not null default 'pending',
  deployment_url text,
  logs text,
  created_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  provider text not null default 'paddle',
  plan public.plan_type not null default 'free',
  status public.sub_status not null default 'active',
  paddle_customer_id text,
  paddle_subscription_id text,
  credits_allowance integer not null default 0,
  credits_remaining integer not null default 0,
  renews_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  paddle_transaction_id text not null,
  amount numeric(12,2) not null,
  currency text not null default 'USD',
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  project_id uuid references public.projects(id),
  action text not null,
  credits_delta integer not null,
  cache_hit boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_response_cache (
  cache_key text primary key,
  task text not null,
  response text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id),
  type public.feedback_type not null default 'other',
  status public.feedback_status not null default 'open',
  message text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id),
  actor_role text not null default 'user',
  action text not null,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ---------- Function stubs (signatures only — see header note) ----------
create or replace function public.is_admin()
returns boolean language plpgsql security definer as $$
begin
  raise exception 'is_admin() is a reconstructed stub — replace with the real definition from the live database before use';
end; $$;

create or replace function public.is_org_member(p_org_id uuid)
returns boolean language plpgsql security definer as $$
begin
  raise exception 'is_org_member() is a reconstructed stub — replace with the real definition from the live database before use';
end; $$;

create or replace function public.increment_credits(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
begin
  raise exception 'increment_credits() is a reconstructed stub — replace with the real definition from the live database before use';
end; $$;

create or replace function public.decrement_credits(p_user_id uuid, p_amount integer)
returns void language plpgsql security definer as $$
begin
  raise exception 'decrement_credits() is a reconstructed stub — replace with the real definition from the live database before use';
end; $$;

create or replace function public.deploy_token_encrypt(p_token text)
returns text language plpgsql security definer as $$
begin
  raise exception 'deploy_token_encrypt() is a reconstructed stub — this is security-sensitive, pull the real definition from the live database, do not reimplement from a guess';
end; $$;

create or replace function public.deploy_token_decrypt(p_secret_id uuid)
returns text language plpgsql security definer as $$
begin
  raise exception 'deploy_token_decrypt() is a reconstructed stub — this is security-sensitive, pull the real definition from the live database, do not reimplement from a guess';
end; $$;

-- ---------- Indexes matching current application query patterns ----------
create index if not exists projects_user_id_idx on public.projects (user_id);
create index if not exists project_versions_project_id_idx on public.project_versions (project_id);
create index if not exists assets_user_id_idx on public.assets (user_id);
create index if not exists custom_domains_project_id_idx on public.custom_domains (project_id);
create index if not exists deployments_project_id_idx on public.deployments (project_id);
create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);
create index if not exists audit_log_actor_id_idx on public.audit_log (actor_id);
create index if not exists organization_members_org_id_idx on public.organization_members (organization_id);

-- ---------- RLS enabled, no policies defined (see header note item 1) ----------
alter table public.users enable row level security;
alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.templates enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.assets enable row level security;
alter table public.custom_domains enable row level security;
alter table public.deploy_connections enable row level security;
alter table public.deployments enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.ai_response_cache enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_log enable row level security;
