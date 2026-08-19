import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { feedbackSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { writeAuditLog } from "@/lib/audit";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  // Generous limit — this isn't a paid/costly action, just guards against spam.
  const limit = await checkRateLimit(`${user!.id}:feedback-submit`, 5, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(feedbackSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { type, message } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("feedback")
    .insert({ user_id: user!.id, type, message })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ message: "Couldn't submit that — try again." }, { status: 500 });
  }

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "user",
    action: "feedback.submitted",
    targetId: data.id,
    metadata: { type },
  });

  return NextResponse.json({ ok: true });
}
