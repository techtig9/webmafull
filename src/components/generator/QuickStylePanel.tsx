"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { SelectedElement } from "@/components/generator/LivePreview";
import { applyEdit } from "@/lib/ai-edit";
import {
  applyClassNameEdit,
  swapUtility,
  BG_COLOR_SWATCHES,
  TEXT_COLOR_SWATCHES,
  FONT_SIZE_OPTIONS,
  FONT_WEIGHT_OPTIONS,
  PADDING_OPTIONS,
  type StyleCategory,
  type StyleOption,
} from "@/lib/quick-style";

const CATEGORY_LABELS: Record<StyleCategory, string> = {
  "text-color": "Text color",
  "bg-color": "Background color",
  "font-size": "Font size",
  "font-weight": "Font weight",
  padding: "Padding",
};

/** Direct-manipulation styling for the selected element: color, font size,
 * font weight, and padding — the property-inspector slice of the visual
 * editor that's actually tractable against generated JSX source (see
 * quick-style.ts's header comment on why this is a className swap, not a
 * true freeform canvas). Each control tries a deterministic, instant,
 * zero-AI-cost source edit first, and only falls back to a real AI edit call
 * when that's unsafe (the element's current className isn't uniquely
 * identifiable in its file). */
export function QuickStylePanel({
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
  const [pending, setPending] = useState<string | null>(null); // utility currently being applied, for a per-control busy state

  async function handleOption(category: StyleCategory, option: StyleOption) {
    const { file, className } = selectedElement;
    if (!file || className === undefined) {
      toast.show("error", "Select an element in the preview first.");
      return;
    }
    const source = files[file];
    if (source === undefined) {
      toast.show("error", `Couldn't find ${file} to edit.`);
      return;
    }

    setPending(option.utility);
    const newClassName = swapUtility(className, category, option.utility);

    const direct = applyClassNameEdit(source, className, newClassName);
    if (direct.applied) {
      onDirectPatch(file, direct.source);
      toast.show("success", `${CATEGORY_LABELS[category]} updated.`);
      setPending(null);
      return;
    }

    // Not safe to patch directly (className isn't unique in this file) — fall
    // back to the same tested AI-edit pipeline AIEditBar uses, with an
    // instruction specific enough that the model has the same disambiguating
    // context a person would need: which element, which property, which value.
    try {
      const result = await applyEdit({
        projectId,
        targetFile: file,
        instruction: `Change only the ${CATEGORY_LABELS[category].toLowerCase()} of the ${selectedElement.tag}${
          selectedElement.text ? ` containing the text "${selectedElement.text}"` : ""
        } to match Tailwind's ${option.utility}. Do not change any other element's styling.`,
        filesBefore: files,
      });

      if (result.outcome === "locked") {
        onLockedAction(result.message);
        return;
      }
      if (result.outcome === "error") {
        toast.show("error", result.message);
        return;
      }
      onApplied(result.files);
      toast.show("success", `${CATEGORY_LABELS[category]} updated via AI (multiple matching elements, so a direct edit wasn't safe).`);
    } catch {
      toast.show("error", "Network error — style change didn't apply.");
    } finally {
      setPending(null);
    }
  }

  const disabled = !selectedElement.file || selectedElement.className === undefined;

  function ColorRow({ category, options }: { category: StyleCategory; options: StyleOption[] }) {
    return (
      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-ink/35">{CATEGORY_LABELS[category]}</p>
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o.utility}
              onClick={() => handleOption(category, o)}
              disabled={pending !== null}
              aria-label={`Set ${CATEGORY_LABELS[category].toLowerCase()} to ${o.label}`}
              title={o.label}
              className={`focus-ring h-6 w-6 rounded-full border border-ink/15 disabled:opacity-40 ${pending === o.utility ? "ring-2 ring-signal" : ""}`}
              style={{ backgroundColor: o.previewColor }}
            />
          ))}
        </div>
      </div>
    );
  }

  function LabelRow({ category, options }: { category: StyleCategory; options: StyleOption[] }) {
    return (
      <div>
        <p className="mb-1.5 text-[10px] uppercase tracking-wide text-ink/35">{CATEGORY_LABELS[category]}</p>
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => (
            <button
              key={o.utility}
              onClick={() => handleOption(category, o)}
              disabled={pending !== null}
              aria-label={`Set ${CATEGORY_LABELS[category].toLowerCase()} to ${o.label}`}
              className={`focus-ring rounded-full border border-ink/15 px-2.5 py-1 text-[11px] text-ink/60 hover:text-ink disabled:opacity-40 ${
                pending === o.utility ? "border-signal text-signal" : ""
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl p-3">
      <div className="mb-2 flex items-center gap-2">
        <Palette size={13} className="text-signal2" />
        <p className="font-mono text-xs text-ink/40">Quick style</p>
      </div>
      {disabled ? (
        <p className="px-1 py-1 text-xs text-ink/35">This element can&apos;t be quick-styled — try selecting a different one.</p>
      ) : (
        <div className="space-y-2.5">
          <ColorRow category="text-color" options={TEXT_COLOR_SWATCHES} />
          <ColorRow category="bg-color" options={BG_COLOR_SWATCHES} />
          <LabelRow category="font-size" options={FONT_SIZE_OPTIONS} />
          <LabelRow category="font-weight" options={FONT_WEIGHT_OPTIONS} />
          <LabelRow category="padding" options={PADDING_OPTIONS} />
        </div>
      )}
    </div>
  );
}
