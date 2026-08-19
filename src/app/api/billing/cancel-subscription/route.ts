import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { paddleApiBase } from "@/lib/paddle";

export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, paddle_subscription_id")
    .eq("user_id", user!.id)
    .single();

  if (!sub?.paddle_subscription_id) {
    return NextResponse.json({ message: "No active paid subscription to cancel." }, { status: 400 });
  }

  // Cancel at the end of the current billing period, not immediately — the
  // customer already paid for this cycle and should keep access through it.
  const res = await fetch(`${paddleApiBase()}/subscriptions/${sub.paddle_subscription_id}/cancel`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ effective_from: "next_billing_period" }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    console.error("paddle cancel error", data);
    return NextResponse.json({ message: "Couldn't cancel your subscription. Try again." }, { status: 500 });
  }

  // The Paddle webhook will flip status to 'canceled' when the period actually
  // ends — this just records that cancellation was requested.
  await writeAuditLog({
    actorId: user!.id,
    actorRole: "user",
    action: "subscription.cancel_requested",
    targetId: user!.id,
    metadata: { plan: sub.plan },
  });

  return NextResponse.json({ ok: true, message: "Your plan will end at the close of the current billing period." });
}
