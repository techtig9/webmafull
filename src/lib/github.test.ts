import { describe, it, expect } from "vitest";
import { sanitizeRepoName } from "@/lib/github";

describe("sanitizeRepoName", () => {
  it("lowercases and replaces spaces with hyphens", () => {
    expect(sanitizeRepoName("Nova Agency")).toBe("nova-agency");
  });

  it("collapses a run of invalid characters into a single hyphen", () => {
    expect(sanitizeRepoName("Nova!!!Agency???")).toBe("nova-agency");
  });

  it("preserves periods and underscores, which GitHub allows", () => {
    expect(sanitizeRepoName("nova.agency_v2")).toBe("nova.agency_v2");
  });

  it("strips leading and trailing dots and hyphens", () => {
    expect(sanitizeRepoName("--Nova Agency--")).toBe("nova-agency");
    expect(sanitizeRepoName("...Nova Agency...")).toBe("nova-agency");
  });

  it("falls back to a safe default when the name sanitizes to nothing", () => {
    expect(sanitizeRepoName("!!!")).toBe("webma-project");
    expect(sanitizeRepoName("")).toBe("webma-project");
    expect(sanitizeRepoName("...")).toBe("webma-project");
  });

  it("caps length at GitHub's 100 character limit", () => {
    const result = sanitizeRepoName("a".repeat(150));
    expect(result.length).toBeLessThanOrEqual(100);
  });

  it("handles unicode/emoji by stripping them rather than crashing", () => {
    expect(sanitizeRepoName("Café ☕ Website")).toBe("caf-website");
  });

  it("is idempotent — sanitizing an already-clean name doesn't change it", () => {
    const clean = "already-clean-name";
    expect(sanitizeRepoName(clean)).toBe(clean);
  });
});
