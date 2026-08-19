import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { hashApiKey, looksLikeApiKey } from "@/lib/api-keys";

export async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, response: NextResponse.json({ message: "Not authenticated." }, { status: 401 }) };
  }
  return { user, response: null };
}

export async function requireAdmin() {
  const { user, response } = await requireUser();
  if (response) return { user: null, response };

  const supabase = createServiceRoleClient();
  const { data } = await supabase.from("users").select("role").eq("id", user!.id).single();

  if (data?.role !== "admin") {
    return { user: null, response: NextResponse.json({ message: "Admin access required." }, { status: 403 }) };
  }
  return { user: user!, response: null };
}

/** Authenticates a public API v1 request via Authorization: Bearer <key>,
 * for the api.webma.app-style read-only endpoints — a genuinely different
 * auth path from requireUser's session cookie, since a request from a
 * user's own external script or CI job has no browser session to read.
 * Updates last_used_at on every successful call (not awaited into the
 * response — a slow update shouldn't add latency to every single API
 * request, and losing one last_used_at update to a rare failure is a
 * cosmetic staleness, not a correctness problem worth blocking on). */
export async function requireApiKey(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const rawKey = match?.[1];

  if (!rawKey || !looksLikeApiKey(rawKey)) {
    return {
      userId: null,
      response: NextResponse.json(
        { message: "Missing or malformed Authorization header — expected 'Bearer wm_live_...'." },
        { status: 401 }
      ),
    };
  }

  const supabase = createServiceRoleClient();
  const keyHash = hashApiKey(rawKey);
  const { data: apiKey } = await supabase.from("api_keys").select("id, user_id").eq("key_hash", keyHash).maybeSingle();

  if (!apiKey) {
    return { userId: null, response: NextResponse.json({ message: "Invalid API key." }, { status: 401 }) };
  }

  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", apiKey.id)
    .then(() => {}, () => {});

  return { userId: apiKey.user_id as string, response: null };
}
