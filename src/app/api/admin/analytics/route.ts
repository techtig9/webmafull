import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { PLAN_PRICES, type PlanId } from "@/lib/credits";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const supabase = createServiceRoleClient();

  const [{ count: totalUsers }, { data: activeSubs }] = await Promise.all([
    supabase.from("users").select("id", { count: "exact", head: true }),
    supabase.from("subscriptions").select("plan").eq("status", "active"),
  ]);

  const byPlan: Record<PlanId, number> = { free: 0, starter: 0, pro: 0, business: 0 };
  let estimatedMrr = 0;
  for (const s of activeSubs ?? []) {
    const plan = s.plan as PlanId;
    byPlan[plan] = (byPlan[plan] ?? 0) + 1;
    estimatedMrr += PLAN_PRICES[plan] ?? 0;
  }

  return NextResponse.json({
    totalUsers: totalUsers ?? 0,
    activeSubscriptions: activeSubs?.length ?? 0,
    byPlan,
    estimatedMrr,
  });
}
