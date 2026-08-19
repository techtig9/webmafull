import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resolvePages, type Page } from "@/lib/preview";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate, deletePageSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(deletePageSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, slug } = parsed.data;

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
    return NextResponse.json({ message: "Nothing to delete yet." }, { status: 404 });
  }

  const files = version.files as Record<string, string>;
  const pages = resolvePages(files, version.pages as Page[] | null);

  if (pages.length <= 1) {
    return NextResponse.json({ message: "A site needs at least one page — can't delete the last one." }, { status: 400 });
  }
  if (!pages.some((p) => p.slug === slug)) {
    return NextResponse.json({ message: "That page doesn't exist." }, { status: 404 });
  }

  const updatedPages = pages.filter((p) => p.slug !== slug);

  // Clean up component files that were only used by the deleted page (e.g. a
  // page-specific section like ContactForm) — but keep anything still referenced
  // by a remaining page (Navbar/Footer are always shared, so they always survive).
  const stillUsed = new Set(updatedPages.flatMap((p) => p.sections));
  const updatedFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    const componentName = path.replace(/^components\//, "").replace(/\.tsx?$/, "");
    if (stillUsed.has(componentName)) updatedFiles[path] = content;
  }

  const { error } = await supabase
    .from("project_versions")
    .update({ files: updatedFiles, pages: updatedPages as unknown as Json })
    .eq("project_id", projectId)
    .eq("version", project.current_version);
  if (error) return NextResponse.json({ message: "Couldn't delete that page." }, { status: 500 });

  return NextResponse.json({ files: updatedFiles, pages: updatedPages });
}
