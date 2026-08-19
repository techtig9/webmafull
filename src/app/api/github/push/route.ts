import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { decryptDeployToken } from "@/lib/deploy-secrets";
import { ensureRepo, pushFilesAsCommit, sanitizeRepoName } from "@/lib/github";
import { z } from "zod";
import { validate } from "@/lib/validation";

const pushSchema = z.object({ projectId: z.string().uuid() });

/** One-way sync only: webma -> GitHub. Every push overwrites the repo's
 * default branch with the project's current files, with no pull-from-GitHub
 * and no conflict detection against changes made directly in the repo. That
 * is a deliberate, documented scope boundary (see docs/GAP_ANALYSIS.md) —
 * bidirectional sync needs real conflict resolution between webma's own
 * version history and independent git history, which is a substantially
 * bigger project than a one-way push. */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(pushSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: project } = await supabase
    .from("projects")
    .select("user_id, name, current_version")
    .eq("id", projectId)
    .single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data: connection } = await supabase
    .from("deploy_connections")
    .select("access_token_ciphertext")
    .eq("user_id", user!.id)
    .eq("provider", "github")
    .maybeSingle();
  if (!connection) {
    return NextResponse.json({ message: "Connect GitHub before pushing this project." }, { status: 400 });
  }
  if (!connection.access_token_ciphertext) {
    return NextResponse.json({ message: "Your GitHub connection looks incomplete — reconnect GitHub and try again." }, { status: 400 });
  }

  const { data: version } = await supabase
    .from("project_versions")
    .select("files")
    .eq("project_id", projectId)
    .eq("version", project.current_version)
    .single();
  if (!version) {
    return NextResponse.json({ message: "Nothing to push yet." }, { status: 400 });
  }

  try {
    const accessToken = decryptDeployToken(connection.access_token_ciphertext);
    const repoName = sanitizeRepoName(project.name);
    const repo = await ensureRepo(accessToken, repoName);
    const { commitUrl } = await pushFilesAsCommit(
      accessToken,
      repo,
      version.files as Record<string, string>,
      `Sync from webma (v${project.current_version})`
    );

    await supabase.from("deployments").insert({
      project_id: projectId,
      provider: "github",
      provider_deployment_id: repo.fullName,
      status: "success",
      deployment_url: repo.htmlUrl,
      logs: `Pushed to ${commitUrl}`,
    });

    return NextResponse.json({ repoUrl: repo.htmlUrl, commitUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "GitHub push failed.";
    await supabase.from("deployments").insert({
      project_id: projectId,
      provider: "github",
      status: "failed",
      logs: message,
    });
    return NextResponse.json({ message }, { status: 502 });
  }
}
