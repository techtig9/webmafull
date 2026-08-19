import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data } = await supabase
    .from("deploy_connections")
    .select("provider, provider_account_email, created_at")
    .eq("user_id", user!.id);

  return NextResponse.json({ connections: data ?? [] });
}
