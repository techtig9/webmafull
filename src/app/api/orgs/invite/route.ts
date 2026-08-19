import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { z } from "zod";

const inviteSchema = z.object({
  organizationId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(inviteSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { organizationId, email } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: org } = await supabase
    .from("organizations")
    .select("id, owner_id")
    .eq("id", organizationId)
    .single();
  if (!org || org.owner_id !== user!.id) {
    return NextResponse.json({ message: "Only the organization owner can invite members." }, { status: 403 });
  }

  // v1 scope: invites go to an existing webma account, found by email — this
  // avoids standing up a separate signup-via-invite-token email flow. If the
  // person doesn't have an account yet, they need to sign up first.
  const { data: invitee } = await supabase.from("users").select("id").eq("email", email).maybeSingle();
  if (!invitee) {
    return NextResponse.json(
      { message: "No webma account found for that email — ask them to sign up first, then invite them." },
      { status: 404 }
    );
  }

  const { error } = await supabase.from("organization_members").insert({
    organization_id: organizationId,
    user_id: invitee.id,
    role: "member",
    invited_email: email,
  });

  if (error) {
    const message = error.code === "23505" ? "That person is already a member of this organization." : error.message;
    return NextResponse.json({ message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
