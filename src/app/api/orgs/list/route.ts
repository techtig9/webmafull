import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("role, accepted_at, organizations(id, name, owner_id)")
    .eq("user_id", user!.id);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ memberships: data });
}
