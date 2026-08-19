import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const organizationId = searchParams.get("organizationId");
  if (!organizationId) {
    return NextResponse.json({ message: "organizationId is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  // Caller must themselves be a member (owner or accepted member) to see the roster.
  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("user_id", user!.id)
    .single();
  if (!membership) {
    return NextResponse.json({ message: "Organization not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("organization_members")
    .select("id, role, accepted_at, invited_email, users(name, email)")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ members: data });
}
