import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase.from("users").select("role").eq("id", user!.id).single();

  if (profile?.role === "admin") {
    return NextResponse.json({
      plan: "business",
      status: "active",
      creditsRemaining: null, // effectively unlimited
      creditsAllowance: null,
      isAdmin: true,
    });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("plan, status, credits_remaining, credits_allowance, renews_at")
    .eq("user_id", user!.id)
    .single();

  return NextResponse.json({ ...sub, isAdmin: false });
}
