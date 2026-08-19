# Webma upgrade summary

This build is an **additive upgrade of the existing Webma repository**.

## Preserved

- Existing authentication and user IDs
- Existing projects and project IDs
- Existing generated files
- Existing project versions
- Existing AI generation/edit routes
- Existing billing/credit logic
- Existing templates/admin/domain/deployment functionality
- Existing database data

## Improved in this build

- Landing hero now leads with the clear product message: “Create a website with AI.”
- AI generation prompt now enforces deployable dependency boundaries, responsive behavior, accessibility, and safer generated code.
- Vercel deployment scaffolding includes `lucide-react`, which generated components commonly use.
- Deployment history now polls queued/building deployments so the editor can show real progress.
- Autosave now reports failed HTTP saves instead of displaying a false “saved” state.
- Added a safe, additive database migration for schema/code mismatches discovered during the audit.
- Added encrypted application-level storage for newly connected deployment OAuth tokens using `DEPLOY_TOKEN_ENCRYPTION_KEY`, while preserving backward compatibility with existing Vault secret IDs.
- Added production gap analysis and safe rollout documentation.

## Not falsely claimed

The current repository still does not contain a complete DOM-level Figma/Webflow-style drag-and-drop inspector. The existing live preview + source editor + targeted AI editing architecture is preserved. That deeper visual editor should be the next major feature rather than a superficial mock.

## Validation note

The uploaded archive was inspected and modified successfully. A full `npm run build` could not be completed in this environment because dependency installation (`npm install`) timed out before `node_modules` became available. The final repository should therefore be build-checked in CI or on the deployment machine before production release.
