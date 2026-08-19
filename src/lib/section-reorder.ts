/** Turns a component name like "FeatureGrid" into "Feature grid" for display in the
 * Layers panel. Exported (rather than kept inline in SectionReorder.tsx) so its
 * formatting rules can be unit tested without mounting a component. */
export function humanizeSectionName(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  if (spaced.length === 0) return spaced;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

export interface PersistSectionOrderArgs {
  projectId: string | null;
  slug: string;
  next: string[];
  previous: string[];
  /** Applied immediately for optimistic UI, and called again with `previous` if the
   * persist call fails, so the visible order always matches what's actually saved. */
  onReorder: (order: string[]) => void;
  onSaving?: (saving: boolean) => void;
  onError?: (message: string) => void;
  fetchImpl?: typeof fetch;
}

/** Optimistically applies a new section order, then persists it to
 * /api/projects/reorder-sections, rolling the UI back to `previous` if the request
 * fails for any reason. Pulled out of the SectionReorder component so the
 * optimistic-update/rollback behavior can be unit tested against a mocked fetch,
 * independent of dnd-kit's drag event and any real DOM. */
export async function persistSectionOrder({
  projectId,
  slug,
  next,
  previous,
  onReorder,
  onSaving,
  onError,
  fetchImpl = fetch,
}: PersistSectionOrderArgs): Promise<void> {
  onReorder(next); // optimistic — caller's preview reorders instantly

  if (!projectId) return; // nothing to persist yet for an unsaved project

  onSaving?.(true);
  try {
    const res = await fetchImpl("/api/projects/reorder-sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId, slug, orderedSections: next }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      onError?.(data?.message ?? "Couldn't save the new order — reverted.");
      onReorder(previous);
    }
  } catch {
    onError?.("Network error — reorder reverted.");
    onReorder(previous);
  } finally {
    onSaving?.(false);
  }
}
