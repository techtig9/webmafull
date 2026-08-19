import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { deployToVercel } from "@/lib/deploy";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { buildNextPageForSections, buildRootLayout, buildAnalyticsTrackerComponent, NEXT_CONFIG, TAILWIND_CONFIG_NEXT, POSTCSS_CONFIG, GLOBALS_CSS, normalizeGeneratedComponentSource } from "@/lib/scaffold";
import { resolvePages } from "@/lib/preview";
import { decryptDeployToken } from "@/lib/deploy-secrets";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { projectId } = await request.json();
  const gate = await canUseFeature(user!.id, "deploy_vercel");
  if (!gate.allowed) {
    return NextResponse.json({ message: gate.message }, { status: 403 });
  }

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase
    .from("projects")
    .select("id, name, description, user_id, seo_title, seo_description, seo_og_image_url")
    .eq("id", projectId)
    .single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { data: version } = await supabase
    .from("project_versions")
    .select("files, pages")
    .eq("project_id", projectId)
    .order("version", { ascending: false })
    .limit(1)
    .single();
  if (!version) {
    return NextResponse.json({ message: "Nothing to deploy yet." }, { status: 404 });
  }

  const files = version.files as Record<string, string>;
  const pages = resolvePages(files, version.pages as ReturnType<typeof resolvePages> | null);
  const seoTitle = project.seo_title || project.name;
  const seoDescription = project.seo_description || project.description || "";
  const pageFiles: Record<string, string> = {};
  for (const page of pages) {
    const depth = page.slug === "index" ? 1 : 2;
    const pagePath = page.slug === "index" ? "app/page.tsx" : `app/${page.slug}/page.tsx`;
    pageFiles[pagePath] = buildNextPageForSections(page.sections, depth, {
      title: page.seoTitle ?? (page.slug === "index" ? undefined : page.name),
      description: page.seoDescription,
      ogImageUrl: page.seoOgImageUrl,
    });
  }
  const normalizedFiles = Object.fromEntries(Object.entries(files).map(([path, content]) => [
    path, path.startsWith("components/") ? normalizeGeneratedComponentSource(content, path.replace(/^components\//, "").replace(/\.tsx?$/, "")) : content,
  ]));

  const filesToDeploy: Record<string, string> = {
    ...normalizedFiles,
    "app/layout.tsx": buildRootLayout({
      seoTitle,
      seoDescription,
      ogImageUrl: project.seo_og_image_url ?? undefined,
      // Deployed through webma's own publish flow — analytics tracking is
      // part of what "deploy with webma" means (see the no-tracking-on-raw-
      // export decision in export-zip/route.ts for the contrast).
      analyticsProjectId: projectId,
      analyticsAppUrl: process.env.NEXT_PUBLIC_APP_URL,
    }),
    // Only written when analytics is actually enabled (always true for this
    // route today, but written this way rather than unconditionally so the
    // file simply doesn't exist in a build where it'd otherwise be dead
    // code) — buildRootLayout's import of "./_webma-analytics" would be an
    // unresolvable module error without it.
    ...(projectId ? { "app/_webma-analytics.tsx": buildAnalyticsTrackerComponent() } : {}),
    ...pageFiles,
    "app/globals.css": GLOBALS_CSS,
    "next.config.js": NEXT_CONFIG,
    "tailwind.config.js": TAILWIND_CONFIG_NEXT,
    "postcss.config.js": POSTCSS_CONFIG,
    "package.json": JSON.stringify(
      {
        name: project.name.toLowerCase().replace(/\s+/g, "-"),
        version: "0.1.0",
        private: true,
        scripts: { dev: "next dev", build: "next build", start: "next start" },
        dependencies: { react: "^18.3.1", "react-dom": "^18.3.1", next: "^14.2.5", "lucide-react": "^0.417.0" },
        devDependencies: { tailwindcss: "^3.4.7", postcss: "^8.4.40", autoprefixer: "^10.4.19" },
      },
      null,
      2
    ),
  };

  const { data: deployment } = await supabase
    .from("deployments")
    .insert({ project_id: projectId, provider: "vercel", status: "queued" })
    .select("id")
    .single();

  try {
    const { data: connection } = await supabase
      .from("deploy_connections")
      .select("access_token_ciphertext, access_token_secret_id")
      .eq("user_id", user!.id)
      .eq("provider", "vercel")
      .maybeSingle();

    let userToken: string | undefined;
    if (connection?.access_token_ciphertext) {
      userToken = decryptDeployToken(connection.access_token_ciphertext);
    } else if (connection?.access_token_secret_id) {
      // Backward compatibility for existing installations that already use Supabase Vault.
      userToken = (await supabase.rpc("deploy_token_decrypt", { p_secret_id: connection.access_token_secret_id })).data ?? undefined;
    }

    const result = await deployToVercel(project.name, filesToDeploy, userToken);
    await supabase
      .from("deployments")
      .update({ deployment_url: result.deploymentUrl, status: result.status, logs: result.logs ?? null, provider_deployment_id: result.providerDeploymentId ?? null })
      .eq("id", deployment!.id);

    if (result.status === "error") {
      return NextResponse.json({ message: result.logs ?? "Deployment failed." }, { status: 500 });
    }

    await spendCredits(user!.id, "deploy_vercel", { isAdmin: gate.isAdmin, projectId });
    await supabase.from("projects").update({ status: "deployed" }).eq("id", projectId);

    return NextResponse.json({ deploymentUrl: result.deploymentUrl, status: result.status });
  } catch (err) {
    console.error("deploy-vercel error", err, "user:", user!.id);
    await supabase.from("deployments").update({ status: "error" }).eq("id", deployment!.id);
    return NextResponse.json(
      { message: "Vercel isn't connected yet — add VERCEL_API_TOKEN to your environment." },
      { status: 500 }
    );
  }
                                }
