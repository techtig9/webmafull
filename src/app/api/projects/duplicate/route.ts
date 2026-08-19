import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate, duplicateProjectSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(duplicateProjectSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: original } = await supabase
    .from("projects")
    .select("user_id, name, description, current_version, seo_title, seo_description")
    .eq("id", projectId)
    .single();
  if (!original || original.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data: latestVersion } = await supabase
    .from("project_versions")
    .select("files, prompt_answers")
    .eq("project_id", projectId)
    .eq("version", original.current_version)
    .single();
  if (!latestVersion) {
    return NextResponse.json({ message: "Nothing to duplicate yet — this project has no generated files." }, { status: 404 });
  }

  const { data: copy, error: insertError } = await supabase
    .from("projects")
    .insert({
      user_id: user!.id,
      name: `${original.name} (copy)`,
      description: original.description,
      status: "ready",
      current_version: 1,
      seo_title: original.seo_title,
      seo_description: original.seo_description,
    })
    .select("id")
    .single();
  if (insertError || !copy) {
    return NextResponse.json({ message: "Couldn't duplicate that project." }, { status: 500 });
  }

  const { error: versionError } = await supabase.from("project_versions").insert({
    project_id: copy.id,
    version: 1,
    files: latestVersion.files,
    prompt_answers: latestVersion.prompt_answers,
  });
  if (versionError) {
    // Roll back the half-created project rather than leaving an empty duplicate behind.
    await supabase.from("projects").delete().eq("id", copy.id);
    return NextResponse.json({ message: "Couldn't duplicate that project." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, projectId: copy.id });
}
