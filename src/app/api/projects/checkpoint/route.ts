import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const body = (await request.json().catch(() => ({}))) as { projectId?: string; reason?: string };
  if (!body.projectId) return NextResponse.json({ message: "projectId is required." }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase.from("projects").select("id, user_id, current_version").eq("id", body.projectId).single();
  if (!project || project.user_id !== user!.id) return NextResponse.json({ message: "Project not found." }, { status: 404 });

  const { data: current } = await supabase.from("project_versions").select("files, pages, prompt_answers").eq("project_id", project.id).eq("version", project.current_version).single();
  if (!current) return NextResponse.json({ message: "Current project version not found." }, { status: 404 });

  const nextVersion = project.current_version + 1;
  const { error } = await supabase.from("project_versions").insert({
    project_id: project.id,
    version: nextVersion,
    files: current.files,
    pages: current.pages,
    prompt_answers: { ...(current.prompt_answers as Record<string, unknown>), __checkpoint_reason: body.reason ?? "Manual checkpoint", __checkpointed_at: new Date().toISOString() },
  });
  if (error) return NextResponse.json({ message: "Could not create version checkpoint." }, { status: 500 });

  await supabase.from("projects").update({ current_version: nextVersion, updated_at: new Date().toISOString() }).eq("id", project.id);
  return NextResponse.json({ ok: true, version: nextVersion });
}
