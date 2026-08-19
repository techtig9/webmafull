export interface GeneratedImage {
  base64: string;
  mimeType: string;
}

/** Calls OpenAI's image generation API. This is a new, distinct provider —
 * none of the text-generation providers in gemini.ts (Anthropic, Groq,
 * Cerebras, OpenRouter) do image generation, so this needed its own
 * integration rather than extending an existing one, exactly as
 * docs/GAP_ANALYSIS.md predicted when it sized this item.
 *
 * Requests b64_json rather than a temporary hosted URL specifically so the
 * caller can upload the bytes straight to Supabase Storage without a second
 * network hop to fetch from a URL that expires — one fewer thing that can
 * fail partway through, and one fewer place a race between "download" and
 * "URL expires" could bite under load.
 *
 * HONEST CAVEAT: written correctly against OpenAI's documented API shape,
 * but never exercised against a live API key in this environment — no
 * OPENAI_API_KEY is configured here, and this sandbox's network egress
 * doesn't allowlist api.openai.com regardless. Same category of limitation
 * as github.ts's API client and the Playwright E2E suite: right pattern,
 * unverified against the real endpoint. */
export async function generateImage(prompt: string): Promise<GeneratedImage> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Image generation isn't configured yet.");
  }

  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-1",
      prompt,
      size: "1024x1024",
      n: 1,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.error?.message ?? "Image generation failed.");
  }

  const data = await res.json();
  const base64 = data?.data?.[0]?.b64_json;
  if (typeof base64 !== "string" || base64.length === 0) {
    throw new Error("Image provider returned no image data.");
  }

  return { base64, mimeType: "image/png" };
}
