"use client";

import { useMemo, useState } from "react";
import { ChevronRight, Layers as LayersIcon, AlertTriangle } from "lucide-react";
import { parseJsxTree, type JsxTreeNode } from "@/lib/jsx-tree";
import { sectionFileKey } from "@/lib/preview";
import type { SelectedElement } from "@/components/generator/LivePreview";

/** Turns a component name like "FeatureGrid" into "Feature grid" — same
 * humanizing rule SectionReorder.tsx already uses for section labels, kept
 * in sync manually since it's a two-line pure function, not worth a shared
 * module for. */
function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.length === 0 ? spaced : spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function nodeLabel(node: JsxTreeNode): string {
  if (node.text) return node.text;
  if (node.id) return `#${node.id}`;
  return `<${node.tag}>`;
}

function LayerRow({
  node,
  depth,
  file,
  onSelect,
}: {
  node: JsxTreeNode;
  depth: number;
  file: string;
  onSelect: (el: SelectedElement) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2); // shallow levels open by default, deep ones collapsed
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="flex items-center gap-1 rounded-md py-1 pr-1 text-xs hover:bg-ink/[0.04]"
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="focus-ring shrink-0 rounded p-0.5 text-ink/35 hover:text-ink"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <ChevronRight size={11} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}
        <button
          onClick={() =>
            onSelect({
              tag: node.tag,
              text: node.text ?? "",
              id: node.id,
              // Only ever a real value when the parser found a plain string
              // literal — never fabricated for a dynamic className, so
              // QuickStylePanel's exact-match safety check (and its
              // "can't be quick-styled" fallback state) behaves exactly as
              // it would for an element clicked directly in the preview.
              className: node.staticClassName,
              src: node.staticSrc,
              file,
            })
          }
          className="focus-ring min-w-0 flex-1 truncate rounded px-1 py-0.5 text-left text-ink/70 hover:text-ink"
          title={node.tag}
        >
          <span className="font-mono text-[10px] text-ink/35">{node.tag}</span>{" "}
          <span className="truncate">{nodeLabel(node)}</span>
          {node.isDynamicClassName && (
            <AlertTriangle size={9} className="ml-1 inline-block text-amber" aria-label="Dynamic className — not directly quick-stylable" />
          )}
        </button>
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child, i) => (
            <LayerRow key={i} node={child} depth={depth + 1} file={file} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Real element-tree navigation for the active page, built by actually
 * parsing each section's JSX (see jsx-tree.ts) rather than a regex-based
 * shortcut over the source text — deliberately deferred until real parsing
 * was available, since a shallow tag-scan would look like reliable
 * navigation without being reliable, which is worse than not having a
 * Layers panel at all. Parsing runs client-side over files already in
 * memory (useMemo, no network call) and is recomputed whenever the active
 * page's sections or their source actually change. */
export function LayersPanel({
  sections,
  files,
  onSelect,
}: {
  sections: string[];
  files: Record<string, string>;
  onSelect: (el: SelectedElement) => void;
}) {
  const parsedSections = useMemo(
    () =>
      sections.map((s) => {
        const file = sectionFileKey(files, s);
        const source = files[file] ?? "";
        return { section: s, file, ...parseJsxTree(source) };
      }),
    [sections, files]
  );

  if (sections.length === 0) {
    return <p className="px-1 py-2 text-xs text-ink/35">No sections on this page yet.</p>;
  }

  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <LayersIcon size={13} className="text-signal2" />
        <p className="font-mono text-xs text-ink/40">Layers</p>
      </div>
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {parsedSections.map(({ section, file, tree, error }) => (
          <div key={section}>
            <p className="px-1 py-0.5 font-mono text-[10px] uppercase tracking-wide text-ink/30">{humanize(section)}</p>
            {error ? (
              <p className="px-2 py-1 text-[11px] text-ink/35">{error}</p>
            ) : (
              tree.map((node, i) => <LayerRow key={i} node={node} depth={0} file={file} onSelect={onSelect} />)
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
