/** Reads the Server-Sent Events stream from POST /api/ai/generate-website,
 * calling onPhase for each progress event and resolving with the final
 * payload once a "done" event arrives (or rejecting on an "error" event, or
 * if the stream ends without either). Pulled out of GeneratorFlow.tsx as a
 * standalone function so the parsing logic — buffering partial chunks,
 * splitting on blank-line-delimited SSE frames — can be unit tested against
 * a hand-built ReadableStream instead of a real fetch response. */

/** Lives here rather than in the route.ts that emits them, since this file is
 * client-safe (no Supabase/auth imports) and needs to be importable from the
 * GenerationProgress client component. A client component importing directly
 * from an API route module would risk pulling server-only code (service-role
 * Supabase client, auth helpers) into the client bundle — the route imports
 * this constant instead, not the other way around. */
export const GENERATION_PHASES = ["understanding", "planning", "content", "code", "finalizing"] as const;
export type GenerationPhase = (typeof GENERATION_PHASES)[number];

export interface GenerationDonePayload {
  projectId: string;
  files: Record<string, string>;
  sections: string[];
  pages: unknown[];
  cacheHit: boolean;
}

export async function consumeGenerationStream(
  body: ReadableStream<Uint8Array> | null,
  onPhase: (phase: string) => void
): Promise<GenerationDonePayload> {
  if (!body) throw new Error("No response stream to read.");

  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let separatorIndex: number;
    while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
      const rawEvent = buffer.slice(0, separatorIndex);
      buffer = buffer.slice(separatorIndex + 2);

      const dataLine = rawEvent.split("\n").find((line) => line.startsWith("data: "));
      if (!dataLine) continue;

      let data: Record<string, unknown>;
      try {
        data = JSON.parse(dataLine.slice("data: ".length));
      } catch {
        continue; // a malformed frame shouldn't take down an otherwise-successful stream
      }

      if (data.type === "error") {
        throw new Error(typeof data.message === "string" ? data.message : "Generation failed.");
      }
      if (data.type === "done") {
        return data as unknown as GenerationDonePayload;
      }
      if (typeof data.phase === "string") {
        onPhase(data.phase);
      }
    }
  }

  throw new Error("Generation stream ended without a result — try again.");
}
