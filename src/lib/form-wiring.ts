/** Generated form components can't know their project's real ID at generation
 * time — the project row doesn't exist yet until after generation completes
 * (see generate-website/route.ts). The AI generation prompt (SITE_FILES_SYSTEM_PROMPT
 * in gemini.ts) instructs the model to use this exact literal token as a
 * stand-in; substituteProjectId below replaces it with the real ID once known,
 * right before the files are persisted. Defined once here so the prompt text
 * and the substitution logic can't silently drift out of sync with each other. */
export const WEBMA_PROJECT_ID_PLACEHOLDER = "__WEBMA_PROJECT_ID__";

/** Replaces every occurrence of the placeholder token across all files with the
 * real project ID. Safe to call even if no file actually contains the token
 * (a site with no forms) — those files pass through unchanged. */
export function substituteProjectId(files: Record<string, string>, projectId: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    result[path] = content.includes(WEBMA_PROJECT_ID_PLACEHOLDER)
      ? content.split(WEBMA_PROJECT_ID_PLACEHOLDER).join(projectId)
      : content;
  }
  return result;
}
