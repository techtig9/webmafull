import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { trackPageViewSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp, dailyVisitorHash } from "@/lib/visitor-tracking";

/** Public — same reasoning as /api/public/forms/submit: called from a site
 * visitor's browser on whatever domain the generated site is actually
 * published to, so no auth and CORS wide open. Pageviews are far more
 * frequent than form submissions, so the rate limit here is set much higher
 * (300/min vs forms' 10/min) — a real, actively-browsed site legitimately
 * fires this on every page navigation. clientIp and dailyVisitorHash both
 * live in @/lib/visitor-tracking, shared with forms/submit — they used to
 * be defined independently in each route (forms even had its own separate,
 * incompatible hash), consolidated for real reasons documented there. */
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request) {
  const ip = clientIp(request);
  const limitKey = ip ? `analytics-track:${ip}` : "analytics-track:unknown";
  const limit = await checkRateLimit(limitKey, 300, 60_000);
  if (!limit.allowed) {
    return new NextResponse(null, { status: 429, headers: CORS_HEADERS });
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(trackPageViewSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400, headers: CORS_HEADERS });
  }
  const { projectId, path, referrer } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) {
    // Same reasoning as the forms endpoint: don't confirm or deny a
    // project's existence to an unauthenticated caller.
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  await supabase.from("page_views").insert({
    project_id: projectId,
    path,
    referrer: referrer ?? null,
    visitor_hash: ip ? dailyVisitorHash(ip) : null,
  });
  // Insert errors aren't surfaced here on purpose — this is a fire-and-forget
  // tracking call from generated site code, not a user-facing action like a
  // form submission. Losing one pageview to a transient DB error isn't worth
  // adding retry/error-handling complexity to every generated site's layout.

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
