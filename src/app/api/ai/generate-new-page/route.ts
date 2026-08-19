import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { generateNewPage } from "@/lib/gemini";
import { resolvePages } from "@/lib/preview";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { validate, generateNewPageSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:generate-new-page`, 15, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(generateNewPageSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, pageName, pageDescription } = parsed.data;

  const gate = await canUseFeature(user!.id, "generate_new_page");
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
    .select("files, pages")
    .eq("project_id", projectId)
    .eq("version", project.current_version)
    .single();
  if (!version) {
    return NextResponse.json({ message: "Nothing to add a page to yet." }, { status: 404 });
  }

  const existingFiles = version.files as Record<string, string>;
  const existingPages = resolvePages(existingFiles, version.pages as ReturnType<typeof resolvePages> | null);

  try {
    const { result, cacheHit } = await generateNewPage(existingFiles, existingPages, pageName, pageDescription);

    if (existingPages.some((p) => p.slug === result.page.slug)) {
      return NextResponse.json(
        { message: `A page with slug "${result.page.slug}" already exists — try a different page name.` },
        { status: 409 }
      );
    }

    const mergedFiles = { ...existingFiles, ...result.files };
    const mergedPages = [...existingPages, result.page];

    // New pages apply in place on the current version — like AI edits and theme
    // changes, this doesn't mint a new version-history entry; only Generate/
    // Regenerate do that.
    const { error } = await supabase
      .from("project_versions")
      .update({ files: mergedFiles, pages: mergedPages as unknown as Json })
      .eq("project_id", projectId)
      .eq("version", project.current_version);
    if (error) throw error;

    await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);
    await spendCredits(user!.id, "generate_new_page", { isAdmin: gate.isAdmin, cacheHit, projectId });

    return NextResponse.json({ files: mergedFiles, pages: mergedPages, cacheHit });
  } catch (err) {
    console.error("generate-new-page error", err, "user:", user!.id);
    return NextResponse.json(
      { message: "Couldn't generate that page. No credits were charged — try again." },
      { status: 500 }
    );
  }
    }
