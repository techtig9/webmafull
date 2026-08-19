import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { decryptDeployToken } from "@/lib/deploy-secrets";

export async function GET(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const id = new URL(request.url).searchParams.get("deploymentId");
  if (!id) return NextResponse.json({ message: "deploymentId is required." }, { status: 400 });

  const supabase = createServiceRoleClient();
  const { data: deployment } = await supabase.from("deployments").select("id, project_id, provider_deployment_id, project:projects(user_id)").eq("id", id).single();
  if (!deployment || (deployment.project as { user_id?: string } | null)?.user_id !== user!.id) {
    return NextResponse.json({ message: "Deployment not found." }, { status: 404 });
  }
  if (!deployment.provider_deployment_id) return NextResponse.json({ status: "queued" });

  const { data: connection } = await supabase
    .from("deploy_connections")
    .select("access_token_ciphertext, access_token_secret_id")
    .eq("user_id", user!.id)
    .eq("provider", "vercel")
    .maybeSingle();
  let token: string | undefined;
  if (connection?.access_token_ciphertext) token = decryptDeployToken(connection.access_token_ciphertext);
  else if (connection?.access_token_secret_id) {
    token = (await supabase.rpc("deploy_token_decrypt", { p_secret_id: connection.access_token_secret_id })).data ?? undefined;
  }
  token = token ?? process.env.VERCEL_API_TOKEN;
  if (!token) return NextResponse.json({ status: "building", message: "Deployment status provider token is not configured." });

  try {
    const res = await fetch(`https://api.vercel.com/v13/deployments/${deployment.provider_deployment_id}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) return NextResponse.json({ status: "building", message: data.error?.message ?? "Status check unavailable." });

    const status = data.readyState === "READY" ? "ready" : data.readyState === "ERROR" ? "error" : "building";
    const logs = status === "error" ? `Vercel deployment state: ${data.readyState ?? "ERROR"}` : null;
    await supabase.from("deployments").update({ status, logs }).eq("id", deployment.id);
    if (status === "ready") await supabase.from("projects").update({ status: "deployed" }).eq("id", deployment.project_id);
    return NextResponse.json({ status, deploymentUrl: data.url ? `https://${data.url}` : null, logs });
  } catch {
    return NextResponse.json({ status: "building", message: "Temporary status check failure." });
  }
}
