import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { changeTheme } from "@/lib/gemini";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const changeThemeSchema = z.object({
  projectId: z.string().uuid(),
  instruction: z.string().trim().min(3, "Describe the restyle in a few more words.").max(300),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:change-theme`, 15, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(changeThemeSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, instruction } = parsed.data;

  const gate = await canUseFeature(user!.id, "change_theme");
  if (!gate.allowed) {
    const status = gate.reason === "insufficient_credits" ? 402 : 403;
    return NextResponse.json({ message: gate.message }, { status });
  }

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase
    .from("projects")
    .select("user_id, current_version")
    .eq("id", projectId)
    .single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data: version } = await supabase
    .from("project_versions")
    .select("files, pages, prompt_answers")
    .eq("project_id", projectId)
    .eq("version", project.current_version)
    .single();
  if (!version) {
    return NextResponse.json({ message: "Nothing to restyle yet." }, { status: 404 });
  }

  try {
    const previousFiles = version.files as Record<string, string>;
    const nextVersion = project.current_version + 1;
    const { error: checkpointError } = await supabase.from("project_versions").insert({
      project_id: projectId,
      version: nextVersion,
      files: previousFiles,
      pages: version.pages,
      prompt_answers: { ...(version.prompt_answers as Record<string, unknown>), __checkpoint_reason: "AI theme change" },
    });
    if (checkpointError) throw checkpointError;
    await supabase.from("projects").update({ current_version: nextVersion }).eq("id", projectId);

    const { files, cacheHit } = await changeTheme(previousFiles, instruction);

    const { error } = await supabase
      .from("project_versions")
      .update({ files })
      .eq("project_id", projectId)
      .eq("version", nextVersion);
    if (error) throw error;

    await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
    await spendCredits(user!.id, "change_theme", { isAdmin: gate.isAdmin, cacheHit, projectId });

    return NextResponse.json({ files, cacheHit });
  } catch (err) {
    console.error("change-theme error", err, "user:", user!.id);
    // Nothing was deducted yet for a failed restyle — no refund needed.
    return NextResponse.json({ message: "Restyle failed. No credits were charged — try again." }, { status: 500 });
  }
            }
