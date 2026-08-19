import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { domainId } = (await request.json().catch(() => ({}))) as { domainId?: string };
  if (!domainId) {
    return NextResponse.json({ message: "domainId is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: domainRow } = await supabase
    .from("custom_domains")
    .select("id, projects!inner(user_id)")
    .eq("id", domainId)
    .single<{ id: string; projects: { user_id: string } }>();

  if (!domainRow || domainRow.projects.user_id !== user!.id) {
    return NextResponse.json({ message: "Domain not found." }, { status: 404 });
  }

  // Note: this removes our record of the domain but does not detach it from the
  // Vercel project — intentionally conservative, since re-adding it later should
  // just work rather than requiring the customer to redo DNS. A full "release"
  // flow (DELETE /v9/projects/{id}/domains/{domain}) can be added if that
  // conservatism turns out to be the wrong default once real customers use this.
  const { error } = await supabase.from("custom_domains").delete().eq("id", domainId);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
