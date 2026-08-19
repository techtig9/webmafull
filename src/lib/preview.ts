// Renders the generated site's files inside an iframe without a bundler, so the
// dashboard's Live Preview can update instantly as sections are generated/edited.
// Real export (ZIP / React / Next.js project) uses the ORIGINAL files with their
// imports/exports intact — this stripped-down version is preview-only.

/** Removes import/export syntax so each file becomes a plain global function
 * declaration that Babel Standalone can run directly in the browser, no bundler needed. */
function stripModuleSyntax(code: string): string {
  return code
    .replace(/^\s*import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/^\s*import\s+['"][^'"]+['"];?\s*$/gm, "")
    .replace(/export\s+default\s+function/g, "function")
    .replace(/export\s+default\s+/g, "")
    .replace(/export\s+(function|const|class)/g, "$1");
}

/** Derives the section render order directly from the generated file map, so
 * reloading a saved project (which only persists `files`) can rebuild the same
 * preview without depending on Gemini's separate `sections` list staying in sync. */
export function deriveSections(files: Record<string, string>): string[] {
  return Object.keys(files)
    .filter((f) => f.startsWith("components/"))
    .map((f) => f.replace(/^components\//, "").replace(/\.tsx?$/, ""));
}

export interface Page {
  slug: string;
  path: string;
  name: string;
  sections: string[];
  // Optional per-page overrides — when unset, export/deploy fall back to the
  // project's site-wide SEO settings (or just the page/site name) for that page.
  seoTitle?: string;
  seoDescription?: string;
  seoOgImageUrl?: string;
}

/** Falls back to one implicit "Home" page containing every section, for projects
 * generated before multi-page support existed (their stored `pages` is null) or
 * on the rare case the AI's page structure comes back malformed. Every existing
 * project keeps working exactly as it does today — this is purely additive. */
export function resolvePages(files: Record<string, string>, pages: Page[] | null | undefined): Page[] {
  if (pages && pages.length > 0) return pages;
  return [{ slug: "index", path: "/", name: "Home", sections: deriveSections(files) }];
}

/** True when `next` is a reordering of exactly `current`'s members — same set, any
 * order — and false if anything was added, removed, or duplicated. Used to validate
 * drag-to-reorder requests server-side before persisting: the client should only
 * ever be able to change order, never smuggle in a section that was never generated. */
export function isValidReorder(current: string[], next: string[]): boolean {
  if (current.length !== next.length) return false;
  const currentCounts = new Map<string, number>();
  for (const s of current) currentCounts.set(s, (currentCounts.get(s) ?? 0) + 1);
  for (const s of next) {
    const count = currentCounts.get(s);
    if (!count) return false;
    currentCounts.set(s, count - 1);
  }
  return true;
}

/** Resolves a section name (e.g. "Hero") to its exact key in `files`,
 * extension and all ("components/Hero.tsx" vs "components/Hero.ts"). This
 * exact lookup used to be duplicated independently in three places
 * (buildPreviewHtml here, seo-audit.ts's pageSource, and about to be a
 * fourth in the Layers panel) — one shared, tested version instead, so a
 * future change to how section names map to files can't update three of
 * the four copies and miss the fourth. */
export function sectionFileKey(files: Record<string, string>, sectionName: string): string {
  const tsx = `components/${sectionName}.tsx`;
  const ts = `components/${sectionName}.ts`;
  return files[tsx] !== undefined ? tsx : files[ts] !== undefined ? ts : tsx;
}

export interface PreviewOptions {
  selectable?: boolean;
  selected?: { tag?: string; text?: string; id?: string; className?: string; file?: string | null } | null;
}

export function buildPreviewHtml(
  files: Record<string, string>,
  sections: string[],
  options: PreviewOptions = {}
): string {
  const componentNames = sections.map((s) => s.replace(/[^A-Za-z0-9]/g, ""));

  // Which real file (exact key in `files`, extension and all) each rendered
  // section actually came from — looked up now, once, rather than guessed at
  // click time, since the click handler only ever sees the DOM, not this map.
  const fileForSection = sections.map((s) => sectionFileKey(files, s));

  const body = Object.values(files).map(stripModuleSyntax).join("\n\n");

  const appSource = `
    function GeneratedApp() {
      return React.createElement(React.Fragment, null,
        ${componentNames
          .map(
            (c, i) =>
              `React.createElement("div", { "data-webma-file": ${JSON.stringify(fileForSection[i])}, style: { display: "contents" } }, typeof ${c} !== "undefined" ? React.createElement(${c}) : null)`
          )
          .join(",\n        ")}
      );
    }
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(GeneratedApp));

    // Marks the element matching options.selected with data-webma-selected,
    // which the [data-webma-selected] stylesheet rule in <head> then outlines.
    // A CSS rule (not an inline style) specifically so it survives the
    // existing hover mouseout handler below, which resets inline outline
    // styles unconditionally — a !important stylesheet rule beats an inline
    // style without !important, so the two effects coexist without the
    // mouseout handler needing to know anything about selection at all.
    // Deliberately best-effort matching (score by id/className/text
    // agreement, keep the highest), not the same exact-match-or-refuse
    // safety bar applyAttributeEdit uses — a wrong highlight is a minor,
    // visible, harmless UX slip, nothing like risking a silent edit to the
    // wrong element, so there's no reason to withhold a highlight just
    // because the match isn't perfectly unique.
    setTimeout(function () {
      var sel = ${JSON.stringify(options.selected ?? null)};
      if (!sel) return;
      var host = sel.file
        ? document.querySelector("[data-webma-file=" + JSON.stringify(sel.file) + "]")
        : document;
      if (!host) return;
      var candidates = host.querySelectorAll(sel.tag);
      var best = null, bestScore = 0;
      for (var i = 0; i < candidates.length; i++) {
        var el = candidates[i];
        var score = 0;
        if (sel.id && el.id === sel.id) score += 3;
        if (sel.className && el.className === sel.className) score += 2;
        if (sel.text) {
          var elText = (el.innerText || el.getAttribute("alt") || "").trim().replace(/\\s+/g, " ").slice(0, 120);
          if (elText === sel.text) score += 1;
        }
        if (score > bestScore) { bestScore = score; best = el; }
      }
      if (best && bestScore > 0) best.setAttribute("data-webma-selected", "true");
    }, 0);
  `;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/babel-standalone/7.25.6/babel.min.js"></script>
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Generated files import hooks by name ("import { useState } from 'react'"),
    but stripModuleSyntax below removes that whole import line — so those names
    need to exist as globals too, or every component using a hook throws
    "useState is not defined" the instant it renders. -->
    <script>
      window.useState = React.useState;
      window.useEffect = React.useEffect;
      window.useRef = React.useRef;
      window.useMemo = React.useMemo;
      window.useCallback = React.useCallback;
      window.useContext = React.useContext;
      window.useReducer = React.useReducer;
      window.useLayoutEffect = React.useLayoutEffect;
    </script>
    <!-- Generated components almost always use lucide-react icons (it's the icon
    library webma itself uses, so Gemini defaults to it too) — without this, every
    icon reference like <Cpu /> or <Menu /> is an undefined variable, which throws
    the instant React tries to render and blanks the whole preview, not just the icon.
    lucide-react's UMD build expects a lowercase "react" global (its factory function
    reads global.react, not global.React) — the bridge line below covers that. -->
    <script>window.react = window.React;</script>
    <script src="https://unpkg.com/lucide-react@0.417.0/dist/umd/lucide-react.min.js"></script>
    <script>
      // NOT Object.assign — lucide-react exports an icon literally named "Infinity",
      // and Object.assign throws outright the instant it can't overwrite a built-in
      // read-only global like window.Infinity, aborting every icon after it too.
      // Plain assignment just silently skips that one collision instead.
      for (var __iconName in window.LucideReact) {
        window[__iconName] = window.LucideReact[__iconName];
      }
    </script>
    <style>body { margin: 0; }
    [data-webma-selected="true"] { outline: 2px solid #5B6CFF !important; outline-offset: 2px; }
    </style>
    <!-- Lets clicking a real <a href="/contact"> link inside the preview actually
    switch pages, instead of trying to navigate the sandboxed iframe away (which
    would just fail silently). Reports the click to the parent window instead of
    following it — LivePreview listens for this and switches the active page tab. -->
    <script>
      document.addEventListener("click", function (e) {
        const anchor = e.target.closest("a");
        const href = anchor && anchor.getAttribute("href");
        if (href && href.startsWith("/")) {
          e.preventDefault();
          window.parent.postMessage({ type: "webma:navigate", path: href }, "*");
          return;
        }
        if (${options.selectable !== false ? "true" : "false"}) {
          e.preventDefault();
          e.stopPropagation();
          const target = e.target.closest("section, header, footer, nav, main, article, button, img, h1, h2, h3, p, a, form, input") || e.target;
          const text = (target.innerText || target.alt || target.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 120);
          const fileHost = target.closest("[data-webma-file]");
          window.parent.postMessage({
            type: "webma:select",
            element: { tag: target.tagName.toLowerCase(), text: text, id: target.id || undefined, className: typeof target.className === "string" ? target.className.slice(0, 160) : undefined, src: target.tagName.toLowerCase() === "img" ? (target.getAttribute("src") || undefined) : undefined, file: fileHost ? fileHost.getAttribute("data-webma-file") : null }
          }, "*");
        }
      }, true);
      document.addEventListener("mouseover", function (e) {
        if (${options.selectable !== false ? "true" : "false"}) {
          const target = e.target.closest("section, header, footer, nav, main, article, button, img, h1, h2, h3, p, a, form, input");
          if (target) target.style.outline = "2px solid rgba(91,108,255,.65)";
        }
      }, true);
      document.addEventListener("mouseout", function (e) {
        const target = e.target.closest("section, header, footer, nav, main, article, button, img, h1, h2, h3, p, a, form, input");
        if (target) target.style.outline = "";
      }, true);
    </script>
  </head>
  <body>
    <div id="root">
      <div style="font-family: sans-serif; padding: 2rem; color: #999;">Generating preview…</div>
    </div>
    <script type="text/babel" data-presets="react">
      ${body}
      ${appSource}
    </script>
  </body>
</html>`;
}
