/** Style categories the property inspector can edit directly. Each maps to a
 * regex identifying utilities of that kind in a className string — deliberately
 * per-category rather than one generic pattern, since Tailwind's own utility
 * shapes differ (colors are "<prefix>-<word>-<number>", font sizes are a fixed
 * named scale, spacing is "p-<number>|px"). Getting a category's pattern wrong
 * either leaves stale utilities behind or eats ones it shouldn't — these are
 * intentionally narrow rather than clever. */
export type StyleCategory = "text-color" | "bg-color" | "font-size" | "font-weight" | "padding";

const CATEGORY_PATTERNS: Record<StyleCategory, RegExp> = {
  "text-color": /\btext-[a-z]+-\d{2,3}\b/g,
  "bg-color": /\bbg-[a-z]+-\d{2,3}\b/g,
  "font-size": /\btext-(?:xs|sm|base|lg|xl|\d+xl)\b/g,
  "font-weight": /\bfont-(?:thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/g,
  padding: /\bp-(?:px|0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12|14|16|20|24)\b/g,
};

/** Replaces an existing utility of `category` within a className string with
 * `newUtility`, or appends it if none of that category is present yet. */
export function swapUtility(className: string, category: StyleCategory, newUtility: string): string {
  const withoutOld = className.replace(CATEGORY_PATTERNS[category], "").replace(/\s+/g, " ").trim();
  return withoutOld.length > 0 ? `${withoutOld} ${newUtility}` : newUtility;
}

/** Thin, category-named wrapper kept for the two categories the first version
 * of this file shipped with (text/background color) — swapUtility above is
 * the general form new categories should use directly. */
export function swapColorUtility(className: string, category: "text" | "bg", newUtility: string): string {
  return swapUtility(className, category === "text" ? "text-color" : "bg-color", newUtility);
}

export interface ClassNameEditResult {
  source: string;
  /** True only when the edit was applied — exactly one element in the file had
   * this exact className, so the replacement is unambiguous. False (source
   * unchanged) when the className appears zero or multiple times, since a
   * blind string-replace in either case risks silently editing the wrong
   * element or none at all — the caller should fall back to a targeted AI
   * edit instead of trusting a direct patch it can't verify is safe. */
  applied: boolean;
}

/** The general form: attempts a direct, deterministic edit of any single JSX
 * attribute (className, src, alt, href, ...) by finding the literal
 * attr="value" and swapping it — but only if that exact string appears
 * exactly once in the file. Deliberately conservative rather than clever:
 * no JSX parsing, no fuzzy matching, because a wrong guess here means
 * visibly editing the wrong element with no review step in between (unlike
 * the AI edit path, which at least goes through a model that saw the
 * actual instruction). applyClassNameEdit below is a thin, named wrapper
 * kept for callers that only ever touch className. */
export function applyAttributeEdit(
  source: string,
  attrName: string,
  targetValue: string,
  newValue: string
): ClassNameEditResult {
  const literal = `${attrName}=${JSON.stringify(targetValue)}`;
  const occurrences = source.split(literal).length - 1;

  if (occurrences !== 1) {
    return { source, applied: false };
  }

  return { source: source.replace(literal, `${attrName}=${JSON.stringify(newValue)}`), applied: true };
}

export function applyClassNameEdit(source: string, targetClassName: string, newClassName: string): ClassNameEditResult {
  return applyAttributeEdit(source, "className", targetClassName, newClassName);
}

export interface StyleOption {
  label: string;
  utility: string;
  /** Only present for color options — drives the swatch preview color in the
   * UI. Non-color options (font size/weight, spacing) render as labeled
   * buttons instead of color swatches. */
  previewColor?: string;
}

/** A deliberately small, curated palette rather than the full Tailwind color
 * space — this is a quick-style shortcut for common cases, not a full color
 * picker. Matches the app's own accent colors (tailwind.config.ts) plus a
 * few neutrals, so a "quick" style choice still looks intentional next to
 * whatever the AI generated. */
export const TEXT_COLOR_SWATCHES: StyleOption[] = [
  { label: "Slate", utility: "text-slate-900", previewColor: "#0f172a" },
  { label: "White", utility: "text-white", previewColor: "#ffffff" },
  { label: "Violet", utility: "text-violet-600", previewColor: "#7c3aed" },
  { label: "Blue", utility: "text-blue-600", previewColor: "#2563eb" },
  { label: "Teal", utility: "text-teal-600", previewColor: "#0d9488" },
  { label: "Amber", utility: "text-amber-600", previewColor: "#d97706" },
];

export const BG_COLOR_SWATCHES: StyleOption[] = [
  { label: "White", utility: "bg-white", previewColor: "#ffffff" },
  { label: "Slate 50", utility: "bg-slate-50", previewColor: "#f8fafc" },
  { label: "Slate 900", utility: "bg-slate-900", previewColor: "#0f172a" },
  { label: "Violet", utility: "bg-violet-600", previewColor: "#7c3aed" },
  { label: "Blue", utility: "bg-blue-600", previewColor: "#2563eb" },
  { label: "Teal", utility: "bg-teal-600", previewColor: "#0d9488" },
];

export const FONT_SIZE_OPTIONS: StyleOption[] = [
  { label: "S", utility: "text-sm" },
  { label: "Base", utility: "text-base" },
  { label: "L", utility: "text-lg" },
  { label: "XL", utility: "text-xl" },
  { label: "2XL", utility: "text-2xl" },
  { label: "4XL", utility: "text-4xl" },
];

export const FONT_WEIGHT_OPTIONS: StyleOption[] = [
  { label: "Normal", utility: "font-normal" },
  { label: "Medium", utility: "font-medium" },
  { label: "Semibold", utility: "font-semibold" },
  { label: "Bold", utility: "font-bold" },
];

export const PADDING_OPTIONS: StyleOption[] = [
  { label: "None", utility: "p-0" },
  { label: "S", utility: "p-2" },
  { label: "M", utility: "p-4" },
  { label: "L", utility: "p-8" },
  { label: "XL", utility: "p-12" },
];
