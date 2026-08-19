-- Public API v1: read-only project access via a webma-issued API key,
-- authenticated with Authorization: Bearer <key> instead of a session
-- cookie. This is a real, bounded first slice of "public API + webhooks
-- platform" from docs/GAP_ANALYSIS.md's largest tier — API keys and
-- read-only endpoints, not write access, not webhooks, not a versioned
-- API surface beyond v1/projects. Sized the way GitHub sync (one-way push
-- only) and AI images (single provider) were: a real, complete, tested
-- slice, clearly not the platform-scale version.

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  -- Only ever a SHA-256 hash, never the raw key — same principle as a
  -- password column. The raw key is shown to the user exactly once, at
  -- creation time, and is unrecoverable after that (matching how GitHub,
  -- Stripe, and most real API-key systems behave — losing a key means
  -- generating a new one, not looking the old one up).
  key_hash text not null unique,
  -- First few characters of the raw key ("wm_live_a1b2...") shown
  -- alongside the name in the key-management UI, so a user can tell their
  -- keys apart without ever seeing the full secret again after creation.
  key_prefix text not null,
  last_used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);

alter table public.api_keys enable row level security;
