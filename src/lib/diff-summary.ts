/** A plain-language summary of what an AI edit changed, computed deterministically
 * from before/after file content — no extra AI call needed, so "Explain changes"
 * costs nothing and never blocks on a model response. Deliberately line-based
 * rather than a real AST diff: good enough to tell someone what happened without
 * the cost/latency of a further generation call for every click. */
export interface FileDiffSummary {
  path: string;
  linesAdded: number;
  linesRemoved: number;
}

export interface ChangeSummary {
  /** One line suitable for a toast or a collapsed review card. */
  headline: string;
  /** Per-file line counts, for the expanded "Explain changes" detail view. */
  files: FileDiffSummary[];
}

function diffLines(before: string, after: string): { added: number; removed: number } {
  const beforeLines = before.split("\n");
  const afterLines = after.split("\n");
  const beforeCounts = new Map<string, number>();
  for (const line of beforeLines) beforeCounts.set(line, (beforeCounts.get(line) ?? 0) + 1);

  const afterCounts = new Map<string, number>();
  for (const line of afterLines) afterCounts.set(line, (afterCounts.get(line) ?? 0) + 1);

  let added = 0;
  for (const [line, count] of afterCounts) added += Math.max(0, count - (beforeCounts.get(line) ?? 0));

  let removed = 0;
  for (const [line, count] of beforeCounts) removed += Math.max(0, count - (afterCounts.get(line) ?? 0));

  return { added, removed };
}

function fileLabel(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.tsx?$/, "");
}

/** Compares two file maps and produces a headline plus per-file line counts for
 * every file that actually changed. Files present in only one map count fully
 * added or removed; identical files are omitted from the detail list entirely. */
export function summarizeChange(before: Record<string, string>, after: Record<string, string>): ChangeSummary {
  const paths = new Set([...Object.keys(before), ...Object.keys(after)]);
  const files: FileDiffSummary[] = [];

  for (const path of paths) {
    const beforeContent = before[path];
    const afterContent = after[path];
    if (beforeContent === afterContent) continue;

    if (beforeContent === undefined) {
      files.push({ path, linesAdded: afterContent.split("\n").length, linesRemoved: 0 });
    } else if (afterContent === undefined) {
      files.push({ path, linesAdded: 0, linesRemoved: beforeContent.split("\n").length });
    } else {
      const { added, removed } = diffLines(beforeContent, afterContent);
      files.push({ path, linesAdded: added, linesRemoved: removed });
    }
  }

  if (files.length === 0) {
    return { headline: "No changes.", files: [] };
  }

  if (files.length === 1) {
    const f = files[0];
    const parts: string[] = [];
    if (f.linesAdded > 0) parts.push(`${f.linesAdded} line${f.linesAdded === 1 ? "" : "s"} added`);
    if (f.linesRemoved > 0) parts.push(`${f.linesRemoved} line${f.linesRemoved === 1 ? "" : "s"} removed`);
    return { headline: `Updated ${fileLabel(f.path)} — ${parts.join(", ") || "no visible line changes"}.`, files };
  }

  const names = files.map((f) => fileLabel(f.path));
  const shown = names.slice(0, 2).join(", ");
  const rest = names.length > 2 ? ` and ${names.length - 2} more` : "";
  return { headline: `Updated ${shown}${rest}.`, files };
}
