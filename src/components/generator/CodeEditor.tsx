"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import type { Page } from "@/lib/preview";

// Monaco is client-only and fairly heavy — load it lazily so it never blocks the
// initial dashboard render, per the spec's "dynamic imports, code splitting" requirement.
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => <div className="p-4 text-sm text-ink/40">Loading editor…</div>,
});

/** Splits file paths into "Shared" (used by 2+ pages, like Navbar/Footer) plus one
 * group per page for that page's own unique files — so on a multi-page project you
 * can see which page a file actually belongs to instead of one flat list. On a
 * single-page project this collapses to the same flat list as before (no pages
 * structure means nothing to group by). */
function groupFilesByPage(paths: string[], pages: Page[]): { label: string; paths: string[] }[] {
  if (pages.length <= 1) return [{ label: "", paths }];

  const componentUsedBy = new Map<string, string[]>();
  for (const page of pages) {
    for (const section of page.sections) {
      componentUsedBy.set(section, [...(componentUsedBy.get(section) ?? []), page.name]);
    }
  }

  const shared: string[] = [];
  const perPage = new Map<string, string[]>();

  for (const path of paths) {
    const componentName = path.replace(/^components\//, "").replace(/\.tsx?$/, "");
    const usedBy = componentUsedBy.get(componentName) ?? [];
    if (usedBy.length >= 2) {
      shared.push(path);
    } else {
      const pageName = usedBy[0] ?? "Other";
      perPage.set(pageName, [...(perPage.get(pageName) ?? []), path]);
    }
  }

  const groups: { label: string; paths: string[] }[] = [];
  if (shared.length) groups.push({ label: "Shared", paths: shared });
  for (const page of pages) {
    const list = perPage.get(page.name);
    if (list?.length) groups.push({ label: page.name, paths: list });
  }
  return groups;
}

export function CodeEditor({
  files,
  onChange,
  active,
  onActiveChange,
  pages = [],
}: {
  files: Record<string, string>;
  onChange: (path: string, value: string) => void;
  active: string;
  onActiveChange: (path: string) => void;
  pages?: Page[];
}) {
  const paths = Object.keys(files);
  const groups = groupFilesByPage(paths, pages);

  useEffect(() => {
    if (paths.length && !paths.includes(active)) onActiveChange(paths[0]);
  }, [paths, active, onActiveChange]);

  if (!paths.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-ink/10 text-sm text-ink/30">
        Generate a site to start editing its code.
      </div>
    );
  }

  return (
    <div className="glass-panel flex h-full flex-col overflow-hidden rounded-xl">
      <div className="flex flex-wrap items-center gap-x-1 gap-y-1.5 overflow-x-auto border-b border-ink/10 bg-ink/[0.03] px-2 py-1.5">
        {groups.map((group) => (
          <div key={group.label || "flat"} className="flex items-center gap-1">
            {group.label && (
              <span className="ml-1 mr-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/30">{group.label}</span>
            )}
            {group.paths.map((p) => (
              <button
                key={p}
                onClick={() => onActiveChange(p)}
                className={`focus-ring whitespace-nowrap rounded-md px-3 py-1.5 font-mono text-xs ${
                  active === p ? "bg-signal text-paper" : "text-ink/50 hover:bg-ink/5"
                }`}
              >
                {p.split("/").pop()}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="flex-1">
        <Editor
          key={active}
          height="100%"
          language="typescript"
          theme="vs-dark"
          value={files[active]}
          onChange={(value) => onChange(active, value ?? "")}
          options={{
            fontSize: 13,
            minimap: { enabled: false },
            automaticLayout: true,
            padding: { top: 12 },
          }}
        />
      </div>
    </div>
  );
}
