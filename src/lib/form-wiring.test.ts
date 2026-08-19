import { describe, it, expect } from "vitest";
import { substituteProjectId, WEBMA_PROJECT_ID_PLACEHOLDER } from "@/lib/form-wiring";

describe("substituteProjectId", () => {
  it("replaces every occurrence of the placeholder with the real project ID", () => {
    const files = {
      "components/ContactForm.tsx": `fetch(url, { body: JSON.stringify({ projectId: "${WEBMA_PROJECT_ID_PLACEHOLDER}" }) })`,
    };
    const result = substituteProjectId(files, "proj-123");
    expect(result["components/ContactForm.tsx"]).toContain('"proj-123"');
    expect(result["components/ContactForm.tsx"]).not.toContain(WEBMA_PROJECT_ID_PLACEHOLDER);
  });

  it("replaces multiple occurrences within the same file", () => {
    const files = { f: `${WEBMA_PROJECT_ID_PLACEHOLDER} and ${WEBMA_PROJECT_ID_PLACEHOLDER}` };
    const result = substituteProjectId(files, "abc");
    expect(result.f).toBe("abc and abc");
  });

  it("replaces occurrences across multiple files, each independently", () => {
    const files = {
      "components/ContactForm.tsx": WEBMA_PROJECT_ID_PLACEHOLDER,
      "components/Newsletter.tsx": WEBMA_PROJECT_ID_PLACEHOLDER,
      "components/Hero.tsx": "no placeholder here",
    };
    const result = substituteProjectId(files, "proj-456");
    expect(result["components/ContactForm.tsx"]).toBe("proj-456");
    expect(result["components/Newsletter.tsx"]).toBe("proj-456");
    expect(result["components/Hero.tsx"]).toBe("no placeholder here");
  });

  it("leaves files with no placeholder completely unchanged", () => {
    const files = { "components/Hero.tsx": "no forms on this page" };
    const result = substituteProjectId(files, "proj-789");
    expect(result).toEqual(files);
  });

  it("handles an empty files map", () => {
    expect(substituteProjectId({}, "proj-1")).toEqual({});
  });
});
