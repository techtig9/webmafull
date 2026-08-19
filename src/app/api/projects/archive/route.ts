import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate, archiveProjectSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(archiveProjectSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, archived } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: project } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("projects")
    .update({ archived, updated_at: new Date().toISOString() })
    .eq("id", projectId);

  if (error) return NextResponse.json({ message: "Couldn't update that project." }, { status: 500 });

  return NextResponse.json({ ok: true, archived });
}
