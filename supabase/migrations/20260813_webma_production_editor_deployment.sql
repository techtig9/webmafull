-- Webma additive production upgrade.
-- This migration is intentionally non-destructive: no existing rows, users,
-- projects, websites, files, versions, or conversations are removed/reset.

alter table public.deployments
  add column if not exists provider_deployment_id text;

create index if not exists deployments_project_created_idx
  on public.deployments (project_id, created_at desc);

create index if not exists deployments_provider_deployment_idx
  on public.deployments (provider, provider_deployment_id)
  where provider_deployment_id is not null;
