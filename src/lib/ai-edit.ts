import { summarizeChange, type ChangeSummary } from "@/lib/diff-summary";

/** One exchange in the AI Assistant's chat history: what the person asked for,
 * and what actually changed as a result. summary/revertVersion are always
 * present together — an edit either produced both or the turn represents a
 * failure and isn't recorded as a turn at all (see applyEdit below). */
export interface EditTurn {
  id: string;
  instruction: string;
  summary: ChangeSummary;
  revertVersion: number;
}

export interface ApplyEditArgs {
  projectId: string | null;
  targetFile: string;
  instruction: string;
  filesBefore: Record<string, string>;
  fetchImpl?: typeof fetch;
  generateId?: () => string;
}

export type ApplyEditResult =
  | { outcome: "locked"; message: string }
  | { outcome: "error"; message: string }
  | { outcome: "success"; files: Record<string, string>; turn: EditTurn };

/** Calls /api/ai/edit-section and turns its response into either a chat turn
 * (on success) or a classified failure the caller can react to distinctly —
 * "locked" (402/403, needs an upgrade prompt) vs "error" (everything else,
 * needs a toast). Pulled out of AIEditBar.tsx so this branching, plus the
 * diff-summary computation, can be unit tested against a mocked fetch instead
 * of only ever being exercised by clicking a real button in a real browser. */
export async function applyEdit({
  projectId,
  targetFile,
  instruction,
  filesBefore,
  fetchImpl = fetch,
  generateId = () => crypto.randomUUID(),
}: ApplyEditArgs): Promise<ApplyEditResult> {
  const res = await fetchImpl("/api/ai/edit-section", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, targetFile, instruction }),
  });
  const data = await res.json().catch(() => null);

  if (res.status === 402 || res.status === 403) {
    return { outcome: "locked", message: data?.message ?? "Upgrade your plan to use AI editing." };
  }
  if (!res.ok) {
    return { outcome: "error", message: data?.message ?? "Edit failed — try again." };
  }
  if (typeof data?.previousVersion !== "number") {
    // The route should always include this on success — treat a malformed
    // success response as an error rather than producing a turn no one could
    // ever revert.
    return { outcome: "error", message: "Edit applied, but the server response was incomplete." };
  }

  return {
    outcome: "success",
    files: data.files,
    turn: {
      id: generateId(),
      instruction,
      summary: summarizeChange(filesBefore, data.files),
      revertVersion: data.previousVersion,
    },
  };
}
