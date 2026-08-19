# Deployment checklist

Everything below requires access, credentials, or licensure this AI
assistant does not have. Each item is written to be as fast and mechanical
as possible to execute yourself — copy the command, run it, check the box.

---

## 1. Rotate credentials

Fresh scan of the codebase (run yourself to double-check, run just now
and confirmed clean — no real secrets found in source):

```bash
grep -rn "sk_live\|AKIA\|-----BEGIN.*PRIVATE KEY\|xoxb-" --include="*.ts" --include="*.tsx" . | grep -v node_modules
```

Every credential this app actually uses, by name, from `.env.example` —
rotate each at its provider dashboard, then update your deployment
platform's environment variables:

- `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase
  dashboard → Project Settings → API
- `ANTHROPIC_API_KEY` — console.anthropic.com → API Keys
- `GROQ_API_KEY`, `CEREBRAS_API_KEY`, `OPENROUTER_API_KEY` — each
  provider's own dashboard
- `OPENAI_API_KEY` — platform.openai.com → API Keys (used for AI image
  generation only, not text — see `src/lib/image-gen.ts`)
- `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET` — Paddle dashboard → Developer
  Tools
- `VERCEL_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_CLIENT_SECRET` — each
  platform's OAuth app settings
- `DEPLOY_TOKEN_ENCRYPTION_KEY` — generate a fresh one:
  `openssl rand -hex 32`
- `SENTRY_AUTH_TOKEN` — Sentry → Settings → Auth Tokens
- `ANALYTICS_HASH_SALT` — generate a fresh one:
  `openssl rand -hex 32`

## 2. Pull the real RLS policies and function bodies

`supabase/migrations/20260101000000_baseline_reconstructed_schema.sql`
deliberately stubs `deploy_token_encrypt`, `deploy_token_decrypt`,
`is_admin`, `is_org_member`, `increment_credits`, and `decrement_credits`
to raise an exception rather than guess at security-critical logic. Run
this against your **live** Supabase project's SQL editor to get the real
definitions:

```sql
-- Function bodies
select proname, pg_get_functiondef(oid)
from pg_proc
where proname in (
  'deploy_token_encrypt', 'deploy_token_decrypt',
  'is_admin', 'is_org_member',
  'increment_credits', 'decrement_credits'
);

-- RLS policies, every table
select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
```

Paste each function's real body over its stub in the migration file, and
add the real policies as a new migration (don't edit the baseline file
after it's been applied anywhere — additive migrations only, same
convention as everything else in `supabase/migrations/`).

## 3. Smoke-test the three features never run against a live service

Each is written correctly and type-checks against the real SDK, but has
never executed against an actual provider from this environment. ~15
minutes in a staging environment with real keys set:

- [ ] **AI image generation** — select an `<img>` in the generator, enter
      a prompt in the AI image panel, generate. Confirm the image appears
      in the preview and a credit was deducted (`ACTION_COSTS.generate_image`
      in `src/lib/credits.ts`).
- [ ] **GitHub sync** — connect GitHub from Settings, open a project, hit
      "Push to GitHub". Confirm a real repo is created/updated and the
      commit lands (`src/lib/github.ts`).
- [ ] **Presence indicators** — open the same project in two browser
      tabs, logged in as two different users. Confirm each tab shows the
      other person's avatar in the toolbar within a few seconds
      (`src/components/generator/PresenceIndicator.tsx`).

## 4. Run the E2E suite for real

Needs a seeded Supabase test project and these repo secrets set (see
`.github/workflows/ci.yml`'s `e2e` job):

```
E2E_SUPABASE_URL
E2E_SUPABASE_ANON_KEY
E2E_SUPABASE_SERVICE_ROLE_KEY
E2E_TEST_EMAIL
E2E_TEST_PASSWORD
E2E_TEST_PROJECT_ID
```

Once set, the `e2e` job in CI runs automatically on every push. To run
locally: `npx playwright install && npx playwright test`.

## 5. Legal review

`webma-privacy-policy.md` and `webma-terms-of-service.md` (delivered
earlier this project) are drafts grounded in this app's actual data
architecture, not templates. Before publishing:

- [ ] Fill in every `[bracketed placeholder]`
- [ ] Attorney review of both documents in full
- [ ] Attorney drafts the limitation-of-liability clause specifically —
      flagged in the draft as needing jurisdiction-specific language a
      generic clause would do more harm than good standing in for
- [ ] Confirm the billing/cancellation language matches what Paddle's
      own merchant-of-record terms actually guarantee

---

None of the above blocks the others — items 1, 3, 4, and 5 can happen in
parallel. Item 2 is worth doing before item 3's GitHub/image-gen tests,
since real RLS policies affect what those features can actually read and
write.
