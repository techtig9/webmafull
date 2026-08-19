import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canAddDomain } from "@/lib/credits";
import { attachVercelDomain } from "@/lib/deploy";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { z } from "zod";

const addDomainSchema = z.object({
  projectId: z.string().uuid(),
  domain: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^([a-z0-9-]+\.)+[a-z]{2,}$/, "Enter a valid domain, like example.com."),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(addDomainSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, domain } = parsed.data;

  const gate = await canAddDomain(user!.id);
  if (!gate.allowed) {
    return NextResponse.json({ message: gate.message }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, user_id")
    .eq("id", projectId)
    .single();

  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data: domainRow, error: insertError } = await supabase
    .from("custom_domains")
    .insert({ project_id: projectId, domain })
    .select("id, verification_token")
    .single();

  if (insertError) {
    const message = insertError.code === "23505" ? "That domain is already connected to a project." : insertError.message;
    return NextResponse.json({ message }, { status: 400 });
  }

  const result = await attachVercelDomain(project.name, domain);

  await supabase
    .from("custom_domains")
    .update({
      status: result.error ? "failed" : result.verified ? "active" : "verifying",
      verified_at: result.verified ? new Date().toISOString() : null,
    })
    .eq("id", domainRow.id);

  if (result.error) {
    return NextResponse.json({ message: result.error }, { status: 500 });
  }

  return NextResponse.json({
    id: domainRow.id,
    verified: result.verified,
    requiredRecords: result.requiredRecords ?? [],
  });
}
