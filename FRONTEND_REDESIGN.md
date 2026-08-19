# Webma Frontend Redesign

This upgrade keeps the existing Webma application architecture, Supabase data, AI APIs, project/version APIs, billing, deployment, domains, and authentication intact.

## Redesigned surfaces
- Public landing page: premium dark SaaS marketing experience with AI builder hero, product preview, feature/value messaging and existing sections.
- Authenticated shell: dark workspace with persistent sidebar, account navigation, search, credits and plan indicators.
- Dashboard: real project/subscription data, project cards, quick actions, current plan/credits, published/draft counts.
- Generator: focused AI creation workspace with example prompts, voice input, URL generation, project editing, visual/code modes, responsive preview, save, undo/redo and contextual AI editing.
- Shared UI: premium dark glass surfaces, gradients, accessible focus states, hover/press interactions, responsive layouts and reduced-motion support.

## Data integrity
No destructive migration is included in this frontend upgrade. Existing users, projects, websites, versions, conversations, assets and database records are preserved.

## Verification note
The source was updated directly. Dependency installation was attempted in the build environment but exceeded the execution timeout, so a full `npm run build` could not be completed here. Run the repository's CI/build checks in the deployment environment before production release.
