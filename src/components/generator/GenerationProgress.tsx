"use client";

import { Check, Loader2, Circle } from "lucide-react";
import { GENERATION_PHASES, type GenerationPhase } from "@/lib/generation-stream";

const PHASE_LABELS: Record<GenerationPhase, string> = {
  understanding: "Understanding your request",
  planning: "Planning website structure",
  content: "Designing pages",
  code: "Generating code",
  finalizing: "Finalizing",
};

/** Renders the real generation phases streamed from /api/ai/generate-website —
 * not a cosmetic timer. Each row's state (done / active / pending) is derived
 * from comparing GENERATION_PHASES' fixed order against the most recent phase
 * event the server has actually sent, so a slow "code" phase genuinely shows
 * as in-progress for as long as it actually takes, not for a guessed duration. */
export function GenerationProgress({ phase }: { phase: GenerationPhase | null }) {
  const currentIndex = phase ? GENERATION_PHASES.indexOf(phase) : -1;

  return (
    <div className="saas-card mx-auto w-full max-w-md p-6">
      <h2 className="font-display text-lg font-semibold">Webma is building your website…</h2>
      <p className="mt-1 text-xs text-white/40">This may take a few moments.</p>
      <ul className="mt-6 space-y-3">
        {GENERATION_PHASES.map((p, i) => {
          const state = currentIndex === -1 ? "pending" : i < currentIndex ? "done" : i === currentIndex ? "active" : "pending";
          return (
            <li key={p} className="flex items-center gap-3 text-sm">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                  state === "done"
                    ? "bg-signal2/15 text-signal2"
                    : state === "active"
                      ? "bg-violet/15 text-violet"
                      : "bg-white/[0.04] text-white/25"
                }`}
              >
                {state === "done" ? (
                  <Check size={13} />
                ) : state === "active" ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Circle size={8} fill="currentColor" />
                )}
              </span>
              <span className={state === "pending" ? "text-white/35" : "text-white/85"}>{PHASE_LABELS[p]}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
