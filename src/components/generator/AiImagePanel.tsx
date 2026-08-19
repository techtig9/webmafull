"use client";

import { useState } from "react";
import { ImagePlus } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { SelectedElement } from "@/components/generator/LivePreview";
import { applyEdit } from "@/lib/ai-edit";
import { applyAttributeEdit } from "@/lib/quick-style";

/** AI image generation for the selected <img> — a new, distinct provider
 * integration (see image-gen.ts), not an extension of the existing text
 * generation pipeline. Reuses the same safety pattern as QuickStylePanel:
 * a direct src swap only when the current src is a plain string literal
 * unique to this file (safe, instant, no second AI call needed for the
 * swap itself — only the image generation call spends credits); otherwise
 * falls back to a targeted AI edit for the swap itself. */
export function AiImagePanel({
  projectId,
  files,
  selectedElement,
  onDirectPatch,
  onApplied,
  onLockedAction,
}: {
  projectId: string | null;
  files: Record<string, string>;
  selectedElement: SelectedElement;
  onDirectPatch: (file: string, newSource: string) => void;
  onApplied: (files: Record<string, string>) => void;
  onLockedAction: (message: string) => void;
}) {
  const toast = useToast();
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  if (selectedElement.tag.toLowerCase() !== "img" || !selectedElement.file) {
    return null;
  }

  async function handleGenerate() {
    if (!prompt.trim() || !projectId) return;
    const file = selectedElement.file!;
    const source = files[file];
    if (source === undefined) {
      toast.show("error", `Couldn't find ${file} to edit.`);
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, projectId }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 402 || res.status === 403) {
        onLockedAction(data?.message ?? "Upgrade your plan to generate images.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Image generation failed.");
        return;
      }
      const newUrl: string = data.url;

      if (selectedElement.src) {
        const direct = applyAttributeEdit(source, "src", selectedElement.src, newUrl);
        if (direct.applied) {
          onDirectPatch(file, direct.source);
          toast.show("success", "Image generated and applied.");
          setPrompt("");
          return;
        }
      }

      // No usable current src (dynamic, or somehow absent) or it wasn't
      // unique in the file — fall back to a targeted AI edit for the swap
      // itself. The image is already generated and uploaded at this point
      // (that part always succeeds or fails on its own), so this fallback
      // only concerns getting the new URL into the right place in source.
      const result = await applyEdit({
        projectId,
        targetFile: file,
        instruction: `Set this <img> element's src attribute to exactly "${newUrl}". Do not change anything else about this component.`,
        filesBefore: files,
      });
      if (result.outcome === "locked") {
        onLockedAction(result.message);
        return;
      }
      if (result.outcome === "error") {
        toast.show("error", `Image generated, but couldn't place it: ${result.message}`);
        return;
      }
      onApplied(result.files);
      toast.show("success", "Image generated and applied.");
      setPrompt("");
    } catch {
      toast.show("error", "Network error — image generation didn't complete.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <ImagePlus size={13} className="text-signal2" />
        <p className="font-mono text-xs text-ink/40">AI image</p>
      </div>
      <div className="flex items-center gap-1.5">
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !generating && handleGenerate()}
          placeholder="Describe the image to generate…"
          disabled={generating}
          className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-transparent px-2 py-1.5 text-xs outline-none placeholder:text-ink/35 disabled:opacity-50"
        />
        <button
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="focus-ring shrink-0 rounded-full bg-signal px-3 py-1.5 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-40"
        >
          {generating ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}
