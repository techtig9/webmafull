import { NextResponse } from "next/server";
import { requireApiKey } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

/** Public API v1 — read-only. GET /api/v1/projects lists the API key
 * owner's own projects; nothing about anyone else's data is ever
 * reachable through this key, the same ownership boundary every
 * session-authenticated route in this app already enforces. This is
 * deliberately the first, smallest real slice of "a public API": one
 * endpoint, one HTTP method, no write access, no webhooks. See
 * docs/GAP_ANALYSIS.md — the full "public API + webhooks platform" item
 * remains its own, much larger, separate undertaking. */
export async function GET(request: Request) {
  const { userId, response } = await requireApiKey(request);
  if (response) return response;

  const limit = await checkRateLimit(`apikey:${userId}:v1-projects`, 60, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Rate limit exceeded — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("projects")
    .select("id, name, description, status, created_at, updated_at")
    .eq("user_id", userId!)
    .eq("archived", false)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ projects: data });
}
