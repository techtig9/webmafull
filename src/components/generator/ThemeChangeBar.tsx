"use client";

import { useState } from "react";
import { Palette } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function ThemeChangeBar({
  projectId,
  onApplied,
  onLockedAction,
}: {
  projectId: string | null;
  onApplied: (files: Record<string, string>) => void;
  onLockedAction: (message: string) => void;
}) {
  const toast = useToast();
  const [instruction, setInstruction] = useState("");
  const [applying, setApplying] = useState(false);

  async function handleApply() {
    if (!projectId || !instruction.trim()) return;
    setApplying(true);
    try {
      const res = await fetch("/api/ai/change-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, instruction }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 402 || res.status === 403) {
        onLockedAction(data?.message ?? "Upgrade your plan to restyle your site.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Restyle failed — try again.");
        return;
      }
      onApplied(data.files);
      setInstruction("");
      toast.show("success", "Site restyled.");
    } catch {
      toast.show("error", "Network error — restyle didn't apply. Try again.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="glass-panel flex items-center gap-2 rounded-full px-2 py-1.5">
      <Palette size={14} className="ml-2 shrink-0 text-signal2" />
      <input
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && !applying && handleApply()}
        placeholder="Restyle the whole site — e.g. 'switch to a cooler, blue palette'…"
        disabled={!projectId || applying}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink/35 disabled:opacity-50"
      />
      <button
        onClick={handleApply}
        disabled={!projectId || applying || !instruction.trim()}
        className="focus-ring shrink-0 rounded-full bg-signal2 px-4 py-1.5 text-xs font-medium text-paper hover:opacity-90 disabled:opacity-40"
      >
        {applying ? "Restyling…" : "Restyle"}
      </button>
    </div>
  );
}
