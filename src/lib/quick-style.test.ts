import { describe, it, expect } from "vitest";
import { applyAttributeEdit, applyClassNameEdit, swapColorUtility, swapUtility } from "@/lib/quick-style";

describe("swapColorUtility", () => {
  it("replaces an existing text color utility", () => {
    expect(swapColorUtility("text-lg text-slate-900 font-bold", "text", "text-violet-600")).toBe(
      "text-lg font-bold text-violet-600"
    );
  });

  it("appends the utility when no existing color of that category is present", () => {
    expect(swapColorUtility("text-lg font-bold", "text", "text-violet-600")).toBe("text-lg font-bold text-violet-600");
  });

  it("only touches the requested category, not the other one", () => {
    const result = swapColorUtility("bg-white text-slate-900", "text", "text-blue-600");
    expect(result).toContain("bg-white");
    expect(result).not.toContain("text-slate-900");
    expect(result).toContain("text-blue-600");
  });

  it("does not accidentally strip an unrelated class with the same prefix word", () => {
    // "text-lg" and "text-center" are not color utilities (no trailing -NNN),
    // so the category-scoped regex must leave them alone.
    const result = swapColorUtility("text-lg text-center text-slate-900", "text", "text-amber-600");
    expect(result).toContain("text-lg");
    expect(result).toContain("text-center");
    expect(result).not.toContain("text-slate-900");
  });

  it("collapses to just the new utility when the original className becomes empty", () => {
    expect(swapColorUtility("text-slate-900", "text", "text-violet-600")).toBe("text-violet-600");
  });
});

describe("swapUtility (generalized categories)", () => {
  it("swaps a font-size utility, matching the fixed named scale not a numeric one", () => {
    expect(swapUtility("text-sm font-bold", "font-size", "text-2xl")).toBe("font-bold text-2xl");
  });

  it("does not let the font-size pattern eat a text color utility", () => {
    const result = swapUtility("text-lg text-slate-900", "font-size", "text-xl");
    expect(result).toContain("text-slate-900");
    expect(result).toContain("text-xl");
    expect(result).not.toContain("text-lg");
  });

  it("swaps a font-weight utility", () => {
    expect(swapUtility("font-normal text-lg", "font-weight", "font-bold")).toBe("text-lg font-bold");
  });

  it("swaps a padding utility without touching margin classes", () => {
    const result = swapUtility("p-2 m-4", "padding", "p-8");
    expect(result).toContain("m-4");
    expect(result).toContain("p-8");
    expect(result).not.toContain("p-2");
  });

  it("appends a padding utility when none was present", () => {
    expect(swapUtility("flex items-center", "padding", "p-4")).toBe("flex items-center p-4");
  });
});

describe("applyClassNameEdit", () => {
  it("applies the edit when the target className appears exactly once", () => {
    const source = `function Hero() { return <h1 className="text-4xl text-slate-900">Hi</h1>; }`;
    const result = applyClassNameEdit(source, "text-4xl text-slate-900", "text-4xl text-violet-600");
    expect(result.applied).toBe(true);
    expect(result.source).toContain('className="text-4xl text-violet-600"');
    expect(result.source).not.toContain('className="text-4xl text-slate-900"');
  });

  it("refuses to apply when the className appears zero times (stale selection)", () => {
    const source = `function Hero() { return <h1 className="text-4xl">Hi</h1>; }`;
    const result = applyClassNameEdit(source, "text-4xl text-slate-900", "text-4xl text-violet-600");
    expect(result.applied).toBe(false);
    expect(result.source).toBe(source); // unchanged
  });

  it("refuses to apply when the className appears more than once (ambiguous target)", () => {
    const source = `
      function Cards() {
        return <>
          <div className="p-4 text-slate-900">A</div>
          <div className="p-4 text-slate-900">B</div>
        </>;
      }`;
    const result = applyClassNameEdit(source, "p-4 text-slate-900", "p-4 text-violet-600");
    expect(result.applied).toBe(false);
    expect(result.source).toBe(source);
  });

  it("matches the className exactly, not as a substring of a longer className", () => {
    const source = `function Hero() { return <h1 className="text-4xl text-slate-900 font-bold">Hi</h1>; }`;
    // Target string is a substring of the real className, but not an exact
    // className="..." match on its own — must not "helpfully" partial-match.
    const result = applyClassNameEdit(source, "text-4xl text-slate-900", "text-4xl text-violet-600");
    expect(result.applied).toBe(false);
  });
});

describe("applyAttributeEdit — general form, exercised via a non-className attribute", () => {
  it("swaps a unique src attribute", () => {
    const source = `function Hero() { return <img src="/old-hero.png" alt="Team photo" />; }`;
    const result = applyAttributeEdit(source, "src", "/old-hero.png", "/new-hero.png");
    expect(result.applied).toBe(true);
    expect(result.source).toContain('src="/new-hero.png"');
    expect(result.source).not.toContain("/old-hero.png");
  });

  it("leaves an unrelated alt attribute on the same tag untouched", () => {
    const source = `function Hero() { return <img src="/old-hero.png" alt="Team photo" />; }`;
    const result = applyAttributeEdit(source, "src", "/old-hero.png", "/new-hero.png");
    expect(result.source).toContain('alt="Team photo"');
  });

  it("refuses when the same src appears on two different images", () => {
    const source = `function Gallery() { return <><img src="/shared.png" /><img src="/shared.png" /></>; }`;
    const result = applyAttributeEdit(source, "src", "/shared.png", "/new.png");
    expect(result.applied).toBe(false);
    expect(result.source).toBe(source);
  });

  it("refuses when the target src isn't found at all", () => {
    const source = `function Hero() { return <img src="/actual.png" />; }`;
    const result = applyAttributeEdit(source, "src", "/nonexistent.png", "/new.png");
    expect(result.applied).toBe(false);
  });
});
