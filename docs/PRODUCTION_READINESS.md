# Webma production-readiness checklist

This document describes the state of the upgraded repository and the steps that must be completed in the real staging/production environment.

## Preserved by design

The upgrade is additive. It does not reset the database or delete users, projects, generated websites, files, versions, or AI data.

## Product workflow

- Landing page -> signup/login -> dashboard -> AI generator
- Short follow-up questions with skip
- Structured AI website specification + generated React/Tailwind components
- Multi-page projects
- Responsive visual preview: desktop/tablet/mobile
- Visual element selection inside the preview
- Context-aware AI edit bar
- Code editor
- Undo/redo in the editor session
- Autosave + explicit save
- AI edit/theme changes create recoverable database checkpoints
- Version restore
- SEO/project settings
- Export to ZIP/React/Next.js
- Vercel deployment + deployment status polling
- Deployment history
- Billing/credits/admin/team/domain features already present in the repository

## Security gates before production

1. Enable and review RLS for every exposed Supabase table.
2. Never expose the Supabase service-role key in browser code.
3. Keep deployment/provider secrets server-side.
4. Configure HTTPS/SSL and production authentication redirect URLs.
5. Configure rate limiting and abuse controls.
6. Review admin routes and organization/team authorization.
7. Review Storage policies for private user assets.
8. Enable backups/PITR according to the production Supabase plan.
9. Run Supabase Security Advisor and resolve findings.
10. Configure Sentry and structured server logs.

## Database deployment

Use version-controlled migrations. Do not reset the production database.

Apply the additive migration in `supabase/migrations/20260813_webma_production_editor_deployment.sql` after verifying your current schema.

## CI/CD

The repository CI runs:

- npm ci
- lint
- TypeScript check
- unit tests
- production build

Before launch, require the CI job to pass on the production branch.

## Real environment verification

Run these smoke tests against staging:

1. Create a new account.
2. Log out and back in.
3. Create a website from a prompt.
4. Verify the preview renders.
5. Switch desktop/tablet/mobile.
6. Select a preview element.
7. Ask AI to change only that element.
8. Refresh the project and confirm the change persists.
9. Undo/redo in the editor.
10. Restore an older version.
11. Export Next.js and React projects and run their builds.
12. Deploy a test project to Vercel.
13. Verify deployment status becomes ready.
14. Verify a real published URL loads on desktop and mobile.
15. Test billing in Paddle sandbox before production billing.
16. Verify domain connection only after the deployment provider is configured.
17. Verify existing production users/projects remain unchanged after migration.

## Important limitation

No codebase can honestly be called a proven successful SaaS solely from a ZIP file. Real production readiness also depends on infrastructure configuration, provider credentials, CI, backups, monitoring, load testing, customer feedback, and actual deployment tests.
