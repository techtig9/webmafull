import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  if (!projectId) {
    return NextResponse.json({ message: "projectId is required." }, { status: 400 });
  }

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("deployments")
    .select("id, provider, provider_deployment_id, deployment_url, status, logs, created_at")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ deployments: data });
}
