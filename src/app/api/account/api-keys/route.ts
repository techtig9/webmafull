import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/api-keys";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { validate } from "@/lib/validation";

const MAX_KEYS_PER_USER = 10;
const createSchema = z.object({ name: z.string().min(1).max(80) });

/** List this user's keys — never the raw key, which is unrecoverable after
 * creation by design (see api-keys.ts). Just enough to tell them apart and
 * see which ones are actually being used. */
export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("api_keys")
    .select("id, name, key_prefix, last_used_at, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ keys: data });
}

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:create-api-key`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(createSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { count } = await supabase
    .from("api_keys")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user!.id);
  if ((count ?? 0) >= MAX_KEYS_PER_USER) {
    return NextResponse.json({ message: `You can have at most ${MAX_KEYS_PER_USER} API keys — revoke one first.` }, { status: 400 });
  }

  const { rawKey, keyHash, keyPrefix } = generateApiKey();

  const { data: inserted, error } = await supabase
    .from("api_keys")
    .insert({ user_id: user!.id, name: parsed.data.name, key_hash: keyHash, key_prefix: keyPrefix })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ message: "Couldn't create the key — try again." }, { status: 500 });
  }

  // The only point in this key's entire lifetime where the raw value is
  // ever sent anywhere — the response to this exact request. It is not
  // retrievable again after this; the UI needs to tell the user that
  // plainly and make it easy to copy right now.
  return NextResponse.json({ key: { ...inserted, rawKey } });
}
