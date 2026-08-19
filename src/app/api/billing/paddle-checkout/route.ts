import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { priceIdFor, paddleApiBase, type BillingCycle } from "@/lib/paddle";
import type { PlanId } from "@/lib/credits";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { plan, cycle } = (await request.json()) as { plan: PlanId; cycle: BillingCycle };
  if (plan === "free") {
    return NextResponse.json({ message: "The Free plan doesn't require checkout." }, { status: 400 });
  }

  const priceId = priceIdFor(plan, cycle);
  const supabase = createServiceRoleClient();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("paddle_customer_id")
    .eq("user_id", user!.id)
    .single();

  let customerId = existing?.paddle_customer_id ?? null;

  if (!customerId) {
    const res = await fetch(`${paddleApiBase()}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PADDLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email: user!.email, custom_data: { supabase_user_id: user!.id } }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error("paddle create-customer error", data);
      return NextResponse.json({ message: "Couldn't start checkout. Try again." }, { status: 500 });
    }
    customerId = data.data.id;
    await supabase.from("subscriptions").update({ paddle_customer_id: customerId }).eq("user_id", user!.id);
  }

  // The client opens the Paddle.js overlay with this priceId + customerId —
  // Paddle Billing handles the actual payment UI, we never touch card data.
  return NextResponse.json({
    priceId,
    customerId,
    clientToken: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
    environment: process.env.NEXT_PUBLIC_PADDLE_ENV ?? "sandbox",
  });
}
