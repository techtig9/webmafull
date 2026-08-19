import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

type FeedbackStatus = "open" | "reviewed" | "closed";

export async function POST(request: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { feedbackId, status } = (await request.json().catch(() => ({}))) as {
    feedbackId?: string;
    status?: FeedbackStatus;
  };

  if (!feedbackId || !status || !["open", "reviewed", "closed"].includes(status)) {
    return NextResponse.json({ message: "feedbackId and a valid status are required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase.from("feedback").update({ status }).eq("id", feedbackId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "admin",
    action: "feedback.status_updated",
    targetId: feedbackId,
    metadata: { status },
  });

  return NextResponse.json({ ok: true });
}
