import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { checkVercelDomainStatus } from "@/lib/deploy";
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
    .select("id, domain, status, projects!inner(id, name, user_id)")
    .eq("id", domainId)
    .single<{
      id: string;
      domain: string;
      status: string;
      projects: { id: string; name: string; user_id: string };
    }>();

  if (!domainRow || domainRow.projects.user_id !== user!.id) {
    return NextResponse.json({ message: "Domain not found." }, { status: 404 });
  }

  const result = await checkVercelDomainStatus(domainRow.projects.name, domainRow.domain);

  const status = result.error ? "failed" : result.verified ? "active" : "verifying";
  await supabase
    .from("custom_domains")
    .update({ status, verified_at: result.verified ? new Date().toISOString() : null })
    .eq("id", domainId);

  return NextResponse.json({ status, error: result.error });
}
