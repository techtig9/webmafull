-- webma.ai database schema
-- Run against a Supabase Postgres instance (SQL editor or `supabase db push`).

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================================
-- USERS  (mirrors auth.users; created via trigger on signup)
-- ============================================================================
do $$ begin create type user_role as enum ('user', 'admin'); exception when duplicate_object then null; end $$;

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null unique,
  role user_role not null default 'user',
  created_at timestamptz not null default now()
);

-- Auto-create a public.users row whenever someone signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), new.email);

  insert into public.subscriptions (user_id, plan, status, provider, credits_remaining, credits_allowance, renews_at)
  values (new.id, 'free', 'active', 'none', 3000, 3000, now() + interval '30 days');

  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================================
-- TEMPLATES
-- ============================================================================
create table public.templates (
  id uuid primary key default uuid_generate_v4(),
  category text not null,
  name text not null,
  thumbnail text,
  tier_required text not null default 'free', -- free | starter | pro | business
  structure jsonb not null default '{}',       -- section layout / seed prompt for the template
  created_at timestamptz not null default now()
);

-- ============================================================================
-- SUBSCRIPTIONS
-- ============================================================================
do $$ begin create type plan_type as enum ('free', 'starter', 'pro', 'business'); exception when duplicate_object then null; end $$;
do $$ begin create type sub_status as enum ('active', 'past_due', 'canceled', 'paused'); exception when duplicate_object then null; end $$;

create table public.subscriptions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  plan plan_type not null default 'free',
  status sub_status not null default 'active',
  provider text not null default 'none', -- 'paddle' | 'none' (admin/free)
  paddle_subscription_id text,
  paddle_customer_id text,
  credits_remaining int not null default 500,
  credits_allowance int not null default 500,
  renews_at timestamptz not null default (now() + interval '30 days'),
  updated_at timestamptz not null default now()
);

create unique index subscriptions_user_id_idx on public.subscriptions (user_id);

-- ============================================================================
-- PROJECTS  (a generated website + its versions)
-- ============================================================================
create table public.projects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  description text,
  template_id uuid references public.templates (id),
  current_version int not null default 1,
  status text not null default 'draft', -- draft | ready | deployed
  archived boolean not null default false,
  -- SEO settings (one row per project is simplest since it's always 1:1)
  seo_title text,
  seo_description text,
  seo_og_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.project_versions (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  version int not null,
  files jsonb not null, -- { "components/Hero.tsx": "...", ... }
  prompt_answers jsonb not null default '{}',
  pages jsonb,
  created_at timestamptz not null default now(),
  unique (project_id, version)
);

-- ============================================================================
-- DEPLOYMENTS
-- ============================================================================
create table public.deployments (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  provider text not null, -- 'vercel' | 'netlify'
  provider_deployment_id text,
  deployment_url text,
  status text not null default 'queued', -- queued | building | ready | error
  logs text,
  created_at timestamptz not null default now()
);

-- ============================================================================
-- PAYMENTS  (Paddle transaction log, for admin billing view)
-- ============================================================================
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  paddle_transaction_id text not null unique,
  amount numeric(10, 2) not null,
  currency text not null default 'USD',
  status text not null, -- completed | failed | refunded
  created_at timestamptz not null default now()
);

-- ============================================================================
-- CREDIT LEDGER  (audit trail behind creditsRemaining; supports refunds/caching rules)
-- ============================================================================
create table public.credit_ledger (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  action text not null,        -- matches ACTION_COSTS keys in src/lib/credits.ts
  credits_delta int not null,  -- negative for spend, positive for refund/renewal
  cache_hit boolean not null default false,
  project_id uuid references public.projects (id),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- AI RESPONSE CACHE  (Smart Caching cost-optimisation: reuse identical Gemini calls)
-- ============================================================================
create table public.ai_response_cache (
  cache_key text primary key,
  task text not null,
  response text not null,
  created_at timestamptz not null default now()
);
-- No RLS: this table never contains user-identifying data, only (task, prompt) -> output.
-- Access it exclusively through the service-role client (src/lib/gemini.ts).

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.users enable row level security;
alter table public.subscriptions enable row level security;
alter table public.projects enable row level security;
alter table public.project_versions enable row level security;
alter table public.deployments enable row level security;
alter table public.payments enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.templates enable row level security;

create policy "users read own row" on public.users
  for select using (auth.uid() = id);
create policy "users update own row" on public.users
  for update using (auth.uid() = id);

create policy "admins read all users" on public.users
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "read own subscription" on public.subscriptions
  for select using (auth.uid() = user_id);
create policy "admins read all subscriptions" on public.subscriptions
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "read own projects" on public.projects
  for all using (auth.uid() = user_id);

create policy "read own project versions" on public.project_versions
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "read own deployments" on public.deployments
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

create policy "read own payments" on public.payments
  for select using (auth.uid() = user_id);
create policy "admins read all payments" on public.payments
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

create policy "read own ledger" on public.credit_ledger
  for select using (auth.uid() = user_id);

create policy "templates are public read" on public.templates
  for select using (true);

-- ============================================================================
-- AUDIT LOG  (who did what, when — required for a launched product's trust/security posture)
-- ============================================================================
create table public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid references public.users (id) on delete set null,
  actor_role text not null default 'user', -- 'user' | 'admin' | 'system' (webhooks)
  action text not null,                    -- e.g. 'account.deleted', 'subscription.plan_overridden'
  target_id text,                          -- id of the affected row (user id, project id, etc.)
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

create policy "admins read audit log" on public.audit_log
  for select using (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );
-- Inserts happen exclusively via the service-role client (src/lib/audit.ts), which
-- bypasses RLS by design — no insert policy is needed for the regular client roles.

-- ============================================================================
-- CUSTOM DOMAINS  (per-project, count limited by plan — see PLAN_FEATURES.customDomains)
-- ============================================================================
create table public.custom_domains (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects (id) on delete cascade,
  domain text not null unique,
  status text not null default 'pending', -- pending | verifying | active | failed
  verification_token text not null default encode(gen_random_bytes(12), 'hex'),
  provider_domain_id text, -- Vercel/Netlify's own id for this domain, once attached
  created_at timestamptz not null default now(),
  verified_at timestamptz
);

alter table public.custom_domains enable row level security;

create policy "manage domains on own projects" on public.custom_domains
  for all using (
    exists (select 1 from public.projects p where p.id = project_id and p.user_id = auth.uid())
  );

-- ============================================================================
-- ORGANIZATIONS  (lightweight team support for Business-plan agencies — additive:
-- a project can optionally belong to an org; solo users are unaffected)
-- ============================================================================
do $$ begin create type org_role as enum ('owner', 'member'); exception when duplicate_object then null; end $$;

create table public.organizations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  owner_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.organization_members (
  id uuid primary key default uuid_generate_v4(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role org_role not null default 'member',
  invited_email text, -- set while the invite is pending (user_id points at the inviter until accepted)
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;

create policy "members read their orgs" on public.organizations
  for select using (
    exists (
      select 1 from public.organization_members m
      where m.organization_id = id and m.user_id = auth.uid()
    )
  );
create policy "owners manage their orgs" on public.organizations
  for update using (owner_id = auth.uid());

create policy "members read org membership" on public.organization_members
  for select using (
    exists (
      select 1 from public.organization_members m2
      where m2.organization_id = organization_id and m2.user_id = auth.uid()
    )
  );
create policy "owners manage org membership" on public.organization_members
  for all using (
    exists (
      select 1 from public.organizations o
      where o.id = organization_id and o.owner_id = auth.uid()
    )
  );

-- Now that organizations exists, projects can optionally belong to one. Nullable —
-- every existing (solo) project is unaffected.
alter table public.projects add column organization_id uuid references public.organizations (id) on delete set null;

create policy "org members read org projects" on public.projects
  for select using (
    organization_id is not null
    and exists (
      select 1 from public.organization_members m
      where m.organization_id = projects.organization_id and m.user_id = auth.uid()
    )
  );

-- ============================================================================
-- DEPLOY OAUTH CONNECTIONS  (per-user Vercel/Netlify tokens, so sites deploy under
-- the CUSTOMER's own account instead of Techtig's platform-level token)
-- ============================================================================
create table public.deploy_connections (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null, -- 'vercel' | 'netlify'
  access_token text, -- legacy plaintext field; new OAuth writes encrypted ciphertext/secret ids
  refresh_token text,
  access_token_secret_id uuid,
  refresh_token_secret_id uuid,
  access_token_ciphertext text,
  refresh_token_ciphertext text,
  expires_at timestamptz,
  provider_account_email text,
  created_at timestamptz not null default now(),
  unique (user_id, provider)
);

alter table public.deploy_connections enable row level security;

create policy "manage own deploy connections" on public.deploy_connections
  for all using (auth.uid() = user_id);

-- ============================================================================
-- ATOMIC CREDIT HELPERS  (avoid read-modify-write races under concurrent requests)
-- ============================================================================
create or replace function public.decrement_credits(p_user_id uuid, p_amount int)
returns void as $$
begin
  update public.subscriptions
  set credits_remaining = greatest(credits_remaining - p_amount, 0),
      updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

create or replace function public.increment_credits(p_user_id uuid, p_amount int)
returns void as $$
begin
  update public.subscriptions
  set credits_remaining = least(credits_remaining + p_amount, credits_allowance),
      updated_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;

-- ============================================================================
-- PERFORMANCE INDEXES  (Postgres does NOT auto-index foreign key columns — only
-- the referenced primary key side. Every one of these backs a `where col = X`
-- filter that a real API route runs, e.g. "select * from projects where user_id
-- = $1" on nearly every dashboard page load. Composite unique constraints
-- created earlier already cover their leading column — e.g.
-- unique(organization_id, user_id) on organization_members indexes
-- organization_id-only lookups for free, but NOT user_id-only lookups, hence
-- organization_members_user_id_idx below.)
-- ============================================================================
create index projects_user_id_idx on public.projects (user_id);
create index projects_organization_id_idx on public.projects (organization_id);
create index deployments_project_id_idx on public.deployments (project_id);
create index payments_user_id_idx on public.payments (user_id);
create index credit_ledger_user_id_idx on public.credit_ledger (user_id);
create index credit_ledger_project_id_idx on public.credit_ledger (project_id);
create index audit_log_actor_id_idx on public.audit_log (actor_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);
create index custom_domains_project_id_idx on public.custom_domains (project_id);
create index organization_members_user_id_idx on public.organization_members (user_id);
create index templates_category_idx on public.templates (category);

-- ============================================================================
-- SEED: template categories from the spec (one placeholder row per category)
-- ============================================================================
insert into public.templates (category, name, thumbnail, tier_required) values
  ('Business', 'Modern Business', null, 'free'),
  ('Portfolio', 'Minimal Portfolio', null, 'free'),
  ('Restaurant', 'Bistro', null, 'starter'),
  ('Travel', 'Wanderlust', null, 'starter'),
  ('Education', 'Campus', null, 'starter'),
  ('Agency', 'Studio', null, 'pro'),
  ('Startup', 'Launchpad', null, 'pro'),
  ('Healthcare', 'Wellpoint', null, 'pro'),
  ('Real Estate', 'Skyline', null, 'business');
