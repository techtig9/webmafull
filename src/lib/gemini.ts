// Multi-provider AI routing, replacing the old Gemini-primary/OpenAI-fallback setup.
//
// Simple/lite tasks (small edits, theme changes, follow-up questions, voice
// transcription) go through a free chain: Groq first, falling back automatically
// to Cerebras, then OpenRouter, if a provider hits its rate limit or errors for
// any other reason. All three speak the same OpenAI-compatible API shape, so one
// client class (just pointed at a different baseURL) talks to all of them.
//
// Complex/bigger tasks (full website generation, clone-from-url, regenerate) go
// to Claude Sonnet 5 instead — a stronger model for the hardest job this app does.
// If Claude itself fails, it falls back to the same free chain as a last resort,
// rather than showing the user a hard failure.
//
// Every model name below is a "last known good as of this build" default, not a
// permanent answer — free-tier model catalogs (especially Cerebras and
// OpenRouter's free lineup) change often. Setting GROQ_MODEL / CEREBRAS_MODEL /
// OPENROUTER_MODEL / CLAUDE_MODEL in your environment overrides these without any
// code change or redeploy debugging — just update the value and redeploy.

import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { createServiceRoleClient } from "@/lib/supabase/server";
import type { Page } from "@/lib/preview";
import { WEBMA_PROJECT_ID_PLACEHOLDER } from "@/lib/form-wiring";
import crypto from "crypto";

const groq = process.env.GROQ_API_KEY
  ? new OpenAI({ apiKey: process.env.GROQ_API_KEY, baseURL: "https://api.groq.com/openai/v1" })
  : null;
const cerebras = process.env.CEREBRAS_API_KEY
  ? new OpenAI({ apiKey: process.env.CEREBRAS_API_KEY, baseURL: "https://api.cerebras.ai/v1" })
  : null;
const openrouter = process.env.OPENROUTER_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENROUTER_API_KEY, baseURL: "https://openrouter.ai/api/v1" })
  : null;
const anthropic = process.env.ANTHROPIC_API_KEY ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// Complex, multi-section reasoning gets Claude. Everything else (theme tweaks,
// small edits, transcription, follow-up questions) routes to the free chain.
const COMPLEX_TASKS = new Set([
  "generate_full_website",
  "generate_site_spec",
  "generate_site_files",
  "generate_from_url",
  "regenerate_complete",
] as const);

export type GeminiTask =
  | "generate_full_website"
  | "generate_site_spec"
  | "generate_site_files"
  | "generate_from_url"
  | "regenerate_complete"
  | "ai_edit"
  | "generate_new_page"
  | "change_theme"
  | "follow_up_questions"
  | "voice_transcription";

/** Strips repeated whitespace/instructions and trims dead weight before it ever hits the API. */
export function compressPrompt(raw: string): string {
  return raw
    .replace(/\s+/g, " ")
    .replace(/(please|kindly)\s+/gi, "")
    .trim();
}

function cacheKey(task: GeminiTask, prompt: string) {
  return crypto.createHash("sha256").update(`${task}:${prompt}`).digest("hex");
}

/** Tries Groq, then Cerebras, then OpenRouter — moving to the next the instant one
 * hits a rate limit or fails for any other reason. Throws only if every configured
 * provider in the chain fails (or none are configured at all). */
async function callFreeChain(
  compressed: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean }
): Promise<{ text: string; provider: "groq" | "cerebras" | "openrouter" }> {
  const chain: Array<{ name: "groq" | "cerebras" | "openrouter"; client: OpenAI | null; model: string }> = [
    { name: "groq", client: groq, model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile" },
    { name: "cerebras", client: cerebras, model: process.env.CEREBRAS_MODEL ?? "gpt-oss-120b" },
    // openrouter/free is OpenRouter's own auto-router — it always resolves to
    // whatever free model is currently live, so this link never goes stale even
    // as OpenRouter's actual free-model lineup changes underneath it.
    { name: "openrouter", client: openrouter, model: process.env.OPENROUTER_MODEL ?? "openrouter/free" },
  ];

  let lastError: unknown = null;

  for (const provider of chain) {
    if (!provider.client) continue;
    try {
      const completion = await provider.client.chat.completions.create({
        model: provider.model,
        messages: [
          ...(opts.systemPrompt ? [{ role: "system" as const, content: opts.systemPrompt }] : []),
          { role: "user" as const, content: compressed },
        ],
        response_format: opts.jsonOutput ? { type: "json_object" } : undefined,
      });
      const text = completion.choices[0]?.message?.content;
      if (!text) throw new Error(`${provider.name} returned an empty response.`);
      return { text, provider: provider.name };
    } catch (err) {
      console.error(`${provider.name} failed, trying next provider in the free chain`, err);
      lastError = err;
    }
  }

  throw lastError ?? new Error("No free-tier AI provider is configured (GROQ_API_KEY / CEREBRAS_API_KEY / OPENROUTER_API_KEY).");
}

/** Complex tasks go to Claude Sonnet 5. Falls back to the free chain as a last
 * resort if Claude itself fails, so a Claude-side outage doesn't hard-fail the
 * request when a (lower-quality but working) alternative is available. */
async function callClaude(
  compressed: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean }
): Promise<{ text: string; provider: "claude" | "groq" | "cerebras" | "openrouter" }> {
  if (anthropic) {
    try {
      const message = await anthropic.messages.create({
        model: process.env.CLAUDE_MODEL ?? "claude-sonnet-5",
        max_tokens: Number(process.env.CLAUDE_MAX_TOKENS ?? 8192),
        system: opts.systemPrompt,
        messages: [{ role: "user", content: compressed }],
      });
      const block = message.content[0];
      const text = block && block.type === "text" ? block.text : "";
      if (!text) throw new Error("Claude returned an empty response.");
      return { text, provider: "claude" };
    } catch (err) {
      console.error("Claude failed, falling back to the free chain", err);
    }
  }

  return callFreeChain(compressed, opts);
}

async function callModel(
  task: GeminiTask,
  compressed: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean }
): Promise<{ text: string; provider: string }> {
  const isComplex = (COMPLEX_TASKS as Set<string>).has(task);
  return isComplex ? callClaude(compressed, opts) : callFreeChain(compressed, opts);
}

/**
 * Calls the model (with automatic provider fallback) and caches the result: identical
 * (task, prompt) pairs reuse the last output instead of spending a fresh API call —
 * this is what lets "regenerate" and repeated theme/edit requests stay cheap under
 * the credit-cost table.
 */
export async function generateWithCache(
  task: GeminiTask,
  prompt: string,
  opts: { systemPrompt?: string; jsonOutput?: boolean } = {}
): Promise<{ text: string; cacheHit: boolean }> {
  const compressed = compressPrompt(prompt);
  const key = cacheKey(task, compressed);
  const supabase = createServiceRoleClient();

  const { data: cached } = await supabase
    .from("ai_response_cache")
    .select("response")
    .eq("cache_key", key)
    .maybeSingle();

  if (cached?.response) {
    return { text: cached.response as string, cacheHit: true };
  }

  const { text, provider } = await callModel(task, compressed, opts);

  await supabase.from("ai_response_cache").upsert({
    cache_key: key,
    task,
    response: text,
    created_at: new Date().toISOString(),
  });

  if (provider !== "claude") {
    console.warn(`Task "${task}" served by ${provider} (free chain).`);
  }

  return { text, cacheHit: false };
}

// ---------------------------------------------------------------------------
// Domain-specific helpers built on top of generateWithCache
// ---------------------------------------------------------------------------

export const SITE_SYSTEM_PROMPT = `You are webma's website-generation engine. Given a plain-language
description of a business or project, and the user's answers to a short follow-up
questionnaire (website type, theme, color preference, style), output a complete,
responsive, MULTI-PAGE website as React + Tailwind CSS components.

Always include a Home page. Add 1-4 additional pages that genuinely make sense for
this type of site (e.g. About, Services, Pricing, Contact) — use your judgment based
on the description; don't force pages that don't fit. Navbar and Footer should be
shared, reused components (written once, referenced by every page), not duplicated
per page. Write Navbar's navigation links as plain <a href="..."> tags pointing at
each page's exact "path" value below, so the site actually navigates correctly.

Respond ONLY with JSON in this exact shape, no prose, no markdown fences:
{
  "siteSpec": {
    "siteType": "business|portfolio|agency|restaurant|saas|ecommerce|blog|personal|landing|other",
    "goal": "primary conversion goal",
    "theme": { "style": "...", "colors": ["..."], "fontPairing": "...", "radius": "..." },
    "navigation": ["Home", "About"],
    "pages": [{ "name": "Home", "path": "/", "purpose": "...", "sections": ["Navbar", "Hero", "Footer"] }]
  },
  "files": { "components/Navbar.tsx": "...", "components/Hero.tsx": "...", ... },
  "pages": [
    { "slug": "index", "path": "/", "name": "Home", "sections": ["Navbar", "Hero", "About", "Footer"] },
    { "slug": "contact", "path": "/contact", "name": "Contact", "sections": ["Navbar", "ContactForm", "Footer"] }
  ]
}
Use "index" as the slug for the home page, and a short lowercase-hyphenated slug for
every other page (this becomes its URL folder name). Every name listed in any page's
"sections" must exactly match a key in "files" (minus the "components/" prefix and
file extension).

QUALITY AND DEPLOYMENT RULES:
- Use only React/Next.js primitives, Tailwind CSS, and lucide-react unless the prompt explicitly requires another dependency.
- Do not import packages that are not guaranteed to exist in the generated project's package.json.
- Keep components focused and reusable; do not put the entire website in one component.
- Every component file used by pages must export its primary component as export default function ComponentName(...) (or an equivalent default export).
- Use semantic HTML, keyboard-accessible controls, meaningful alt text, visible focus states, and readable color contrast.
- Make layouts responsive for mobile, tablet, and desktop; do not rely on fixed desktop-only widths.
- Prefer stable local content over external API calls. Never put secrets, API keys, or server credentials in generated client code.
- Keep navigation links aligned with the exact page paths returned in the pages array.
- Give buttons and links clear actions and avoid placeholder lorem ipsum in the final result.`;

// ---------------------------------------------------------------------------
// Two-phase generation (site plan, then site code)
// ---------------------------------------------------------------------------
// Split out of the single monolithic call SITE_SYSTEM_PROMPT still does for
// generateFromUrl below. Two real, separately-cacheable AI calls instead of
// one both (a) gives the generator UI something honest to show progress
// against — "Planning structure" and "Generating code" are genuinely distinct
// requests, not a fake timer over one opaque call — and (b) tends to produce
// more structurally consistent sites, since the model commits to a page/section
// plan before it has to simultaneously write every component's actual code.

export const SITE_SPEC_SYSTEM_PROMPT = `You are webma's website-planning engine. Given a plain-language
description of a business or project, and the user's answers to a short follow-up
questionnaire (website type, theme, color preference, style), plan a complete,
responsive, MULTI-PAGE website — you are planning the site's structure only, not
writing any code yet.

Always include a Home page. Add 1-4 additional pages that genuinely make sense for
this type of site (e.g. About, Services, Pricing, Contact) — use your judgment based
on the description; don't force pages that don't fit. Navbar and Footer should be
shared sections referenced by every page, not planned separately per page.

Respond ONLY with JSON in this exact shape, no prose, no markdown fences:
{
  "siteSpec": {
    "siteType": "business|portfolio|agency|restaurant|saas|ecommerce|blog|personal|landing|other",
    "goal": "primary conversion goal",
    "theme": { "style": "...", "colors": ["..."], "fontPairing": "...", "radius": "..." },
    "navigation": ["Home", "About"],
    "pages": [
      { "slug": "index", "path": "/", "name": "Home", "purpose": "...", "sections": ["Navbar", "Hero", "About", "Footer"] },
      { "slug": "contact", "path": "/contact", "name": "Contact", "purpose": "...", "sections": ["Navbar", "ContactForm", "Footer"] }
    ]
  }
}
Use "index" as the slug for the home page, and a short lowercase-hyphenated slug for
every other page (this becomes its URL folder name). Section names should be short
PascalCase component names (e.g. "Hero", "FeatureGrid", "ContactForm") — the next
step turns each into a real file, so name them the way you'd name a component file.`;

export const SITE_FILES_SYSTEM_PROMPT = `You are webma's website-generation engine. You will be given a
website description, the user's follow-up answers, and an approved site plan
(siteSpec) that has already been finalized for this project. Build the site's
components exactly according to that plan — do not add, remove, rename, or
reorder pages or sections from what the plan specifies.

Respond ONLY with JSON in this exact shape, no prose, no markdown fences:
{
  "files": { "components/Navbar.tsx": "...", "components/Hero.tsx": "...", ... }
}
Every section name listed in any of the plan's pages must have a matching entry
in "files" at "components/<SectionName>.tsx" (or .ts).

QUALITY AND DEPLOYMENT RULES:
- Use only React/Next.js primitives, Tailwind CSS, and lucide-react unless the prompt explicitly requires another dependency.
- Do not import packages that are not guaranteed to exist in the generated project's package.json.
- Keep components focused and reusable; do not put the entire website in one component.
- Every component file used by pages must export its primary component as export default function ComponentName(...) (or an equivalent default export).
- Use semantic HTML, keyboard-accessible controls, meaningful alt text, visible focus states, and readable color contrast.
- Make layouts responsive for mobile, tablet, and desktop; do not rely on fixed desktop-only widths.
- Prefer stable local content over external API calls. Never put secrets, API keys, or server credentials in generated client code.
- Write Navbar's navigation links as plain <a href="..."> tags pointing at each page's exact "path" from the plan, so the site actually navigates correctly.
- Give buttons and links clear actions and avoid placeholder lorem ipsum in the final result.
- Follow the plan's theme (style, colors, font pairing, radius) consistently across every component.
- Any <form> intended to collect visitor input (contact forms, newsletter signup, booking requests, etc.) must actually submit — never a decorative form with no real behavior. Give it an onSubmit handler that POSTs JSON to \`\${process.env.NEXT_PUBLIC_APP_URL}/api/public/forms/submit\` with body \`{ projectId: "${WEBMA_PROJECT_ID_PLACEHOLDER}", formName: "<short-kebab-case-name-for-this-form>", data: { ...the form's field values by name... } }\`. Use the exact literal string "${WEBMA_PROJECT_ID_PLACEHOLDER}" for projectId — it gets substituted with the real project ID after generation, so it must appear verbatim, not be treated as a variable to define. Show a success or error message to the visitor after submitting; disable the submit button while the request is in flight. Also include one visually-hidden input named "website" (e.g. a wrapper with "sr-only" or "hidden" styling, tabIndex={-1}, autoComplete="off") that stays empty for a real visitor — this is a spam honeypot, include its (always-empty) value as the "website" field in the submitted JSON body alongside "data".`;

export interface FollowUpAnswers {
  websiteType?: string;
  theme?: string;
  colorPreference?: string;
  style?: string;
}

export interface SiteSpecPage extends Page {
  purpose?: string;
}

export interface SiteSpec {
  siteType: string;
  goal: string;
  theme: { style: string; colors: string[]; fontPairing: string; radius: string };
  navigation: string[];
  pages: SiteSpecPage[];
}

export async function generateSiteSpec(
  description: string,
  answers: FollowUpAnswers
): Promise<{ siteSpec: SiteSpec; cacheHit: boolean }> {
  const prompt = `Website description: ${description}\nFollow-up answers: ${JSON.stringify(answers)}`;
  const { text, cacheHit } = await generateWithCache("generate_site_spec", prompt, {
    systemPrompt: SITE_SPEC_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  const parsed = JSON.parse(text) as { siteSpec: SiteSpec };
  return { siteSpec: parsed.siteSpec, cacheHit };
}

export async function generateSiteFiles(
  description: string,
  answers: FollowUpAnswers,
  siteSpec: SiteSpec
): Promise<{ files: Record<string, string>; cacheHit: boolean }> {
  const prompt = `Website description: ${description}\nFollow-up answers: ${JSON.stringify(answers)}\nApproved site plan (build exactly this — do not add, remove, or rename pages or sections):\n${JSON.stringify(siteSpec)}`;
  const { text, cacheHit } = await generateWithCache("generate_site_files", prompt, {
    systemPrompt: SITE_FILES_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  const parsed = JSON.parse(text) as { files: Record<string, string> };
  return { files: parsed.files, cacheHit };
}

/** Composes the two-phase spec+files calls back into the original single-shot
 * shape, for any caller that doesn't need per-phase progress (e.g. tests, or
 * a non-streaming fallback). The streaming route below calls generateSiteSpec
 * and generateSiteFiles directly instead, so it can emit progress between them. */
export async function generateFullWebsite(description: string, answers: FollowUpAnswers) {
  const { siteSpec, cacheHit: specCacheHit } = await generateSiteSpec(description, answers);
  const { files, cacheHit: filesCacheHit } = await generateSiteFiles(description, answers, siteSpec);
  const pages: Page[] = siteSpec.pages.map(({ purpose: _purpose, ...page }) => page);
  return {
    site: { files, pages, siteSpec: siteSpec as unknown as Record<string, unknown> },
    cacheHit: specCacheHit && filesCacheHit,
  };
}

/** Fetches a reference site and generates a similarly-structured site inspired by
 * its content — not a pixel clone (that would need visual/DOM analysis this text-only
 * pipeline doesn't do), but a real fetch-and-generate, not a stub. */
export async function generateFromUrl(url: string, answers: FollowUpAnswers) {
  let referenceContent: string;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Fetch failed with status ${res.status}`);
    const html = await res.text();
    // Strip tags/scripts/styles down to readable text — good enough for the model to
    // infer the site's purpose, tone, and structure without a full DOM parser.
    referenceContent = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 6000); // keep the prompt bounded regardless of source page size
  } catch (err) {
    throw new Error(`Couldn't fetch that URL to use as a reference: ${(err as Error).message}`);
  }

  const prompt = `Reference site content (from ${url}):\n${referenceContent}\n\nFollow-up answers: ${JSON.stringify(answers)}\n
Generate a NEW website inspired by this reference's apparent purpose, tone, and structure — reuse its
sense of what the business/project is about, but write original copy, do not copy sentences verbatim.`;

  const { text, cacheHit } = await generateWithCache("generate_from_url", prompt, {
    systemPrompt: SITE_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  return { site: JSON.parse(text) as { files: Record<string, string>; pages?: Page[] }, cacheHit };
}

const ASSISTANT_SYSTEM_PROMPT = `You are webma's website-building assistant. You help visitors and customers make
decisions — what kind of site they need, which template category fits their business, how to describe
their site so generation goes well, which plan fits their usage, and how to use webma's features
(AI editing, restyle, custom domains, exporting, deploying). You do NOT generate websites yourself in
this chat — if someone's ready to build, point them to the AI Generator. Keep answers short (2-4
sentences unless they ask for more), concrete, and specific to webma rather than generic advice. If
you don't know something about their specific account (their credits, their plan, their projects),
say so plainly rather than guessing.`;

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/** Multi-turn chat, unlike the single-shot generation calls above — no response
 * caching here since conversations are inherently unique per session. Routes
 * through the free chain (this is a "lite" task, not COMPLEX_TASKS). */
export async function chatWithAssistant(messages: ChatMessage[]): Promise<string> {
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
  const history = messages
    .slice(0, -1)
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const prompt = history ? `${history}\n\nUser: ${lastUserMessage}` : lastUserMessage;
  const { text } = await callFreeChain(compressPrompt(prompt), { systemPrompt: ASSISTANT_SYSTEM_PROMPT });
  return text;
}

export async function generateFollowUpQuestions(name: string, description: string) {
  const prompt = `Website name: ${name}\nDescription: ${description}\nReturn 4 short follow-up
questions (websiteType, theme, colorPreference, style) each with 3-5 selectable option
strings, as JSON: { "questions": [{ "key": "websiteType", "label": "...", "options": ["..."] }] }`;
  const { text, cacheHit } = await generateWithCache("follow_up_questions", prompt, { jsonOutput: true });
  return { questions: JSON.parse(text).questions as Array<{ key: string; label: string; options: string[] }>, cacheHit };
}

/** Incremental regeneration: only the touched section is re-sent to the model, per the spec's
 * "regenerate only modified content" cost-safeguard — the rest of the file map is reused as-is. */
export async function editSection(
  existingFiles: Record<string, string>,
  targetFile: string,
  instruction: string
) {
  const prompt = `Existing file (${targetFile}):\n${existingFiles[targetFile]}\n\nInstruction: ${instruction}\n
Return ONLY the full replacement source for this one file, no markdown fences, no explanation.`;
  const { text, cacheHit } = await generateWithCache("ai_edit", prompt);
  return { updatedFile: text, cacheHit };
}

const NEW_PAGE_SYSTEM_PROMPT = `You are adding ONE new page to an already-generated website. You'll be given
the site's existing shared components (Navbar, Footer, etc. — these already exist, do NOT regenerate
them) and a description of the new page to create. Write only the NEW component file(s) this page's
unique content actually needs, matching the existing site's visual style (same Tailwind approach,
same overall look). Reuse Navbar and Footer by name in the page's section list — every page keeps
the same navigation and footer.

Respond ONLY with JSON in this exact shape, no prose, no markdown fences:
{
  "files": { "components/NewSectionName.tsx": "..." },
  "page": { "slug": "careers", "path": "/careers", "name": "Careers", "sections": ["Navbar", "NewSectionName", "Footer"] }
}
"slug" is a short lowercase-hyphenated identifier (becomes the URL folder name) that must not
collide with any existing page's slug. Every name in "sections" must either be one of the existing
shared component names given to you, or a key in your own "files" (minus the "components/" prefix
and file extension).`;

/** Generates one new page for an existing project — new component(s) plus the page
 * entry — without touching anything else already on the site. This is a "lite"
 * task (free chain), not COMPLEX_TASKS: it's one page, not a whole new site. */
export async function generateNewPage(
  existingFiles: Record<string, string>,
  existingPages: Page[],
  pageName: string,
  pageDescription: string
) {
  const sharedComponentNames = Array.from(new Set(existingPages.flatMap((p) => p.sections)));
  const existingSlugs = existingPages.map((p) => p.slug);
  const prompt = `Existing shared components available to reuse: ${sharedComponentNames.join(", ")}
Existing page slugs already in use (the new page's slug must NOT match any of these): ${existingSlugs.join(", ")}
New page name: ${pageName}
New page description: ${pageDescription}`;

  const { text, cacheHit } = await generateWithCache("generate_new_page", prompt, {
    systemPrompt: NEW_PAGE_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  return { result: JSON.parse(text) as { files: Record<string, string>; page: Page }, cacheHit };
}

const THEME_CHANGE_SYSTEM_PROMPT = `You restyle an already-generated website's visual theme (colors, spacing, tone
of the Tailwind classes) based on an instruction, WITHOUT changing its content, copy, or structure.
You will be given a JSON map of existing files and an instruction. Return ONLY JSON in the exact
same shape as the input: { "files": { "<same file paths>": "<updated source>" } }. Keep every
component, every string of copy, and the overall layout identical — only touch className strings
and any inline color/style values.`;

/** Restyles the whole site's visual theme in one pass — distinct from editSection,
 * which only ever touches a single file. Content/structure stay untouched by design. */
export async function changeTheme(existingFiles: Record<string, string>, instruction: string) {
  const prompt = `Existing files: ${JSON.stringify(existingFiles)}\n\nRestyle instruction: ${instruction}`;
  const { text, cacheHit } = await generateWithCache("change_theme", prompt, {
    systemPrompt: THEME_CHANGE_SYSTEM_PROMPT,
    jsonOutput: true,
  });
  const parsed = JSON.parse(text) as { files: Record<string, string> };
  return { files: parsed.files, cacheHit };
}

/** Transcription is a "lite" task too, but it's a different API shape (audio in,
 * text out) — Groq hosts a Whisper-compatible endpoint, so this reuses the same
 * client rather than needing a whole separate provider chain. */
export async function transcribeVoicePrompt(audioBase64: string, mimeType: string) {
  if (!groq) {
    throw new Error("Voice transcription needs GROQ_API_KEY configured.");
  }
  const extension = mimeType.split("/")[1] ?? "webm";
  const buffer = Uint8Array.from(Buffer.from(audioBase64, "base64"));
  const file = new File([buffer], `audio.${extension}`, { type: mimeType });
  const transcription = await groq.audio.transcriptions.create({
    file,
    model: process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3",
  });
  return transcription.text;
                                                                                             }
