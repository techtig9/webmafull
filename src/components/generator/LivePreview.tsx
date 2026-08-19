"use client";

import { useEffect, useState } from "react";
import { Monitor, Tablet, Smartphone, MousePointer2, ExternalLink } from "lucide-react";
import { buildPreviewHtml } from "@/lib/preview";

const DEVICES = {
  desktop: { width: "100%", icon: Monitor },
  tablet: { width: "768px", icon: Tablet },
  mobile: { width: "390px", icon: Smartphone },
} as const;

type Device = keyof typeof DEVICES;

export interface SelectedElement {
  tag: string;
  text: string;
  id?: string;
  className?: string;
  /** The current src attribute, when the selected element is an <img> with
   * one — needed so an AI-generated replacement image can be swapped in via
   * the same exact-match-count safety check applyAttributeEdit uses for
   * className (see quick-style.ts). Never fabricated: absent whenever the
   * tag isn't an img, or the src is computed/templated rather than a plain
   * string literal. */
  src?: string;
  /** Which generated file this element actually renders from (e.g.
   * "components/Hero.tsx") — traced via a data-webma-file boundary marker
   * wrapping each section, not guessed. Lets the caller keep the AI edit /
   * quick-style target in sync with what's actually selected, instead of
   * silently editing whatever file happened to be open before selection. */
  file?: string | null;
}

export function LivePreview({
  files,
  sections,
  onNavigate,
  onSelect,
  selected,
}: {
  files: Record<string, string>;
  sections: string[];
  onNavigate?: (path: string) => void;
  onSelect?: (element: SelectedElement | null) => void;
  selected?: SelectedElement | null;
}) {
  const [device, setDevice] = useState<Device>("desktop");
  const [interactive, setInteractive] = useState(true);
  const hasContent = Object.keys(files).length > 0;

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.data?.type === "webma:navigate" && typeof event.data.path === "string") {
        onNavigate?.(event.data.path);
        return;
      }
      if (event.data?.type === "webma:select") {
        onSelect?.(event.data.element ?? null);
      }
    }
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [onNavigate, onSelect]);

  return (
    <div className="corner-frame glass-panel flex h-full min-h-0 flex-col rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs text-ink/40">Live preview</span>
          {selected && (
            <span className="hidden max-w-[260px] truncate rounded-full bg-signal/10 px-2 py-1 font-mono text-[10px] text-signal sm:inline-flex">
              {selected.tag}{selected.text ? ` · ${selected.text}` : ""}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => { setInteractive((v) => !v); onSelect?.(null); }}
            className={`focus-ring flex items-center gap-1 rounded-md px-2 py-1.5 text-[10px] font-medium ${interactive ? "bg-signal text-paper" : "text-ink/40 hover:text-ink"}`}
            title="Toggle visual selection"
          >
            <MousePointer2 size={12} /> Edit
          </button>
          {(Object.keys(DEVICES) as Device[]).map((d) => {
            const Icon = DEVICES[d].icon;
            return (
              <button
                key={d}
                onClick={() => setDevice(d)}
                aria-label={`Preview on ${d}`}
                className={`focus-ring rounded-md p-1.5 ${device === d ? "bg-signal text-paper" : "text-ink/40 hover:text-ink"}`}
              >
                <Icon size={14} />
              </button>
            );
          })}
          <button
            onClick={() => {
              const html = buildPreviewHtml(files, sections);
              const blob = new Blob([html], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              window.open(url, "_blank", "noopener,noreferrer");
              setTimeout(() => URL.revokeObjectURL(url), 30_000);
            }}
            disabled={!hasContent}
            className="focus-ring rounded-md p-1.5 text-ink/40 hover:text-ink disabled:opacity-30"
            aria-label="Open preview in new tab"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-start justify-center overflow-auto bg-ink/[0.03] p-4">
        {hasContent ? (
          <iframe
            title="Generated site preview"
            className="h-full rounded-lg border border-ink/10 bg-white shadow-sm transition-all"
            style={{ width: DEVICES[device].width, minHeight: "600px", maxWidth: "100%" }}
            sandbox="allow-scripts"
            srcDoc={buildPreviewHtml(files, sections, { selectable: interactive, selected })}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-ink/30">
            Your generated site will appear here.
          </div>
        )}
      </div>
    </div>
  );
}
