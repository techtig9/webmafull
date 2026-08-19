# webma API reference

All routes are Next.js Route Handlers under `src/app/api/`. Every route requires an
authenticated Supabase session (cookie-based) unless noted; admin routes additionally
require `users.role = 'admin'`. Request/response bodies are JSON unless noted.

Auth itself has no dedicated routes — sign-up, login, and logout go directly through
the Supabase Auth JS SDK from the client (`src/lib/supabase/client.ts`), which is the
idiomatic pattern for Supabase and avoids re-implementing session handling. The one
server-side auth route is the OAuth/email-link callback:

| Route | Method | Purpose |
|---|---|---|
| `/auth/callback` | GET | Exchanges a Supabase auth code (Google OAuth, email verification, password reset) for a session. |

## AI generation

| Route | Method | Body | Notes |
|---|---|---|---|
| `/api/ai/follow-up-questions` | POST | `{ name, description }` | Returns tap-to-pick follow-up questions. Rate-limited, no credit cost. |
| `/api/ai/generate-website` | POST | `{ name, description, answers?, projectId? }` | Core generator. `projectId` present → priced as `regenerate_complete` (750 credits); absent → `generate_full_website` (2,500 credits). Feature-gated + rate-limited. |
| `/api/ai/generate-from-url` | POST | `{ name, url, answers? }` | Fetches a reference URL server-side and generates original content inspired by it. 3,000 credits, Starter+. |
| `/api/ai/edit-section` | POST | `{ projectId, targetFile, instruction }` | AI-edits one file in place on the project's current version. 350 credits, Starter+. |
| `/api/ai/change-theme` | POST | `{ projectId, instruction }` | Restyles every file's visual theme in one pass, content/structure untouched. 100 credits, Starter+. |
| `/api/ai/transcribe` | POST | `{ audio (base64), mimeType }` | Voice-to-text for the describe step. 50 credits, Starter+. |
| `/api/ai/assistant` | POST | `{ messages: [{role, content}] }` | Multi-turn decision-support chatbot (templates, plans, product Q&A) — does not generate sites itself. Auth required like every feature; no credit cost, rate-limited. |

## Projects

| Route | Method | Body / Query | Notes |
|---|---|---|---|
| `/api/projects/save` | POST | `{ projectId, files }` | Autosave — overwrites the current version's files, does not create new history. |
| `/api/projects/versions` | GET | `?projectId=` | Lists version history. |
| `/api/projects/restore-version` | POST | `{ projectId, version }` | Restores an old version by creating a **new** version matching it (non-destructive). Gated by plan's version-history limit. |
| `/api/projects/deployments` | GET | `?projectId=` | Recent deployment status/logs for a project. |
| `/api/projects/seo` | POST | `{ projectId, seoTitle?, seoDescription?, seoOgImageUrl? }` | Updates SEO metadata, which is injected into exports and deployments. |

## Export & deploy

| Route | Method | Body | Notes |
|---|---|---|---|
| `/api/export/export-zip` | POST | `{ projectId, format: "zip"\|"react"\|"nextjs" }` | Always free of credits; still plan-gated (locked on Free). |
| `/api/deploy/deploy-vercel` | POST | `{ projectId }` | Requires `VERCEL_API_TOKEN`. Free of credits, plan-gated. |
| `/api/deploy/deploy-netlify` | POST | `{ projectId }` | Requires `NETLIFY_API_TOKEN`. Free of credits, plan-gated. |

## Custom domains

| Route | Method | Body / Query | Notes |
|---|---|---|---|
| `/api/domains/add` | POST | `{ projectId, domain }` | Attaches via the Vercel Domains API; returns required DNS records if not auto-verified. Count-gated by plan. |
| `/api/domains/list` | GET | `?projectId=` | Lists domains for a project. |
| `/api/domains/verify` | POST | `{ domainId }` | Re-checks DNS propagation status. |
| `/api/domains/remove` | POST | `{ domainId }` | Removes our record (does not detach from Vercel — see code comment for rationale). |

## Billing (Paddle)

| Route | Method | Body | Notes |
|---|---|---|---|
| `/api/billing/paddle-checkout` | POST | `{ plan, cycle }` | Creates/reuses a Paddle customer, returns overlay-checkout parameters. |
| `/api/billing/paddle-webhook` | POST | raw Paddle payload | Signature-verified. Handles `subscription.created/updated/canceled`, `transaction.completed/payment_failed`. Writes to `audit_log`. |
| `/api/billing/subscription-status` | GET | — | Current plan, credits, status. |
| `/api/billing/cancel-subscription` | POST | — | Cancels at end of current billing period via Paddle API. |

## Account

| Route | Method | Notes |
|---|---|---|
| `/api/account/delete` | POST | Deletes the auth user (cascades to all owned data). Audit-logged. |

## Admin (role = admin required)

| Route | Method | Body / Query | Notes |
|---|---|---|---|
| `/api/admin/list-users` | GET | `?q=` (email search) | |
| `/api/admin/list-subscriptions` | GET | — | |
| `/api/admin/list-payments` | GET | — | Includes a computed `totalRevenue`. |
| `/api/admin/list-audit-log` | GET | — | Last 200 events. |
| `/api/admin/analytics` | GET | — | Total users, active subs, plan breakdown, estimated MRR. |
| `/api/admin/override-subscription` | POST | `{ userId, action: "set_plan"\|"extend"\|"cancel", plan?, extendDays? }` | Audit-logged. |

## Error shape

Every route returns errors as `{ message: string }` with an appropriate status code:
`400` invalid input, `401` not authenticated, `402` insufficient credits, `403` not
allowed (plan/role), `404` not found, `429` rate limited, `500` unexpected failure.
Client code should always branch on status before assuming the body shape.
