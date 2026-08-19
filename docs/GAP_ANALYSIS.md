# Webma gap analysis — 2026-08-13 upgrade

## GREEN — preserve

- Supabase authentication and existing accounts
- Existing projects and project versions
- AI generation pipeline
- Multi-page generation
- Code editor
- Project settings / SEO
- Billing / credits / Paddle
- Admin / teams / domains / deployment integrations
- Existing audit/rate-limit/security infrastructure

## YELLOW — improved

- Landing-page positioning and product messaging
- AI generation instructions and structured site specification
- Visual preview now supports element selection
- AI edit prompt receives selected-element context
- Undo/redo session history
- AI edits and theme changes now preserve a database checkpoint before modification
- Deployment records now track provider deployment IDs and can poll Vercel status
- Generated component exports are normalized for deploy/export compatibility
- React/Next exports include lucide-react when generated code uses it
- Autosave reliability and explicit save feedback

## ORANGE — must verify in staging/production

- Full `npm ci` / lint / TypeScript / test / production build
- Real AI provider credentials and model availability
- Paddle sandbox and production webhook flows
- Vercel OAuth/platform deployment credentials
- Custom-domain DNS and SSL behavior
- Supabase RLS/security advisor findings
- Storage policies and private asset access
- Real-world load and abuse testing
- End-to-end browser testing across supported devices

## BLUE — future expansion

Grouped here by real scope, not just listed — each of these needs its own
dedicated planning cycle; none of them is a "next phase" the way the GREEN/
YELLOW work above was. Sizing is relative to this project's own upgrade
history (the 2026-08-13 upgrade above, plus the follow-on hardening/feature
phases layered onto it after) as the yardstick.

### Largest — genuinely multi-month, dedicated-team scope
- **Full Figma/Webflow-level freeform drag/resize canvas** — the single
  biggest item here, larger than everything else in this document combined.
  Requires replacing the current "generated files are opaque JSX strings"
  model with a structured, serializable element tree (or a much more
  sophisticated code-aware AST manipulation layer than the deterministic
  className-swap approach QuickStylePanel uses today), plus resize/drag
  physics, a real layers/element-tree UI, and flex/grid visual controls.
  A property inspector for typography/spacing is a tractable slice of this
  (see the property inspector work in this repo's history) — true freeform
  positioning is not.
- **Collaborative real-time editing** — needs an entire realtime sync layer
  (CRDT or OT), presence/cursor broadcasting infrastructure, and conflict
  resolution for concurrent edits to the same file. A standalone subsystem,
  not a feature added to the existing save/autosave model.
- **Full CMS / blog / content collections** and **e-commerce system** — each
  its own product category (content modeling, drafts/publishing workflow,
  or cart/checkout/inventory/payments) — bigger in scope than webma's
  current site-generation product itself.
- **Plugin marketplace / white-label SaaS / public API + webhooks platform**
  — platform-level initiatives: a plugin architecture with a sandboxed
  execution model, a public API with its own auth/rate-limit/versioning
  surface, and a webhook delivery system with retries and signing.
- **Autonomous AI maintenance/building agent** — a research problem (agentic
  planning + tool use + verification loops) more than a bounded engineering
  task with a clear "done."

### Large but boundable — real projects, could become their own future phases
- **AI-generated images as a first-class asset pipeline** — new provider
  integration, cost/credit model, and storage, similar in shape to how the
  AI generation pipeline itself was built, but a distinct pipeline.
- **GitHub synchronization** — an OAuth app, repo read/write, and conflict
  handling between webma's own version history and git history. Real and
  boundable, but meaningfully bigger than any single phase completed so far.
- **Additional deployment providers** beyond the current Vercel/Netlify
  integration — each provider is its own OAuth + deploy-status-polling
  integration.
- **Advanced analytics dashboards, conversion tracking, A/B testing** — a
  basic pageview-tracking version is a reasonable near-term phase; the
  advanced form (funnels, experiment allocation, statistical significance)
  is its own analytics product.
- **Automated accessibility/performance scoring** — a heuristic-based first
  version (missing alt text, heading hierarchy, meta tag presence) is
  boundable; a full Lighthouse-equivalent scoring pipeline needs headless
  browser infrastructure this project doesn't currently have.

The upgrade intentionally avoids replacing the existing architecture or deleting/recreating existing data.
