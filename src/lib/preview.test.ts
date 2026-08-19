import { describe, it, expect } from "vitest";
import { buildPreviewHtml, deriveSections, isValidReorder } from "@/lib/preview";

describe("deriveSections", () => {
  it("extracts component names from components/*.tsx paths, in order", () => {
    const files = {
      "components/Navbar.tsx": "// navbar",
      "components/Hero.tsx": "// hero",
      "components/Footer.tsx": "// footer",
    };
    expect(deriveSections(files)).toEqual(["Navbar", "Hero", "Footer"]);
  });

  it("ignores non-component files (e.g. a future config or utils file)", () => {
    const files = {
      "components/Navbar.tsx": "// navbar",
      "utils/helpers.ts": "// not a section",
      "components/Footer.tsx": "// footer",
    };
    expect(deriveSections(files)).toEqual(["Navbar", "Footer"]);
  });

  it("strips both .tsx and .ts extensions", () => {
    const files = {
      "components/About.ts": "// about",
    };
    expect(deriveSections(files)).toEqual(["About"]);
  });

  it("returns an empty array for a project with no files yet", () => {
    expect(deriveSections({})).toEqual([]);
  });
});

describe("isValidReorder", () => {
  it("accepts a plain reordering of the same sections", () => {
    expect(isValidReorder(["Hero", "Features", "Footer"], ["Footer", "Hero", "Features"])).toBe(true);
  });

  it("accepts the identity ordering (no-op drag)", () => {
    expect(isValidReorder(["Hero", "Footer"], ["Hero", "Footer"])).toBe(true);
  });

  it("rejects a section that doesn't exist on the page", () => {
    expect(isValidReorder(["Hero", "Footer"], ["Hero", "Pricing"])).toBe(false);
  });

  it("rejects a shorter list (a section silently dropped)", () => {
    expect(isValidReorder(["Hero", "Features", "Footer"], ["Hero", "Footer"])).toBe(false);
  });

  it("rejects a longer list (a section duplicated in)", () => {
    expect(isValidReorder(["Hero", "Footer"], ["Hero", "Footer", "Hero"])).toBe(false);
  });

  it("rejects a duplicate-count mismatch even when the set of names matches", () => {
    // current has two Heroes and one Footer; next has one Hero and two Footers —
    // a naive Set-based comparison would wrongly accept this.
    expect(isValidReorder(["Hero", "Hero", "Footer"], ["Hero", "Footer", "Footer"])).toBe(false);
  });

  it("handles empty arrays", () => {
    expect(isValidReorder([], [])).toBe(true);
  });
});

describe("buildPreviewHtml file boundary tracing", () => {
  it("tags each rendered section with the exact file key it came from, including extension", () => {
    const files = {
      "components/Hero.tsx": "function Hero() { return React.createElement('section', null, 'hi'); }",
      "components/Footer.ts": "function Footer() { return React.createElement('footer', null, 'bye'); }",
    };
    const html = buildPreviewHtml(files, ["Hero", "Footer"]);

    expect(html).toContain('"data-webma-file": "components/Hero.tsx"');
    expect(html).toContain('"data-webma-file": "components/Footer.ts"');
  });

  it("wraps each section in a display:contents boundary so it adds no layout box", () => {
    const files = { "components/Hero.tsx": "function Hero() { return null; }" };
    const html = buildPreviewHtml(files, ["Hero"]);
    expect(html).toContain('style: { display: "contents" }');
  });

  it("falls back to a .tsx guess for a section with no matching file (shouldn't happen via deriveSections, but must not throw)", () => {
    const files = { "components/Other.tsx": "function Other(){return null;}" };
    expect(() => buildPreviewHtml(files, ["Missing"])).not.toThrow();
    expect(buildPreviewHtml(files, ["Missing"])).toContain('"data-webma-file": "components/Missing.tsx"');
  });
});

describe("buildPreviewHtml selection highlighting", () => {
  const files = { "components/Hero.tsx": "function Hero() { return null; }" };

  it("includes the [data-webma-selected] outline stylesheet rule unconditionally", () => {
    // Always present regardless of whether anything is currently selected —
    // it's a static rule that only ever matches an element the marking
    // script actually tags, so there's no reason to conditionally omit it.
    const html = buildPreviewHtml(files, ["Hero"]);
    expect(html).toContain('[data-webma-selected="true"]');
    expect(html).toContain("outline: 2px solid #5B6CFF !important");
  });

  it("embeds the selected element's identifying info as JSON when provided", () => {
    const html = buildPreviewHtml(files, ["Hero"], {
      selected: { tag: "h1", text: "Welcome", id: "hero-title", className: "text-4xl", file: "components/Hero.tsx" },
    });
    expect(html).toContain('"tag":"h1"');
    expect(html).toContain('"text":"Welcome"');
    expect(html).toContain('"id":"hero-title"');
    expect(html).toContain('components/Hero.tsx');
  });

  it("embeds null (not undefined, not an error) when nothing is selected", () => {
    const html = buildPreviewHtml(files, ["Hero"], { selected: null });
    expect(html).toContain("var sel = null;");
  });

  it("embeds null when the selected option is omitted entirely", () => {
    const html = buildPreviewHtml(files, ["Hero"]);
    expect(html).toContain("var sel = null;");
  });

  it("does not throw when the selected element's text contains characters that need JSON escaping", () => {
    const files2 = { "components/Hero.tsx": "function Hero(){return null;}" };
    expect(() =>
      buildPreviewHtml(files2, ["Hero"], {
        selected: { tag: "p", text: 'Say "hello" — it\'s <great>', file: "components/Hero.tsx" },
      })
    ).not.toThrow();
  });
});
