import { NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { formSubmitSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp, dailyVisitorHash } from "@/lib/visitor-tracking";

/** Public — deliberately no auth. This is called from a site visitor's
 * browser on whatever domain the generated site is actually published to
 * (webma's own subdomain, a custom domain, or a self-hosted export), never
 * from webma's own dashboard. CORS is wide open (Access-Control-Allow-Origin: *)
 * on purpose: the whole point is accepting requests from arbitrary generated-
 * site origins, and this route only ever writes a submission — it never
 * echoes back anything about the project a stranger shouldn't see. */
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
  // Rate-limited by IP, not by project — an unauthenticated endpoint has no
  // per-user identity to key on, and limiting only by projectId would let one
  // bot flood every project from a single IP without ever tripping a limit
  // scoped to just one of them.
  const limitKey = ip ? `form-submit:${ip}` : "form-submit:unknown";
  const limit = await checkRateLimit(limitKey, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many submissions — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429, headers: CORS_HEADERS }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(formSubmitSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400, headers: CORS_HEADERS });
  }
  const { projectId, pageSlug, formName, data, website } = parsed.data;

  // Honeypot tripped — a real visitor never sees or fills this field. Return
  // the same success response a genuine submission gets, so a bot has no
  // signal to learn from, but never touch the database.
  if (website) {
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase.from("projects").select("id").eq("id", projectId).maybeSingle();
  if (!project) {
    // Deliberately the same shape as success — confirming/denying a
    // project's existence to an unauthenticated caller is its own small
    // information leak, and there's nothing a legitimate form on a real
    // project ever needs from this response besides "it went through."
    return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
  }

  // Uses the exact same daily-rotating, salted hash analytics/track uses for
  // page views — previously this was an independent, unsalted sha256(ip)
  // with no day component, meaning the same real visitor's page-view hash
  // and form-submission hash could never match, making same-day conversion
  // correlation structurally impossible. See visitor-tracking.ts's own
  // header comment for the full reasoning.
  const submitterIpHash = ip ? dailyVisitorHash(ip) : null;

  const { error } = await supabase.from("form_submissions").insert({
    project_id: projectId,
    page_slug: pageSlug,
    form_name: formName,
    data,
    submitter_ip_hash: submitterIpHash,
  });
  if (error) {
    return NextResponse.json({ message: "Couldn't record that submission." }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
