import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("custom_domains")
    .select("id, domain, status, created_at, verified_at, projects!inner(id, name, user_id)")
    .eq("projects.user_id", user!.id)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ domains: data });
}
