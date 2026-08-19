# Safe Webma upgrade

Webma is an existing SaaS. Deploy upgrades **additively**.

## Rules

- Back up the production Supabase project before applying a migration.
- Run `supabase/migrations/20260813_webma_safe_additive_upgrade.sql` against the existing database.
- Do not drop tables, truncate data, recreate the database, or replace project/version rows.
- Existing project IDs and version IDs must remain unchanged.

## Verification

- Existing users can log in.
- Existing projects appear in `/dashboard/projects`.
- Existing versions open in the generator.
- Existing deployments remain visible.
- A new website can be generated.
- Manual edits autosave and display a real error if saving fails.
- ZIP/React/Next.js export works.
- Vercel deployment shows real queued/building/ready/error progress.
- Existing domains remain intact.
- Paddle subscriptions and credit balances are unchanged.

## Rollback

Application rollback is a normal deployment rollback. Database rollback should use a verified backup/snapshot; do not reverse a production migration by dropping newly added columns while application code may still depend on them.
