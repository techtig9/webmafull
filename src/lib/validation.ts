import { z } from "zod";

// Shared request-body schemas for the AI routes. Centralized here so the credit-cost
// gate and the AI call always operate on data that's already been shape-checked —
// per the Security standard: "Input validation" on every route, not just type assertions.

export const generateWebsiteSchema = z.object({
  name: z.string().trim().min(1, "Website name is required.").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(2000),
  answers: z.record(z.string()).optional().default({}),
  projectId: z.string().uuid().nullable().optional(),
});

export const followUpQuestionsSchema = z.object({
  name: z.string().trim().min(1, "Website name is required.").max(120),
  description: z.string().trim().min(10, "Description must be at least 10 characters.").max(2000),
});

export const transcribeSchema = z.object({
  audio: z.string().min(1, "No audio received."),
  mimeType: z.string().default("audio/webm"),
});

export const exportZipSchema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(["zip", "react", "nextjs"]),
});

export const deploySchema = z.object({
  projectId: z.string().uuid(),
});

export const saveProjectSchema = z.object({
  projectId: z.string().uuid(),
  files: z.record(z.string()),
  // Optional: lets autosave persist in-flight page/section-order edits (e.g. from
  // the drag-to-reorder panel) alongside file content, instead of silently
  // dropping them — dedicated endpoints like reorder-sections already persist
  // their own change immediately, this is a safety net for the general Save path.
  pages: z.array(z.record(z.unknown())).optional(),
});
export const archiveProjectSchema = z.object({
  projectId: z.string().uuid(),
  archived: z.boolean(),
});
export const generateNewPageSchema = z.object({
  projectId: z.string().uuid(),
  pageName: z.string().trim().min(1, "Page name is required.").max(60),
  pageDescription: z.string().trim().min(5, "Describe what should be on this page.").max(500),
});

export const renamePageSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
  name: z.string().trim().min(1, "Page name is required.").max(60),
});

export const deletePageSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
});

export const reorderPagesSchema = z.object({
  projectId: z.string().uuid(),
  orderedSlugs: z.array(z.string()).min(1),
});
export const reorderSectionsSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
  orderedSections: z.array(z.string()).min(1),
});
export const updatePageSeoSchema = z.object({
  projectId: z.string().uuid(),
  slug: z.string().min(1),
  seoTitle: z.string().trim().max(60, "Titles over 60 characters get truncated in search results.").optional(),
  seoDescription: z
    .string()
    .trim()
    .max(160, "Descriptions over 160 characters get truncated in search results.")
    .optional(),
  seoOgImageUrl: z.string().trim().url().optional().or(z.literal("")),
});
export const feedbackSchema = z.object({
  type: z.enum(["bug", "feature", "other"]),
  message: z.string().trim().min(10, "Give a few more details (at least 10 characters).").max(2000),
});
export const renameProjectSchema = z.object({
  projectId: z.string().uuid(),
  name: z.string().trim().min(1, "Website name is required.").max(120),
});

export const duplicateProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const deleteProjectSchema = z.object({
  projectId: z.string().uuid(),
});

export const deleteAssetSchema = z.object({
  assetId: z.string().uuid(),
});

// A public site visitor's browser submits this — no auth, so keep it minimal
// and let the route itself compute anything privacy-sensitive (the visitor
// hash), never trust the client to supply one.
export const trackPageViewSchema = z.object({
  projectId: z.string().uuid(),
  path: z.string().min(1).max(300).default("/"),
  referrer: z.string().max(500).optional(),
});

// A public site visitor's browser submits this — no auth, so validate the
// shape strictly and keep it small. `data` is capped in both key count and
// total size in the route itself (zod alone can't bound total JSON size).
export const formSubmitSchema = z.object({
  projectId: z.string().uuid(),
  pageSlug: z.string().min(1).max(120).default("index"),
  formName: z.string().min(1).max(80).default("contact"),
  data: z.record(z.string().max(4000)).refine((d) => Object.keys(d).length <= 30, {
    message: "A form submission can have at most 30 fields.",
  }),
  // Honeypot field: generated forms include a visually-hidden input real
  // users never fill in. Any value here means a bot filled every field
  // blindly — the route accepts the request (so the bot doesn't learn to
  // avoid it) but silently discards it instead of storing or counting it.
  website: z.string().optional(),
});

/** Runs a zod schema against a parsed request body and returns either the typed data
 * or a ready-to-return 400 response body — callers check `parsed.success`. */
export function validate<T extends z.ZodTypeAny>(schema: T, body: unknown):
  | { success: true; data: z.infer<T> }
  | { success: false; error: string } {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { success: false, error: result.error.issues[0]?.message ?? "Invalid request." };
  }
  return { success: true, data: result.data };
}
