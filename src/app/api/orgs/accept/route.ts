import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { organizationId } = (await request.json().catch(() => ({}))) as { organizationId?: string };
  if (!organizationId) {
    return NextResponse.json({ message: "organizationId is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { error } = await supabase
    .from("organization_members")
    .update({ accepted_at: new Date().toISOString() })
    .eq("organization_id", organizationId)
    .eq("user_id", user!.id);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
