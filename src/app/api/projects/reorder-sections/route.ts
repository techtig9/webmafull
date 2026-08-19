import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { isValidReorder, resolvePages, type Page } from "@/lib/preview";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate, reorderSectionsSchema } from "@/lib/validation";

/** Persists a new section order within a single page — the server-side half of the
 * visual editor's drag-to-reorder panel. Mirrors reorder-pages/route.ts, one level
 * down: that endpoint reorders which pages come first, this reorders which sections
 * come first within one page. Both write to the same project_versions.pages column,
 * so a page's `sections` array is the single source of truth for render order that
 * buildPreviewHtml (src/lib/preview.ts) and export both read from. */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(reorderSectionsSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, slug, orderedSections } = parsed.data;

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
  const targetIndex = pages.findIndex((p) => p.slug === slug);
  if (targetIndex === -1) {
    return NextResponse.json({ message: "Page not found." }, { status: 404 });
  }

  const target = pages[targetIndex];
  if (!isValidReorder(target.sections, orderedSections)) {
    return NextResponse.json(
      { message: "orderedSections must contain exactly this page's existing sections." },
      { status: 400 }
    );
  }

  const nextPages = pages.map((p, i) => (i === targetIndex ? { ...p, sections: orderedSections } : p));

  const { error } = await supabase
    .from("project_versions")
    .update({ pages: nextPages as unknown as Json })
    .eq("project_id", projectId)
    .eq("version", project.current_version);
  if (error) return NextResponse.json({ message: "Couldn't reorder sections." }, { status: 500 });

  return NextResponse.json({ pages: nextPages });
}
