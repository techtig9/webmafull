import { describe, it, expect } from "vitest";
import { summarizeChange } from "@/lib/diff-summary";

describe("summarizeChange", () => {
  it("reports no changes when nothing differs", () => {
    const files = { "components/Hero.tsx": "line1\nline2" };
    expect(summarizeChange(files, files)).toEqual({ headline: "No changes.", files: [] });
  });

  it("counts added and removed lines for a single changed file", () => {
    const before = { "components/Hero.tsx": "a\nb\nc" };
    const after = { "components/Hero.tsx": "a\nb\nc\nd\ne" };
    const result = summarizeChange(before, after);
    expect(result.files).toEqual([{ path: "components/Hero.tsx", linesAdded: 2, linesRemoved: 0 }]);
    expect(result.headline).toBe("Updated Hero — 2 lines added.");
  });

  it("reports both additions and removals in the headline", () => {
    const before = { "components/Hero.tsx": "a\nb\nc" };
    const after = { "components/Hero.tsx": "a\nx\nc\nd" };
    const result = summarizeChange(before, after);
    expect(result.files[0].linesAdded).toBe(2); // "x" and "d"
    expect(result.files[0].linesRemoved).toBe(1); // "b"
    expect(result.headline).toBe("Updated Hero — 2 lines added, 1 line removed.");
  });

  it("uses singular wording for exactly one line", () => {
    const before = { "components/Hero.tsx": "a\nb" };
    const after = { "components/Hero.tsx": "a\nb\nc" };
    expect(summarizeChange(before, after).headline).toBe("Updated Hero — 1 line added.");
  });

  it("ignores files that are identical even when other files changed", () => {
    const before = { "components/Hero.tsx": "a", "components/Footer.tsx": "same" };
    const after = { "components/Hero.tsx": "a\nb", "components/Footer.tsx": "same" };
    const result = summarizeChange(before, after);
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe("components/Hero.tsx");
  });

  it("treats a newly added file as fully added lines", () => {
    const before = { "components/Hero.tsx": "a" };
    const after = { "components/Hero.tsx": "a", "components/NewPricing.tsx": "x\ny\nz" };
    const result = summarizeChange(before, after);
    expect(result.files).toEqual([{ path: "components/NewPricing.tsx", linesAdded: 3, linesRemoved: 0 }]);
  });

  it("treats a deleted file as fully removed lines", () => {
    const before = { "components/Hero.tsx": "a", "components/Old.tsx": "x\ny" };
    const after = { "components/Hero.tsx": "a" };
    const result = summarizeChange(before, after);
    expect(result.files).toEqual([{ path: "components/Old.tsx", linesAdded: 0, linesRemoved: 2 }]);
  });

  it("summarizes multiple changed files with a truncated headline", () => {
    const before = { a: "1", b: "1", c: "1", d: "1" };
    const after = { a: "2", b: "2", c: "2", d: "1" };
    const result = summarizeChange(before, after);
    expect(result.files).toHaveLength(3);
    expect(result.headline).toBe("Updated a, b and 1 more.");
  });

  it("is order-insensitive for identical line-count changes (bag comparison, not positional diff)", () => {
    const before = { f: "a\nb\nc" };
    const after = { f: "c\nb\na" };
    // Same three lines, just reordered — a bag-based diff correctly reports no
    // line-level changes even though the file content string itself differs.
    const result = summarizeChange(before, after);
    expect(result.files[0].linesAdded).toBe(0);
    expect(result.files[0].linesRemoved).toBe(0);
  });
});
