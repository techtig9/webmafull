import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { z } from "zod";
import { validate } from "@/lib/validation";

const revokeSchema = z.object({ keyId: z.string().uuid() });

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(revokeSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // .eq("user_id", ...) in the same delete, not a separate ownership check
  // beforehand — this is the actual authorization boundary, not just a
  // pre-check that a differently-shaped follow-up query could bypass.
  const { error, count } = await supabase
    .from("api_keys")
    .delete({ count: "exact" })
    .eq("id", parsed.data.keyId)
    .eq("user_id", user!.id);

  if (error) return NextResponse.json({ message: "Couldn't revoke the key — try again." }, { status: 500 });
  if (!count) return NextResponse.json({ message: "Key not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
