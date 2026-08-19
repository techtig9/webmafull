import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { provider } = (await request.json().catch(() => ({}))) as { provider?: string };
  if (provider !== "vercel") {
    return NextResponse.json({ message: "provider must be 'vercel'." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  await supabase.from("deploy_connections").delete().eq("user_id", user!.id).eq("provider", provider);

  return NextResponse.json({ ok: true });
}
