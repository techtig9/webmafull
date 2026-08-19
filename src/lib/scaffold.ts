// Turns the flat `components/*.tsx` file map (what the AI actually generates) into
// a real, working project — for both live deploys and downloaded exports.
//
// This exists because neither deploy nor export previously assembled the pieces
// into an actual running app: the raw component files were shipped with no page
// that imports and renders them, and no Tailwind configuration to turn all those
// className strings into actual CSS. A deployed or exported site would build (or
// half-build) but show a blank, unstyled page — the generation/editing/preview
// pipeline worked, but the "ship it" step silently didn't.

function componentNamesFrom(files: Record<string, string>) {
  return Object.keys(files)
    .filter((f) => f.startsWith("components/"))
    .map((f) => f.replace(/^components\//, "").replace(/\.tsx?$/, ""));
}

/** Normalize AI component exports for generated projects. Older Webma generations
 * sometimes returned named component exports; deployment/export pages use default
 * imports. This compatibility layer fixes that shape without changing stored source. */
export function normalizeGeneratedComponentSource(source: string, componentName: string): string {
  if (/export\s+default\s+/.test(source)) return source;
  const fn = new RegExp(`export\\s+function\\s+${componentName}\\s*\\(`);
  if (fn.test(source)) return source.replace(fn, `export default function ${componentName}(`);
  const arrow = new RegExp(`export\\s+const\\s+${componentName}\\s*=`);
  if (arrow.test(source)) return source.replace(arrow, `const ${componentName} =`) + `\n\nexport default ${componentName};\n`;
  return source;
}

/** app/page.tsx for a Next.js deploy or export — imports every generated
 * component and renders them in order, exactly like the preview does.
 * Used as the single-page fallback for projects without a pages structure. */
export function buildNextPage(files: Record<string, string>): string {
  const names = componentNamesFrom(files);
  return buildNextPageForSections(names, 1);
}

/** Same idea, but for one specific page's section list — the multi-page case,
 * where each page only renders its own sections (shared ones like Navbar/Footer
 * appear in more than one page's list, importing the same underlying file).
 *
 * `depth` is how many folders deep this page.tsx sits under the project root —
 * the home page lives at app/page.tsx (depth 1, so "../components/X"), but
 * every other page lives at app/{slug}/page.tsx (depth 2, so "../../components/X").
 * Getting this wrong doesn't fail loudly — it just makes the import unresolvable.
 *
 * `seo`, when given, adds a page-level `metadata` export — Next.js App Router
 * uses this to override the site-wide default from layout.tsx for just this one
 * page. Omit any field to fall back to the layout's default for that field. */
export function buildNextPageForSections(
  sectionNames: string[],
  depth: number,
  seo?: { title?: string; description?: string; ogImageUrl?: string }
): string {
  const prefix = "../".repeat(depth) + "components/";
  const imports = sectionNames.map((name) => `import ${name} from "${prefix}${name}";`).join("\n");
  const elements = sectionNames.map((name) => `      <${name} />`).join("\n");

  const hasSeo = seo && (seo.title || seo.description || seo.ogImageUrl);
  const metadataBlock = hasSeo
    ? `import type { Metadata } from "next";\n\nexport const metadata: Metadata = {\n${
        seo!.title ? `  title: ${JSON.stringify(seo!.title)},\n` : ""
      }${seo!.description ? `  description: ${JSON.stringify(seo!.description)},\n` : ""}${
        seo!.ogImageUrl ? `  openGraph: { images: [${JSON.stringify(seo!.ogImageUrl)}] },\n` : ""
      }};\n\n`
    : "";

  return `${metadataBlock}${imports}\n\nexport default function Page() {\n  return (\n    <>\n${elements}\n    </>\n  );\n}\n`;
}

export const NEXT_CONFIG = `/** @type {import('next').NextConfig} */\nconst nextConfig = {};\n\nmodule.exports = nextConfig;\n`;

export const TAILWIND_CONFIG_NEXT = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n`;

export const TAILWIND_CONFIG_VITE = `/** @type {import('tailwindcss').Config} */\nmodule.exports = {\n  content: ["./index.html", "./src/**/*.{ts,tsx}"],\n  theme: { extend: {} },\n  plugins: [],\n};\n`;

export const POSTCSS_CONFIG = `module.exports = {\n  plugins: { tailwindcss: {}, autoprefixer: {} },\n};\n`;

export const GLOBALS_CSS = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;

/** Builds the exported/deployed project's root layout (app/layout.tsx), with
 * an optional pageview-tracking client component. Both export-zip and
 * deploy-vercel used to each carry their own copy of this template as an
 * inline string — identical today, but with no way to keep them that way
 * as either evolved, which is exactly the kind of duplication that quietly
 * drifts apart. One shared builder instead.
 *
 * When analytics is enabled, this imports and renders the client component
 * from buildAnalyticsTrackerComponent below rather than embedding a plain
 * <script> — a static script only ever fires once per real page load
 * (direct visits, refreshes, non-SPA navigation), not on client-side App
 * Router Link navigation within the site, which doesn't reload the
 * document at all. usePathname() inside a "use client" component is the
 * only way to actually observe those transitions. */
export function buildRootLayout(options: {
  seoTitle: string;
  seoDescription: string;
  ogImageUrl?: string;
  analyticsProjectId?: string;
  analyticsAppUrl?: string;
}): string {
  const { seoTitle, seoDescription, ogImageUrl, analyticsProjectId, analyticsAppUrl } = options;

  const trackerImport = analyticsProjectId ? `import WebmaAnalyticsTracker from "./_webma-analytics";\n` : "";
  const trackerElement = analyticsProjectId
    ? `\n        <WebmaAnalyticsTracker projectId={${JSON.stringify(analyticsProjectId)}} appUrl={${JSON.stringify(
        analyticsAppUrl ?? ""
      )}} />`
    : "";

  return `import type { Metadata } from "next";
import "./globals.css";
${trackerImport}
export const metadata: Metadata = {
  title: ${JSON.stringify(seoTitle)},
  description: ${JSON.stringify(seoDescription)},
  ${ogImageUrl ? `openGraph: { images: [${JSON.stringify(ogImageUrl)}] },` : ""}
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}${trackerElement}
      </body>
    </html>
  );
}
`;
}

/** The client component buildRootLayout imports when analytics is enabled —
 * app/_webma-analytics.tsx in the deployed project (the leading underscore
 * is Next.js App Router's convention for a folder/file that's never itself
 * routable). usePathname()'s dependency in the effect below re-fires on
 * every client-side navigation, not just the initial mount, which is the
 * entire reason this exists as a component instead of a layout-embedded
 * script. Only ever written into a deploy-vercel output, never into a raw
 * export — see the no-tracking-in-downloaded-code decision where
 * buildRootLayout is called without analyticsProjectId in export-zip/route.ts. */
export function buildAnalyticsTrackerComponent(): string {
  return `"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function WebmaAnalyticsTracker({ projectId, appUrl }: { projectId: string; appUrl: string }) {
  const pathname = usePathname();

  useEffect(() => {
    try {
      fetch(appUrl + "/api/public/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId,
          path: pathname,
          referrer: document.referrer || undefined,
        }),
      }).catch(function () {});
    } catch (e) {}
  }, [pathname, projectId, appUrl]);

  return null;
}
`;
}

/** src/App.tsx for a Vite/React export — same idea as buildNextPage, different
 * import path and export shape (Vite doesn't use Next's app-router page convention).
 * Kept as the fallback for the (now-unused-by-export-zip, but still exported in
 * case anything else needs it) single-flat-page case. */
export function buildViteApp(files: Record<string, string>): string {
  const names = componentNamesFrom(files);
  const imports = names.map((name) => `import ${name} from "./components/${name}";`).join("\n");
  const elements = names.map((name) => `      <${name} />`).join("\n");
  return `${imports}\n\nexport default function App() {\n  return (\n    <>\n${elements}\n    </>\n  );\n}\n`;
}

function pageComponentName(pageName: string): string {
  const clean = pageName.replace(/[^A-Za-z0-9]/g, "");
  return `${clean || "Untitled"}Page`;
}

/** Real multi-page App.tsx for a Vite/React export, using react-router-dom for
 * actual client-side routing — one route per page, each rendering that page's own
 * sections. This is what makes the downloaded React project navigate between pages
 * for real (not just show one flattened page), matching what Next.js export/deploy
 * already do with real file-based routes. */
export function buildViteAppWithRouter(pages: { path: string; name: string; sections: string[] }[]): string {
  const allComponentNames = Array.from(new Set(pages.flatMap((p) => p.sections)));
  const imports = allComponentNames.map((name) => `import ${name} from "./components/${name}";`).join("\n");

  const pageFunctions = pages
    .map((page) => {
      const fnName = pageComponentName(page.name);
      const elements = page.sections.map((name) => `      <${name} />`).join("\n");
      return `function ${fnName}() {\n  return (\n    <>\n${elements}\n    </>\n  );\n}`;
    })
    .join("\n\n");

  const routes = pages
    .map((page) => `        <Route path="${page.path}" element={<${pageComponentName(page.name)} />} />`)
    .join("\n");

  return `import { BrowserRouter, Routes, Route } from "react-router-dom";\n${imports}\n\n${pageFunctions}\n\nexport default function App() {\n  return (\n    <BrowserRouter>\n      <Routes>\n${routes}\n      </Routes>\n    </BrowserRouter>\n  );\n}\n`;
}

export const VITE_MAIN_TSX = `import React from "react";\nimport ReactDOM from "react-dom/client";\nimport App from "./App";\nimport "./index.css";\n\nReactDOM.createRoot(document.getElementById("root")!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`;

export const VITE_CONFIG = `import { defineConfig } from "vite";\nimport react from "@vitejs/plugin-react";\n\nexport default defineConfig({\n  plugins: [react()],\n});\n`;
