import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  // Deleting the auth user cascades to public.users, subscriptions, projects,
  // deployments, and payments via their `on delete cascade` foreign keys.
  const { error } = await supabase.auth.admin.deleteUser(user!.id);

  if (error) {
    return NextResponse.json({ message: "Couldn't delete your account. Try again." }, { status: 500 });
  }

  // actorId is intentionally omitted (not left as the now-deleted user's id) — the
  // FK is `on delete set null`, so this keeps the log row valid; targetId preserves
  // which account it was.
  await writeAuditLog({
    actorId: null,
    actorRole: "user",
    action: "account.deleted",
    targetId: user!.id,
  });

  return NextResponse.json({ ok: true });
}
