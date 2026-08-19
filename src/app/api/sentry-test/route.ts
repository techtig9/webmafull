// Deliberately throws so you can confirm Sentry is actually capturing server-side
// errors — visit this URL once after deploying, then check your Sentry dashboard.
// force-dynamic stops Next.js from trying to run this route at BUILD time (which
// would trip over its own deliberate error and fail the whole build) — it now only
// runs when a real request hits it.
export const dynamic = "force-dynamic";

export async function GET() {
  throw new Error("webma Sentry test: server-side error");
}
