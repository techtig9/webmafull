/** websiteType, style, and colorPreference map directly onto real fields
 * FollowUpAnswers already accepts (see gemini.ts) — no schema change needed,
 * they flow straight into the actual generation prompt. Pages and the two
 * "Advanced options" fields (targetAudience, primaryCta) don't have a
 * dedicated backend field, so rather than invent one, they're folded into
 * the description text itself as plain-language hints — an honest way to
 * use them (the AI genuinely reads and can act on them) without a fake
 * "Advanced Options" control that's wired to nothing. */
export interface StructuredFormInput {
  description: string;
  pages?: string;
  targetAudience?: string;
  primaryCta?: string;
}

export function buildEnrichedDescription({ description, pages, targetAudience, primaryCta }: StructuredFormInput): string {
  const hints: string[] = [];
  if (pages) hints.push(`The site should have approximately ${pages} pages.`);
  if (targetAudience) hints.push(`Primary audience: ${targetAudience}.`);
  if (primaryCta) hints.push(`Main call to action: ${primaryCta}.`);

  if (hints.length === 0) return description;
  return `${description.trim()}\n\n${hints.join(" ")}`;
}
