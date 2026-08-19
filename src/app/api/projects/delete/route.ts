import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";
import { validate, deleteProjectSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(deleteProjectSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId } = parsed.data;

  const supabase = createServiceRoleClient();

  const { data: project } = await supabase.from("projects").select("user_id, name").eq("id", projectId).single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  // Versions, deployments, and custom domains all cascade-delete with the project.
  // credit_ledger rows referencing it are kept (project_id just goes null) — that's
  // audit history, not something a project delete should erase.
  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) return NextResponse.json({ message: "Couldn't delete that project." }, { status: 500 });

  await writeAuditLog({
    actorId: user!.id,
    actorRole: "user",
    action: "project.deleted",
    targetId: projectId,
    metadata: { name: project.name },
  });

  return NextResponse.json({ ok: true });
}
