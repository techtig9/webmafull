import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { response } = await requireAdmin();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, actor_id, actor_role, action, target_id, metadata, created_at, users(name, email)")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ entries: data });
}
