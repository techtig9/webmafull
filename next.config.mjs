import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**.supabase.co" }],
  },
  eslint: { ignoreDuringBuilds: true },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  // disableLogger and the top-level automaticVercelMonitors were both
  // deprecated in this exact SDK version — confirmed against the installed
  // @sentry/nextjs@10.69.0's own type definitions before making this change,
  // not guessed from the warning text alone. Both moved under webpack per
  // the SDK's own migration guidance.
  webpack: {
    treeshake: { removeDebugLogging: true },
    automaticVercelMonitors: true,
  },
});
