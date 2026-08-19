import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { editSection } from "@/lib/gemini";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const editSchema = z.object({
  projectId: z.string().uuid(),
  targetFile: z.string().min(1),
  instruction: z.string().trim().min(3, "Describe the edit in a few more words.").max(500),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:ai-edit`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(editSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, targetFile, instruction } = parsed.data;

  // Feature-gated (Starter+) and credit-metered (350 credits), same shared check as
  // every other AI/export/deploy route.
  const gate = await canUseFeature(user!.id, "ai_edit");
  if (!gate.allowed) {
    const status = gate.reason === "insufficient_credits" ? 402 : 403;
    return NextResponse.json({ message: gate.message }, { status });
  }

  const supabase = createServiceRoleClient();

  const { data: project } = await supabase
    .from("projects")
    .select("id, user_id, current_version")
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

  if (!version || !(version.files as Record<string, string>)[targetFile]) {
    return NextResponse.json({ message: "That file doesn't exist in this project." }, { status: 404 });
  }

  try {
    const files = version.files as Record<string, string>;
    const previousVersion = project.current_version;

    const { updatedFile, cacheHit } = await editSection(files, targetFile, instruction);
    const updatedFiles = { ...files, [targetFile]: updatedFile };

    // The pre-edit state is already safe at `previousVersion` (untouched above) —
    // no separate checkpoint insert needed for that. Write the post-edit result as
    // a single new version directly, and hand `previousVersion` back to the client
    // so a "Revert" action can call /api/projects/restore-version with an exact,
    // valid target instead of guessing at a version number.
    const nextVersion = previousVersion + 1;
    const { error: insertError } = await supabase.from("project_versions").insert({
      project_id: projectId,
      version: nextVersion,
      files: updatedFiles,
      pages: version.pages,
      prompt_answers: { ...(version.prompt_answers as Record<string, unknown>), __edit_reason: "AI edit", __target_file: targetFile },
    });
    if (insertError) throw insertError;

    await supabase
      .from("projects")
      .update({ current_version: nextVersion, updated_at: new Date().toISOString() })
      .eq("id", projectId);

    await spendCredits(user!.id, "ai_edit", { isAdmin: gate.isAdmin, cacheHit, projectId });

    return NextResponse.json({ files: updatedFiles, cacheHit, previousVersion, targetFile });
  } catch (err) {
    console.error("ai-edit error", err, "user:", user!.id);
    // Nothing was deducted yet for a failed edit — refunding here would create
    // free credits instead of correcting a real charge.
    return NextResponse.json(
      { message: "Edit failed. No credits were charged — try again." },
      { status: 500 }
    );
  }
}
