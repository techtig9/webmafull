import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resolvePages, type Page } from "@/lib/preview";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate, renamePageSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(renamePageSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, slug, name } = parsed.data;

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
    return NextResponse.json({ message: "Nothing to rename yet." }, { status: 404 });
  }

  const files = version.files as Record<string, string>;
  const pages = resolvePages(files, version.pages as Page[] | null);
  const target = pages.find((p) => p.slug === slug);
  if (!target) {
    return NextResponse.json({ message: "That page doesn't exist." }, { status: 404 });
  }

  const updatedPages = pages.map((p) => (p.slug === slug ? { ...p, name } : p));

  const { error } = await supabase
    .from("project_versions")
    .update({ pages: updatedPages as unknown as Json })
    .eq("project_id", projectId)
    .eq("version", project.current_version);
  if (error) return NextResponse.json({ message: "Couldn't rename that page." }, { status: 500 });

  return NextResponse.json({ pages: updatedPages });
  }
