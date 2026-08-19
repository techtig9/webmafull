-- Webma additive production upgrade (2026-08-13)
-- SAFE TO RUN AGAINST AN EXISTING DATABASE.
-- This migration only adds nullable/defaulted fields, indexes, and helper
-- indexes and compatibility fields. It never drops, truncates, or resets user/project/site data.

alter table public.projects
  add column if not exists archived boolean not null default false;

alter table public.project_versions
  add column if not exists pages jsonb;

-- OAuth tokens are stored encrypted by the application when a deployment
-- encryption key is configured. Existing Vault secret-id columns are preserved
-- for installations that already use Supabase Vault.
alter table public.deploy_connections
  add column if not exists access_token_secret_id uuid,
  add column if not exists refresh_token_secret_id uuid,
  add column if not exists access_token_ciphertext text,
  add column if not exists refresh_token_ciphertext text;

create index if not exists projects_user_id_updated_at_idx
  on public.projects (user_id, updated_at desc);

create index if not exists project_versions_project_created_idx
  on public.project_versions (project_id, created_at desc);

create index if not exists deployments_project_created_idx
  on public.deployments (project_id, created_at desc);

-- Existing rows are intentionally untouched.
