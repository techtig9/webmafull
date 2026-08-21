import type { Page } from "@/lib/preview";

/** Persists the current files/pages, then snapshots that saved state into
 * real, restorable version history. Two sequential calls, deliberately not
 * parallel: /api/projects/checkpoint copies from whatever the current
 * version row already holds in the database — it does not accept files or
 * pages in its own request body — so it must run strictly after the save
 * above actually lands, or it would snapshot stale data instead of what was
 * just saved.
 *
 * The checkpoint call is best-effort. A failure there is logged but never
 * reported as an overall failure — the save (the part the caller is
 * actually waiting on) already succeeded by that point, and a lost history
 * entry is not the same class of problem as a lost save. */
export async function saveAndCheckpoint(
  projectId: string,
  files: Record<string, string>,
  pages: Page[]
): Promise<{ saved: boolean }> {
  const saveRes = await fetch("/api/projects/save", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, files, pages }),
  });
  if (!saveRes.ok) return { saved: false };

  fetch("/api/projects/checkpoint", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, reason: "Manual save" }),
  }).catch((err) => console.error("checkpoint after save failed", err));

  return { saved: true };
}
