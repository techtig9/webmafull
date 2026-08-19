import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { PLAN_CREDITS, type PlanId } from "@/lib/credits";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

type OverrideAction = "set_plan" | "extend" | "cancel";

export async function POST(request: Request) {
  const { user, response } = await requireAdmin();
  if (response) return response;

  const { userId, action, plan, extendDays } = (await request.json()) as {
    userId: string;
    action: OverrideAction;
    plan?: PlanId;
    extendDays?: number;
  };

  if (!userId || !action) {
    return NextResponse.json({ message: "userId and action are required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  if (action === "set_plan") {
    if (!plan) return NextResponse.json({ message: "plan is required for set_plan." }, { status: 400 });
    const { error } = await supabase
      .from("subscriptions")
      .update({
        plan,
        status: "active",
        credits_remaining: PLAN_CREDITS[plan],
        credits_allowance: PLAN_CREDITS[plan],
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (action === "extend") {
    const { data: sub } = await supabase.from("subscriptions").select("renews_at").eq("user_id", userId).single();
    const base = sub?.renews_at ? new Date(sub.renews_at) : new Date();
    base.setDate(base.getDate() + (extendDays ?? 30));
    const { error } = await supabase
      .from("subscriptions")
      .update({ renews_at: base.toISOString(), status: "active" })
      .eq("user_id", userId);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  }

  if (action === "cancel") {
    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", userId);
    if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Admin billing overrides directly affect revenue and customer entitlements —
  // always traceable to who did it and when.
  await writeAuditLog({
    actorId: user!.id,
    actorRole: "admin",
    action: `subscription.${action}`,
    targetId: userId,
    metadata: { plan, extendDays },
  });

  return NextResponse.json({ ok: true });
}
