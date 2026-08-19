-- database.types.ts (the source the baseline migration was reconstructed
-- from) captures column names and types, but never constraints — UNIQUE,
-- CHECK, EXCLUSION are all invisible to it. Found two real gaps by grepping
-- the existing application code for .upsert(..., { onConflict: ... }) calls
-- and checking whether the baseline actually created a matching constraint:
-- both of these were missing, meaning the *existing* Vercel OAuth callback
-- and Paddle webhook handler have been relying on upsert behavior the
-- reconstructed schema didn't actually support.
--
-- deploy_connections (user_id, provider): without this, connecting the same
-- provider twice (e.g. reconnecting Vercel, or this phase's new GitHub
-- connection) would either error outright or — depending on the exact
-- Postgres/PostgREST version — silently insert a second row instead of
-- updating the first, leaving a stale connection behind.
--
-- payments (paddle_transaction_id): without this, a webhook retry from
-- Paddle (which happens routinely — webhooks are retried on any non-2xx
-- response, and are not guaranteed to be delivered exactly once) would
-- insert a duplicate payment record instead of updating the existing one,
-- corrupting anything that sums payments for revenue reporting.

alter table public.deploy_connections
  add constraint deploy_connections_user_provider_key unique (user_id, provider);

alter table public.payments
  add constraint payments_paddle_transaction_id_key unique (paddle_transaction_id);
