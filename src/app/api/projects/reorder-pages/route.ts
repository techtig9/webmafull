import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resolvePages, type Page } from "@/lib/preview";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate, reorderPagesSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(reorderPagesSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, orderedSlugs } = parsed.data;

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
    return NextResponse.json({ message: "Nothing to reorder yet." }, { status: 404 });
  }

  const files = version.files as Record<string, string>;
  const pages = resolvePages(files, version.pages as Page[] | null);

  if (orderedSlugs.length !== pages.length || !orderedSlugs.every((s) => pages.some((p) => p.slug === s))) {
    return NextResponse.json({ message: "orderedSlugs must contain exactly the project's existing page slugs." }, { status: 400 });
  }

  const bySlug = new Map(pages.map((p) => [p.slug, p]));
  const reordered = orderedSlugs.map((s) => bySlug.get(s)!);

  const { error } = await supabase
    .from("project_versions")
    .update({ pages: reordered as unknown as Json })
    .eq("project_id", projectId)
    .eq("version", project.current_version);
  if (error) return NextResponse.json({ message: "Couldn't reorder pages." }, { status: 500 });

  return NextResponse.json({ pages: reordered });
}
