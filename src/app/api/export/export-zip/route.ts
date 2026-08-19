import { NextResponse } from "next/server";
import JSZip from "jszip";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  buildNextPageForSections,
  buildRootLayout,
  buildViteAppWithRouter,
  NEXT_CONFIG,
  TAILWIND_CONFIG_NEXT,
  TAILWIND_CONFIG_VITE,
  POSTCSS_CONFIG,
  GLOBALS_CSS,
  VITE_MAIN_TSX,
  VITE_CONFIG,
  normalizeGeneratedComponentSource,
} from "@/lib/scaffold";
import { resolvePages } from "@/lib/preview";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const { projectId, format } = (await request.json()) as {
    projectId: string;
    format: "zip" | "react" | "nextjs";
  };
  if (!projectId) {
    return NextResponse.json({ message: "projectId is required." }, { status: 400 });
  }

  const gate = await canUseFeature(user!.id, "export_code");
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
    return NextResponse.json({ message: "Nothing to export yet." }, { status: 404 });
  }

  const zip = new JSZip();
  const rawFiles = version.files as Record<string, string>;
  const files = Object.fromEntries(Object.entries(rawFiles).map(([path, content]) => [
    path, path.startsWith("components/") ? normalizeGeneratedComponentSource(content, path.replace(/^components\//, "").replace(/\.tsx?$/, "")) : content,
  ]));
  const pages = resolvePages(files, version.pages as ReturnType<typeof resolvePages> | null);
  const isNextProject = format === "nextjs";

  const seoTitle = project.seo_title || project.name;
  const seoDescription = project.seo_description || project.description || "";

  for (const [path, content] of Object.entries(files)) {
    const target = isNextProject ? `src/app/${path}` : `src/${path}`;
    zip.file(target, content);
  }

  if (isNextProject) {
    zip.file(
      "src/app/layout.tsx",
      // No analytics tracking on a downloaded export — this project is
      // leaving webma's hosting entirely to be self-hosted elsewhere, and
      // silently shipping a phone-home call in code someone downloads to
      // run independently isn't something to do without explicit,
      // separate consent. Tracking is only wired in for sites actually
      // published through webma's own deploy flow (deploy-vercel/route.ts).
      buildRootLayout({ seoTitle, seoDescription, ogImageUrl: project.seo_og_image_url ?? undefined })
    );
    for (const page of pages) {
      const depth = page.slug === "index" ? 1 : 2;
      const pagePath = page.slug === "index" ? "src/app/page.tsx" : `src/app/${page.slug}/page.tsx`;
      zip.file(
        pagePath,
        buildNextPageForSections(page.sections, depth, {
          title: page.seoTitle ?? (page.slug === "index" ? undefined : page.name),
          description: page.seoDescription,
          ogImageUrl: page.seoOgImageUrl,
        })
      );
    }
    zip.file("src/app/globals.css", GLOBALS_CSS);
    zip.file("next.config.js", NEXT_CONFIG);
    zip.file("tailwind.config.js", TAILWIND_CONFIG_NEXT);
    zip.file("postcss.config.js", POSTCSS_CONFIG);
  } else {
    zip.file(
      "index.html",
      `<!doctype html>\n<html lang="en">\n  <head>\n    <meta charset="utf-8" />\n    <title>${seoTitle}</title>\n    <meta name="description" content="${seoDescription}" />\n    ${project.seo_og_image_url ? `<meta property="og:image" content="${project.seo_og_image_url}" />` : ""}\n    <meta name="viewport" content="width=device-width, initial-scale=1" />\n  </head>\n  <body>\n    <div id="root"></div>\n    <script type="module" src="/src/main.tsx"></script>\n  </body>\n</html>\n`
    );
    zip.file("src/App.tsx", buildViteAppWithRouter(pages));
    zip.file("src/main.tsx", VITE_MAIN_TSX);
    zip.file("src/index.css", GLOBALS_CSS);
    zip.file("vite.config.ts", VITE_CONFIG);
    zip.file("tailwind.config.js", TAILWIND_CONFIG_VITE);
    zip.file("postcss.config.js", POSTCSS_CONFIG);
  }

  zip.file(
    "package.json",
    JSON.stringify(
      {
        name: project.name.toLowerCase().replace(/\s+/g, "-"),
        version: "0.1.0",
        private: true,
        scripts: isNextProject
          ? { dev: "next dev", build: "next build", start: "next start" }
          : { dev: "vite", build: "vite build", preview: "vite preview" },
        dependencies: {
          react: "^18.3.1",
          "react-dom": "^18.3.1",
          "lucide-react": "^0.417.0",
          ...(isNextProject ? { next: "^14.2.5" } : { "react-router-dom": "^6.26.0" }),
        },
        devDependencies: {
          tailwindcss: "^3.4.7",
          postcss: "^8.4.40",
          autoprefixer: "^10.4.19",
          ...(isNextProject ? {} : { vite: "^5.4.0", "@vitejs/plugin-react": "^4.3.1", typescript: "^5.5.4" }),
        },
      },
      null,
      2
    )
  );

  zip.file(
    "README.md",
    `# ${project.name}\n\nGenerated by webma — built by Techtig.\n\n## Getting started\n\n\`\`\`\nnpm install\nnpm run dev\n\`\`\`\n`
  );

  const buffer = await zip.generateAsync({ type: "nodebuffer" });

  await spendCredits(user!.id, "export_code", { isAdmin: gate.isAdmin, projectId });

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${project.name}-${format}.zip"`,
    },
  });
}
