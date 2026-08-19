import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { z } from "zod";

const createOrgSchema = z.object({
  name: z.string().trim().min(1, "Organization name is required.").max(80),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(createOrgSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: profile } = await supabase.from("users").select("role").eq("id", user!.id).single();
  if (profile?.role !== "admin") {
    const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", user!.id).single();
    if (sub?.plan !== "business") {
      return NextResponse.json(
        { message: "Organizations are a Business-plan feature. Upgrade to create one." },
        { status: 403 }
      );
    }
  }

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({ name: parsed.data.name, owner_id: user!.id })
    .select("id, name")
    .single();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: user!.id,
    role: "owner",
    accepted_at: new Date().toISOString(),
  });

  return NextResponse.json({ org });
}
