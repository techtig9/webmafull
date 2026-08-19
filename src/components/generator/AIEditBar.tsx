"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, RotateCcw, Sparkles, WandSparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { SelectedElement } from "@/components/generator/LivePreview";
import { applyEdit, type EditTurn } from "@/lib/ai-edit";

export function AIEditBar({
  projectId,
  activeFile,
  files,
  selectedElement,
  onApplied,
  onLockedAction,
}: {
  projectId: string | null;
  activeFile: string;
  files: Record<string, string>;
  selectedElement?: SelectedElement | null;
  onApplied: (files: Record<string, string>) => void;
  onLockedAction: (message: string) => void;
}) {
  const toast = useToast();
  const [instruction, setInstruction] = useState("");
  const [applying, setApplying] = useState(false);
  const [reverting, setReverting] = useState(false);
  const [turns, setTurns] = useState<EditTurn[]>([]);
  const [expandedTurnId, setExpandedTurnId] = useState<string | null>(null);
  const historyRef = useRef<HTMLDivElement>(null);

  // New turns land at the end of the list, so auto-scroll the history panel
  // down to reveal each one as it arrives — the same behavior any chat UI
  // gives you, rather than leaving a fresh reply hidden above the fold.
  useEffect(() => {
    historyRef.current?.scrollTo({ top: historyRef.current.scrollHeight, behavior: "smooth" });
  }, [turns.length]);

  async function handleApply() {
    if (!projectId || !instruction.trim()) return;
    setApplying(true);
    const selectionContext = selectedElement
      ? `\nSelected element context: <${selectedElement.tag}>${selectedElement.text ? ` with visible text "${selectedElement.text}"` : ""}${selectedElement.id ? `, id="${selectedElement.id}"` : ""}. Make the smallest safe change that satisfies the request and preserve unrelated elements.`
      : "";
    const fullInstruction = `${instruction}${selectionContext}`;
    const displayInstruction = instruction; // keep the chat log readable — selection context is sent to the model, not shown as if the user typed it

    try {
      const result = await applyEdit({
        projectId,
        targetFile: activeFile,
        instruction: fullInstruction,
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
      setInstruction("");
      setTurns((prev) => [...prev, { ...result.turn, instruction: displayInstruction }]);
      toast.show("success", selectedElement ? "Selected element updated." : `Updated ${activeFile.split("/").pop()}.`);
    } catch {
      toast.show("error", "Network error — edit didn't apply. Try again.");
    } finally {
      setApplying(false);
    }
  }

  async function handleRevert(turn: EditTurn) {
    if (!projectId) return;
    setReverting(true);
    try {
      const res = await fetch("/api/projects/restore-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, version: turn.revertVersion }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        toast.show("error", data?.message ?? "Your plan doesn't allow reverting that far back.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't revert — try again.");
        return;
      }
      onApplied(data.files);
      // Reverting the most recent turn removes it from the visible log — reverting
      // an older turn while later ones exist would also undo those later edits, so
      // rather than silently misrepresent what's still applied, drop everything
      // from that turn forward. Revert is only ever shown on the last turn (below),
      // so in practice this always trims exactly one entry — the slice covers the
      // general case in case that ever changes.
      setTurns((prev) => prev.slice(0, prev.findIndex((t) => t.id === turn.id)));
      toast.show("success", "Reverted to before that edit.");
    } catch {
      toast.show("error", "Network error — revert didn't apply. Try again.");
    } finally {
      setReverting(false);
    }
  }

  return (
    <div className="glass-panel flex flex-col rounded-2xl p-2 shadow-sm">
      {turns.length > 0 && (
        <div ref={historyRef} className="mb-2 max-h-60 space-y-2 overflow-y-auto px-1 pt-1">
          {turns.map((turn, i) => {
            const isLast = i === turns.length - 1;
            const expanded = expandedTurnId === turn.id;
            return (
              <div key={turn.id} className="space-y-1.5">
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-signal/10 px-3 py-1.5 text-xs text-ink/80">
                  {turn.instruction}
                </div>
                <div className="max-w-[90%] rounded-2xl rounded-tl-sm border border-ink/10 bg-ink/[0.02] px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => setExpandedTurnId(expanded ? null : turn.id)}
                      className="focus-ring flex min-w-0 flex-1 items-center gap-1.5 text-left text-[11px] text-ink/60 hover:text-ink"
                    >
                      <ChevronDown size={11} className={`shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                      <span className="truncate">{turn.summary.headline}</span>
                    </button>
                    {isLast && (
                      <button
                        onClick={() => handleRevert(turn)}
                        disabled={reverting}
                        className="focus-ring flex shrink-0 items-center gap-1 rounded-full border border-ink/10 px-2 py-0.5 text-[10px] text-ink/60 hover:text-ink disabled:opacity-40"
                      >
                        <RotateCcw size={10} /> {reverting ? "…" : "Revert"}
                      </button>
                    )}
                  </div>
                  {expanded && (
                    <ul className="mt-1.5 space-y-1 border-t border-ink/10 pt-1.5">
                      {turn.summary.files.map((f) => (
                        <li key={f.path} className="flex items-center justify-between text-[10px] text-ink/50">
                          <span className="truncate font-mono">{f.path}</span>
                          <span className="shrink-0 pl-2">
                            {f.linesAdded > 0 && <span className="text-signal2">+{f.linesAdded}</span>}
                            {f.linesAdded > 0 && f.linesRemoved > 0 && " "}
                            {f.linesRemoved > 0 && <span className="text-coral">-{f.linesRemoved}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center gap-2">
        <Sparkles size={15} className="ml-2 shrink-0 text-signal" />
        <input
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !applying && handleApply()}
          placeholder={selectedElement ? `Change selected ${selectedElement.tag}…` : `Ask webma to edit ${activeFile.split("/").pop() ?? "your site"}…`}
          disabled={!projectId || applying}
          className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none placeholder:text-ink/35 disabled:opacity-50"
        />
        {selectedElement && (
          <span className="hidden max-w-[180px] truncate rounded-full bg-signal/10 px-2 py-1 font-mono text-[10px] text-signal md:inline-flex">
            {selectedElement.tag}{selectedElement.text ? ` · ${selectedElement.text}` : ""}
          </span>
        )}
        <button
          onClick={() => setInstruction((v) => v || "Make this section more modern and polished")}
          disabled={!projectId || applying}
          className="focus-ring hidden items-center gap-1 rounded-full border border-ink/10 px-3 py-1.5 text-xs text-ink/60 hover:text-ink sm:flex"
        >
          <WandSparkles size={12} /> Suggest
        </button>
        <button
          onClick={handleApply}
          disabled={!projectId || applying || !instruction.trim()}
          className="focus-ring shrink-0 rounded-full bg-signal px-4 py-2 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-40"
        >
          {applying ? "Applying…" : "Apply"}
        </button>
      </div>
    </div>
  );
}
