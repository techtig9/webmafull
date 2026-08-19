// Migrated from sentry.client.config.ts to Next.js's own instrumentation-client.ts
// convention — the Sentry SDK itself warned about this during a real production
// build (the first one actually completed in this project's history, after
// fixing the font-fetch network dependency that had blocked every prior
// attempt): sentry.client.config.ts "will no longer work" once this app moves
// to Turbopack. This file is auto-loaded by Next.js for the client bundle by
// its conventional name/location — no explicit import needed anywhere, the
// same way instrumentation.ts's register() is auto-invoked for the server/edge
// runtimes without this project ever calling it directly.
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
  debug: false,
});

// The SDK itself flagged this as required during the build, once it
// recognized the instrumentation-client.ts convention (this wasn't
// something it could check for under the old sentry.client.config.ts name):
// without exporting this hook, App Router client-side navigations never get
// traced, silently degrading the tracesSampleRate config above to only ever
// covering the initial page load.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
