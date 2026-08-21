import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { isTemplateLocked } from "@/lib/templates";
import { validate } from "@/lib/validation";
import { z } from "zod";
import type { Json } from "@/lib/supabase/database.types";

const useTemplateSchema = z.object({ templateId: z.string().uuid() });

/** structure is assumed to hold { files: Record<string,string>, pages?: Page[] }
 * — the same shape a project_versions row's own files/pages already use
 * elsewhere in this app, which is the reasonable, internally-consistent
 * assumption to make. Unverified against real seeded template data (see
 * docs/DEPLOYMENT_CHECKLIST.md's broader "never run against a live
 * database" caveat) — flagged explicitly rather than silently assumed
 * correct, and validated defensively below rather than trusted blindly. */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(useTemplateSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const [{ data: template }, { data: profile }, { data: sub }] = await Promise.all([
    supabase.from("templates").select("name, tier_required, structure").eq("id", parsed.data.templateId).maybeSingle(),
    supabase.from("users").select("role").eq("id", user!.id).single(),
    supabase.from("subscriptions").select("plan").eq("user_id", user!.id).single(),
  ]);

  if (!template) {
    return NextResponse.json({ message: "Template not found." }, { status: 404 });
  }

  // The real enforcement point — a template hidden as "locked" in the UI
  // is not actually gated at all unless this exact check also runs here,
  // server-side, where a direct API call can't skip past it.
  const isAdmin = profile?.role === "admin";
  if (isTemplateLocked(template.tier_required, sub?.plan ?? "free", isAdmin)) {
    return NextResponse.json({ message: "Upgrade your plan to use this template." }, { status: 403 });
  }

  const structure = template.structure as { files?: Record<string, string>; pages?: unknown } | null;
  if (!structure || typeof structure.files !== "object" || structure.files === null) {
    return NextResponse.json({ message: "This template isn't ready to use yet." }, { status: 422 });
  }

  const { data: project, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: user!.id,
      name: template.name,
      description: `Started from the "${template.name}" template.`,
      status: "ready",
      current_version: 1,
    })
    .select("id")
    .single();
  if (insertError || !project) {
    return NextResponse.json({ message: "Couldn't create a project from that template." }, { status: 500 });
  }

  const { error: versionError } = await supabase.from("project_versions").insert({
    project_id: project.id,
    version: 1,
    files: structure.files as unknown as Json,
    pages: (structure.pages ?? null) as Json,
  });
  if (versionError) {
    // Roll back the half-created project rather than leaving an empty,
    // confusing project behind — same pattern as /api/projects/duplicate.
    await supabase.from("projects").delete().eq("id", project.id);
    return NextResponse.json({ message: "Couldn't create a project from that template." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, projectId: project.id });
}
