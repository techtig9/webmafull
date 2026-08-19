import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { PLAN_FEATURES, type PlanId } from "@/lib/credits";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { projectId, version } = (await request.json().catch(() => ({}))) as {
    projectId?: string;
    version?: number;
  };
  if (!projectId || !version) {
    return NextResponse.json({ message: "projectId and version are required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();

  const { data: profile } = await supabase.from("users").select("role").eq("id", user!.id).single();
  const { data: project } = await supabase
    .from("projects")
    .select("user_id, current_version")
    .eq("id", projectId)
    .single();

  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  if (profile?.role !== "admin") {
    const { data: sub } = await supabase.from("subscriptions").select("plan").eq("user_id", user!.id).single();
    const limit = PLAN_FEATURES[(sub?.plan as PlanId) ?? "free"].versionHistory;
    const versionsBack = project.current_version - version;
    if (limit !== -1 && versionsBack >= limit) {
      return NextResponse.json(
        { message: `Your plan only keeps the last ${limit} versions. Upgrade to restore further back.` },
        { status: 403 }
      );
    }
  }

  const { data: target } = await supabase
    .from("project_versions")
    .select("files, pages, prompt_answers")
    .eq("project_id", projectId)
    .eq("version", version)
    .single();

  if (!target) {
    return NextResponse.json({ message: "That version no longer exists." }, { status: 404 });
  }

  const nextVersion = project.current_version + 1;

  const { error: insertError } = await supabase.from("project_versions").insert({
    project_id: projectId,
    version: nextVersion,
    files: target.files,
    pages: target.pages,
    prompt_answers: target.prompt_answers,
  });
  if (insertError) return NextResponse.json({ message: insertError.message }, { status: 500 });

  await supabase
    .from("projects")
    .update({ current_version: nextVersion, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  return NextResponse.json({ files: target.files, pages: target.pages, newVersion: nextVersion });
      }
