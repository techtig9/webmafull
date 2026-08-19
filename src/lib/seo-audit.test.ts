import { describe, it, expect } from "vitest";
import { auditSeo } from "@/lib/seo-audit";
import { parseJsxTree } from "@/lib/jsx-tree";
import type { Page } from "@/lib/preview";

function page(overrides: Partial<Page> = {}): Page {
  return { slug: "index", path: "/", name: "Home", sections: ["Hero"], ...overrides };
}

const siteWide = { title: "Nova Agency", description: "We build brands that grow." };

describe("auditSeo — meta tags", () => {
  it("scores a page with title/description (site-wide fallback) and no other issues near-perfectly", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1><a href="/">Home</a>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.filter((i) => i.category === "meta")).toEqual([]);
  });

  it("flags a page with no title and no site-wide fallback", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1>` };
    const result = auditSeo(files, [page()], { title: "", description: "" });
    const metaIssues = auditSeo(files, [page()], { title: "", description: "" }).issues.filter((i) => i.category === "meta");
    expect(metaIssues.some((i) => i.severity === "error" && i.message.includes("title"))).toBe(true);
    expect(metaIssues.some((i) => i.severity === "error" && i.message.includes("description"))).toBe(true);
    expect(result.score).toBeLessThan(100);
  });

  it("does not flag a missing title/description when a page-level override exists", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1>` };
    const p = page({ seoTitle: "Custom title", seoDescription: "Custom description" });
    const result = auditSeo(files, [p], { title: "", description: "" });
    expect(result.issues.filter((i) => i.category === "meta")).toEqual([]);
  });

  it("warns (not errors) on an overly long title or description", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1>` };
    const p = page({ seoTitle: "x".repeat(80), seoDescription: "y".repeat(200) });
    const result = auditSeo(files, [p], siteWide);
    const metaIssues = result.issues.filter((i) => i.category === "meta");
    expect(metaIssues).toHaveLength(2);
    expect(metaIssues.every((i) => i.severity === "warning")).toBe(true);
  });
});

describe("auditSeo — alt text", () => {
  it("flags an <img> with no alt attribute", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1><img src="/x.png" />` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "alt-text")).toBe(true);
  });

  it("does not flag an <img> that has an alt attribute", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1><img src="/x.png" alt="A photo" />` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "alt-text")).toBe(false);
  });

  it("does not flag an image with an intentionally empty alt (decorative image)", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1><img src="/x.png" alt="" />` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "alt-text")).toBe(false);
  });

  it("counts multiple missing-alt images as one issue reporting the count", () => {
    const files = { "components/Hero.tsx": `<img src="/a.png" /><img src="/b.png" /><h1>Hi</h1>` };
    const result = auditSeo(files, [page()], siteWide);
    const issue = result.issues.find((i) => i.category === "alt-text");
    expect(issue?.message).toContain("2 images");
  });
});

describe("auditSeo — broken internal links", () => {
  const pages = [page(), page({ slug: "about", path: "/about", name: "About", sections: ["AboutBody"] })];

  it("does not flag a link to a real page", () => {
    const files = {
      "components/Hero.tsx": `<h1>Hi</h1><a href="/about">About</a>`,
      "components/AboutBody.tsx": `<h1>About</h1>`,
    };
    const result = auditSeo(files, pages, siteWide);
    expect(result.issues.some((i) => i.category === "links")).toBe(false);
  });

  it("flags a link to a page that doesn't exist", () => {
    const files = {
      "components/Hero.tsx": `<h1>Hi</h1><a href="/pricing">Pricing</a>`,
      "components/AboutBody.tsx": `<h1>About</h1>`,
    };
    const result = auditSeo(files, pages, siteWide);
    const issue = result.issues.find((i) => i.category === "links");
    expect(issue?.message).toContain("/pricing");
  });

  it("does not flag the home link, an anchor link, or an external link", () => {
    const files = {
      "components/Hero.tsx": `<h1>Hi</h1><a href="/">Home</a><a href="#contact">Jump</a><a href="https://twitter.com">X</a>`,
      "components/AboutBody.tsx": `<h1>About</h1>`,
    };
    const result = auditSeo(files, pages, siteWide);
    expect(result.issues.some((i) => i.category === "links")).toBe(false);
  });

  it("does not flag an internal link with a hash or query string appended to a real path", () => {
    const files = {
      "components/Hero.tsx": `<h1>Hi</h1><a href="/about#team">Team</a><a href="/about?ref=nav">About</a>`,
      "components/AboutBody.tsx": `<h1>About</h1>`,
    };
    const result = auditSeo(files, pages, siteWide);
    expect(result.issues.some((i) => i.category === "links")).toBe(false);
  });

  it("reports the same broken link only once even if it appears in multiple places", () => {
    const files = { "components/Hero.tsx": `<a href="/nope">A</a><a href="/nope">B</a><h1>Hi</h1>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.filter((i) => i.category === "links")).toHaveLength(1);
  });
});

describe("auditSeo — headings", () => {
  it("warns when a page has no h1", () => {
    const files = { "components/Hero.tsx": `<p>No heading here</p>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "headings" && i.message.includes("no <h1>"))).toBe(true);
  });

  it("warns when a page has more than one h1", () => {
    const files = { "components/Hero.tsx": `<h1>One</h1><h1>Two</h1>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "headings" && i.message.includes("2 <h1>"))).toBe(true);
  });

  it("does not flag a page with exactly one h1", () => {
    const files = { "components/Hero.tsx": `<h1>Just one</h1>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "headings")).toBe(false);
  });
});

describe("auditSeo — structured data", () => {
  it("warns once, site-wide, when no file contains JSON-LD", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.filter((i) => i.category === "structured-data")).toHaveLength(1);
  });

  it("does not warn when at least one file contains JSON-LD", () => {
    const files = {
      "components/Hero.tsx": `<h1>Hi</h1>`,
      "components/Navbar.tsx": `<script type="application/ld+json">{}</script>`,
    };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "structured-data")).toBe(false);
  });
});

describe("auditSeo — scoring", () => {
  it("scores a fully clean single-page site at 100 minus only the unavoidable site-wide structured-data warning", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1><a href="/">Home</a>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.score).toBe(97); // 100 - 3 (structured-data warning)
  });

  it("never goes below 0 even with many issues", () => {
    const files = {
      "components/Hero.tsx": `<img src="/a.png" /><img src="/b.png" /><a href="/x1">a</a><a href="/x2">b</a><a href="/x3">c</a>`,
    };
    const result = auditSeo(files, [page(), page({ slug: "p2", path: "/p2" }), page({ slug: "p3", path: "/p3" })], {
      title: "",
      description: "",
    });
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("deducts more for errors than warnings, reflected in a bigger score drop", () => {
    const cleanFiles = { "components/Hero.tsx": `<h1>Hi</h1><a href="/">Home</a>` };
    const withError = { "components/Hero.tsx": `<h1>Hi</h1><img src="/x.png" />` }; // missing alt = error
    const withWarningOnly = { "components/Hero.tsx": `<h1>Hi</h1><h1>Again</h1>` }; // multiple h1 = warning

    const clean = auditSeo(cleanFiles, [page()], siteWide).score;
    const errorScore = auditSeo(withError, [page()], siteWide).score;
    const warningScore = auditSeo(withWarningOnly, [page()], siteWide).score;

    expect(clean - errorScore).toBeGreaterThan(clean - warningScore);
  });
});

describe("auditSeo — form labels", () => {
  it("flags an input with no aria-label and no matching <label>", () => {
    const files = { "components/Hero.tsx": `<h1>Contact</h1><input type="email" />` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "labels")).toBe(true);
  });

  it("does not flag an input with an aria-label", () => {
    const files = { "components/Hero.tsx": `<h1>Contact</h1><input type="email" aria-label="Email address" />` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "labels")).toBe(false);
  });

  it("does not flag an input whose id matches a label's htmlFor", () => {
    const files = {
      "components/Hero.tsx": `<h1>Contact</h1><label htmlFor="email">Email</label><input id="email" type="email" />`,
    };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "labels")).toBe(false);
  });

  it("does not flag a hidden input", () => {
    const files = { "components/Hero.tsx": `<h1>Contact</h1><input type="hidden" name="csrf" />` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "labels")).toBe(false);
  });

  it("flags an unlabeled textarea the same way as an unlabeled input", () => {
    const files = { "components/Hero.tsx": `<h1>Contact</h1><textarea></textarea>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "labels")).toBe(true);
  });

  it("counts multiple unlabeled fields as one issue reporting the count", () => {
    const files = { "components/Hero.tsx": `<input type="text" /><input type="email" /><h1>Hi</h1>` };
    const result = auditSeo(files, [page()], siteWide);
    const issue = result.issues.find((i) => i.category === "labels");
    expect(issue?.message).toContain("2 form fields");
  });

  it("does not flag a page with no form fields at all", () => {
    const files = { "components/Hero.tsx": `<h1>Hi</h1>` };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "labels")).toBe(false);
  });
});

describe("auditSeo — accessible names", () => {
  // Unlike the regex-based checks above, this one runs on parseJsxTree,
  // which requires an actual parseable component (a function with a real
  // return statement) — a bare JSX fragment silently parses to an empty
  // tree with a "no JSX return statement" error, which checkAccessibleNames
  // treats as "nothing to check" and skips. That distinction matters here
  // specifically: every fixture below is a real component, not a fragment,
  // or a "does not flag" test would pass vacuously (found nothing because
  // it never parsed, not because the check correctly evaluated real
  // content) rather than for the right reason.
  function component(jsx: string): string {
    return `export default function Hero() { return (${jsx}); }`;
  }

  it("flags a button with no text and no aria-label", () => {
    const files = { "components/Hero.tsx": component(`<><h1>Hi</h1><button><svg /></button></>`) };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "accessible-names")).toBe(true);
  });

  it("does not flag a button with direct text", () => {
    const files = { "components/Hero.tsx": component(`<><h1>Hi</h1><button>Submit</button></>`) };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "accessible-names")).toBe(false);
  });

  it("does not flag a button whose accessible text comes from a nested span", () => {
    const files = { "components/Hero.tsx": component(`<><h1>Hi</h1><button><span>Learn more</span></button></>`) };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "accessible-names")).toBe(false);
  });

  it("does not flag a button with only an aria-label", () => {
    const files = { "components/Hero.tsx": component(`<><h1>Hi</h1><button aria-label="Close menu"><svg /></button></>`) };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "accessible-names")).toBe(false);
  });

  it("flags an icon-only link the same way as an icon-only button", () => {
    const files = { "components/Hero.tsx": component(`<><h1>Hi</h1><a href="/social"><svg /></a></>`) };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "accessible-names")).toBe(true);
  });

  it("does not flag a page with no buttons or links at all", () => {
    const files = { "components/Hero.tsx": component(`<><h1>Hi</h1><p>Just text.</p></>`) };
    const result = auditSeo(files, [page()], siteWide);
    expect(result.issues.some((i) => i.category === "accessible-names")).toBe(false);
  });

  it("does not crash the whole audit when one section fails to parse", () => {
    const files = { "components/Broken.tsx": "export default function Broken() { return <div" };
    expect(() => auditSeo(files, [page({ sections: ["Broken"] })], siteWide)).not.toThrow();
  });

  it("confirms the crash-resistance test above is meaningful — the malformed file genuinely fails to parse rather than accidentally succeeding", () => {
    // Guards against the previous test passing vacuously for the wrong
    // reason (e.g. if some future change made malformed source parse
    // successfully with an empty tree instead of erroring) — asserts the
    // actual precondition the crash-resistance test depends on.
    const { error } = parseJsxTree("export default function Broken() { return <div");
    expect(error).not.toBeNull();
  });
});
