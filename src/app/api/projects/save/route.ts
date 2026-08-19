import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";
import { saveProjectSchema, validate } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(saveProjectSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, files, pages } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase
    .from("projects")
    .select("user_id, current_version")
    .eq("id", projectId)
    .single();

  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  // `pages` carries in-flight page/section-order edits (e.g. from drag-to-reorder)
  // that would otherwise only be durable if a dedicated endpoint happened to save
  // them — this generic autosave path previously wrote `files` only and silently
  // dropped any pending `pages` state, even though the column exists precisely to
  // hold it. Only overwrite it when the client actually sent something.
  const updatePayload: { files: Record<string, string>; pages?: Json } =
    pages !== undefined ? { files, pages: pages as unknown as Json } : { files };

  const { error } = await supabase
    .from("project_versions")
    .update(updatePayload)
    .eq("project_id", projectId)
    .eq("version", project.current_version);

  if (error) {
    return NextResponse.json({ message: "Autosave failed." }, { status: 500 });
  }

  await supabase.from("projects").update({ updated_at: new Date().toISOString() }).eq("id", projectId);

  return NextResponse.json({ ok: true });
}
