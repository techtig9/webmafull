# Webma

Webma is an AI-powered website builder SaaS. Users describe a website, Webma generates a responsive multi-page site, lets them preview and edit it visually or in code, use contextual AI editing, manage versions, export the project, and publish it.

## This repository is an upgrade of the existing Webma product

**Do not reset the database. Do not delete existing users or projects.** The upgrade is additive and keeps the existing application architecture as the source of truth.

## Core workflow

`Describe -> Understand -> Generate -> Preview -> Select/Edit -> AI Edit -> Save -> Version -> Export/Publish`

## Included product areas

- Authentication and account management
- Dashboard and projects
- AI website generation
- Structured site specification in the generation prompt
- Multi-page websites
- Responsive live preview
- Visual element selection
- Context-aware AI editing
- Monaco code editor
- Undo / redo editor history
- Autosave and explicit save
- Version history and restore
- Templates
- SEO/project settings
- Asset management
- Billing, credits and Paddle
- Teams/organizations
- Custom domains
- Export to React / Next.js / ZIP
- Vercel deployment and deployment status tracking
- Admin tools, audit logging and rate limiting
- Sentry hooks

## Stack

Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Supabase/Postgres/Auth, Monaco Editor, Paddle, Sentry, Vercel deployment APIs, and configurable AI providers.

## Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill `.env.local` using the provider credentials documented in `.env.example`.

## Database migrations

Existing production data must be preserved. Use version-controlled migrations. The new migration is:

`supabase/migrations/20260813_webma_production_editor_deployment.sql`

Do not run a database reset against an existing production installation.

## Verification

The CI pipeline runs:

```bash
npm ci
npm run lint
npx tsc --noEmit
npm test -- --run
npm run build
```

The supplied build environment used for this upgrade could not complete `npm install` before its execution timeout, so the final CI/build result must be verified in GitHub Actions or your own deployment environment.

See `docs/PRODUCTION_READINESS.md` for the staging checklist and `docs/GAP_ANALYSIS.md` for what is complete versus what still requires real infrastructure verification.
"# webmafull" 
