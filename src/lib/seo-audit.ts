import type { Page } from "@/lib/preview";
import { sectionFileKey } from "@/lib/preview";
import { parseJsxTree, nodeHasAccessibleName, type JsxTreeNode } from "@/lib/jsx-tree";

export interface SeoIssue {
  severity: "error" | "warning";
  category: "meta" | "alt-text" | "links" | "structured-data" | "headings" | "labels" | "accessible-names";
  message: string;
  pageSlug?: string;
}

export interface SeoAuditResult {
  /** 0-100. Starts at 100, each issue deducts a fixed amount by severity —
   * see SEVERITY_PENALTY below. Deliberately a simple, explainable
   * deduction model rather than a black-box weighted formula: someone
   * looking at their score should be able to reconstruct it from the issue
   * list alone. */
  score: number;
  issues: SeoIssue[];
}

const SEVERITY_PENALTY: Record<SeoIssue["severity"], number> = { error: 8, warning: 3 };

/** Combines the source of every section a page actually uses, so checks that
 * need "the whole page's HTML" (heading hierarchy, alt text) can run once
 * per page instead of the caller re-deriving this for every check. */
function pageSource(files: Record<string, string>, page: Page): string {
  return page.sections.map((s) => files[sectionFileKey(files, s)] ?? "").join("\n");
}

function checkMeta(page: Page, siteTitle: string, siteDescription: string): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const title = page.seoTitle || siteTitle;
  const description = page.seoDescription || siteDescription;
  if (!title || title.trim().length === 0) {
    issues.push({ severity: "error", category: "meta", message: `"${page.name}" has no page title, and no site-wide title to fall back to.`, pageSlug: page.slug });
  } else if (title.length > 60) {
    issues.push({ severity: "warning", category: "meta", message: `"${page.name}"'s title is ${title.length} characters — search engines usually truncate past ~60.`, pageSlug: page.slug });
  }
  if (!description || description.trim().length === 0) {
    issues.push({ severity: "error", category: "meta", message: `"${page.name}" has no meta description, and no site-wide description to fall back to.`, pageSlug: page.slug });
  } else if (description.length > 160) {
    issues.push({ severity: "warning", category: "meta", message: `"${page.name}"'s description is ${description.length} characters — search engines usually truncate past ~160.`, pageSlug: page.slug });
  }
  return issues;
}

/** Matches <img ...> tags and flags ones with no alt attribute at all.
 * Doesn't try to judge whether an alt value is *good* (that needs real
 * understanding of the image content) — only whether it's present, which is
 * the part that's both mechanically checkable and an actual accessibility/
 * SEO requirement (WCAG 1.1.1) rather than a style opinion. */
function checkAltText(source: string, page: Page): SeoIssue[] {
  const imgTags = source.match(/<img\b[^>]*>/g) ?? [];
  const missing = imgTags.filter((tag) => !/\balt\s*=/.test(tag));
  if (missing.length === 0) return [];
  return [
    {
      severity: "error",
      category: "alt-text",
      message: `"${page.name}" has ${missing.length} image${missing.length === 1 ? "" : "s"} with no alt text.`,
      pageSlug: page.slug,
    },
  ];
}

/** Flags <a href="/..."> links that don't match any real page path. Ignores
 * external links (http/https/mailto/tel), same-page anchors (#...), and the
 * bare "/" home link, which is always valid. This is a real, useful check —
 * broken internal navigation is a common side effect of an AI edit that
 * renamed or removed a page without updating every link to it — but it's
 * necessarily limited to href="..." literals; it can't follow a computed or
 * templated href. */
function checkBrokenLinks(source: string, page: Page, allPages: Page[]): SeoIssue[] {
  const hrefs = [...source.matchAll(/href=["']([^"']+)["']/g)].map((m) => m[1]);
  const validPaths = new Set(allPages.map((p) => p.path));
  const broken = hrefs.filter((href) => {
    if (!href.startsWith("/") || href === "/") return false;
    if (href.startsWith("//")) return false; // protocol-relative external link
    const path = href.split("#")[0].split("?")[0];
    return path.length > 0 && !validPaths.has(path);
  });
  const unique = [...new Set(broken)];
  if (unique.length === 0) return [];
  return unique.map((href) => ({
    severity: "error" as const,
    category: "links" as const,
    message: `"${page.name}" links to "${href}", which doesn't match any page on this site.`,
    pageSlug: page.slug,
  }));
}

/** A page should have exactly one <h1> — zero means no clear primary
 * heading for search engines or screen-reader users to key off of; more
 * than one dilutes which heading is actually the page's main subject. */
function checkHeadings(source: string, page: Page): SeoIssue[] {
  const h1Count = (source.match(/<h1\b/g) ?? []).length;
  if (h1Count === 0) {
    return [{ severity: "warning", category: "headings", message: `"${page.name}" has no <h1> heading.`, pageSlug: page.slug }];
  }
  if (h1Count > 1) {
    return [{ severity: "warning", category: "headings", message: `"${page.name}" has ${h1Count} <h1> headings — search engines expect one primary heading per page.`, pageSlug: page.slug }];
  }
  return [];
}

function checkStructuredData(files: Record<string, string>): SeoIssue[] {
  const hasAny = Object.values(files).some((content) => content.includes("application/ld+json"));
  if (hasAny) return [];
  return [{ severity: "warning", category: "structured-data", message: "No structured data (JSON-LD) found anywhere on the site — search engines can't build a rich result for it." }];
}

/** Flags <input>/<textarea> fields with no associated label — no aria-label,
 * no aria-labelledby, and no <label htmlFor="..."> whose target matches the
 * field's id. Screen reader users have no way to know what a field is for
 * without one (WCAG 1.3.1 / 3.3.2). Regex-based like the other simple,
 * self-closing-tag checks above (alt text) — genuinely tractable that way
 * since it's attribute presence on a single tag, not a nested-structure
 * question. Known limitation: doesn't detect implicit labeling
 * (<label>Name <input /></label>, with no htmlFor at all) — a real,
 * accessible pattern this check can't currently distinguish from a
 * genuinely unlabeled field, so it may occasionally flag a field that's
 * actually fine. Hidden fields (type="hidden") are excluded since they're
 * never visible to a user and don't need a label at all. */
function checkFormLabels(source: string, page: Page): SeoIssue[] {
  const fields = [...(source.match(/<input\b[^>]*>/g) ?? []), ...(source.match(/<textarea\b[^>]*>/g) ?? [])];
  const visibleFields = fields.filter((tag) => !/type\s*=\s*["']hidden["']/.test(tag));
  if (visibleFields.length === 0) return [];

  const labeledIds = new Set(
    [...source.matchAll(/<label\b[^>]*\b(?:htmlFor|for)=["']([^"']+)["']/g)].map((m) => m[1])
  );

  const unlabeled = visibleFields.filter((tag) => {
    if (/\baria-label\s*=/.test(tag) || /\baria-labelledby\s*=/.test(tag)) return false;
    const idMatch = tag.match(/\bid=["']([^"']+)["']/);
    return !(idMatch && labeledIds.has(idMatch[1]));
  });

  if (unlabeled.length === 0) return [];
  return [
    {
      severity: "error",
      category: "labels",
      message: `"${page.name}" has ${unlabeled.length} form field${unlabeled.length === 1 ? "" : "s"} with no associated label.`,
      pageSlug: page.slug,
    },
  ];
}

function collectByTag(nodes: JsxTreeNode[], tags: Set<string>, out: JsxTreeNode[]): void {
  for (const n of nodes) {
    if (tags.has(n.tag.toLowerCase())) out.push(n);
    collectByTag(n.children, tags, out);
  }
}

/** Flags <button>/<a> elements with no accessible name at all — no text
 * anywhere in their subtree, no aria-label, no descendant <img alt="...">.
 * Typically an icon-only control (a close button, a social link) that only
 * conveys meaning visually (WCAG 4.1.2). This is the one accessibility
 * check in this file that genuinely needs real AST parsing rather than
 * regex — "does this button have text anywhere among its descendants,
 * however deeply nested" is not a question a regex over raw source can
 * answer reliably, since matching arbitrarily nested balanced tags isn't a
 * regular language. See nodeHasAccessibleName's own doc comment in
 * jsx-tree.ts for the specific case (grandchild text via a wrapping <span>)
 * that motivated building this on the parser instead. A parse failure on a
 * given section is skipped rather than surfaced here — the Layers panel
 * already surfaces per-file parse errors on its own; duplicating that here
 * would just be a second, less specific version of the same signal. */
function checkAccessibleNames(files: Record<string, string>, page: Page): SeoIssue[] {
  let missing = 0;
  for (const section of page.sections) {
    const file = sectionFileKey(files, section);
    const source = files[file];
    if (source === undefined) continue;
    const { tree, error } = parseJsxTree(source);
    if (error) continue;
    const targets: JsxTreeNode[] = [];
    collectByTag(tree, new Set(["button", "a"]), targets);
    missing += targets.filter((t) => !nodeHasAccessibleName(t)).length;
  }
  if (missing === 0) return [];
  return [
    {
      severity: "error",
      category: "accessible-names",
      message: `"${page.name}" has ${missing} button${missing === 1 ? "" : "s"}/link${missing === 1 ? "" : "s"} with no accessible name — likely icon-only with no aria-label.`,
      pageSlug: page.slug,
    },
  ];
}

export function auditSeo(
  files: Record<string, string>,
  pages: Page[],
  siteWide: { title: string; description: string }
): SeoAuditResult {
  const issues: SeoIssue[] = [];

  for (const page of pages) {
    const source = pageSource(files, page);
    issues.push(...checkMeta(page, siteWide.title, siteWide.description));
    issues.push(...checkAltText(source, page));
    issues.push(...checkBrokenLinks(source, page, pages));
    issues.push(...checkHeadings(source, page));
    issues.push(...checkFormLabels(source, page));
    issues.push(...checkAccessibleNames(files, page));
  }
  issues.push(...checkStructuredData(files));

  const deduction = issues.reduce((sum, i) => sum + SEVERITY_PENALTY[i.severity], 0);
  const score = Math.max(0, 100 - deduction);

  return { score, issues };
}
