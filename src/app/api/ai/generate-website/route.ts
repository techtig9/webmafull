import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits, type Action } from "@/lib/credits";
import { generateSiteFiles, generateSiteSpec } from "@/lib/gemini";
import { type GenerationPhase } from "@/lib/generation-stream";
import { substituteProjectId } from "@/lib/form-wiring";
import { deriveSections, resolvePages, type Page } from "@/lib/preview";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { generateWebsiteSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { NextResponse } from "next/server";

/** GENERATION_PHASES / GenerationPhase live in @/lib/generation-stream (a
 * client-safe module with no server-only imports) rather than here, so the
 * client's progress checklist can import the same list without pulling this
 * route's server-only dependencies (service-role Supabase client, auth
 * helpers) into the client bundle. */

function sseEncode(data: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`);
}

/** Streams generation progress as Server-Sent Events instead of one opaque
 * request/response. Every check that can fail fast (auth, rate limit, request
 * validation, credit gate) still runs BEFORE the stream opens and still
 * returns a plain JSON error response exactly as before — only the actual
 * generation work, which is genuinely two separate AI calls now (site plan,
 * then site code), streams progress between them. This is real progress, not
 * a fake timer: "planning" and "code" correspond to real, separately-billed,
 * separately-cacheable requests to the model (see generateSiteSpec /
 * generateSiteFiles in src/lib/gemini.ts). */
export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:generate-website`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(generateWebsiteSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { name, description, answers, projectId } = parsed.data;

  const action: Action = projectId ? "regenerate_complete" : "generate_full_website";

  const gate = await canUseFeature(user!.id, action);
  if (!gate.allowed) {
    const status = gate.reason === "insufficient_credits" ? 402 : 403;
    return NextResponse.json({ message: gate.message }, { status });
  }

  const supabase = createServiceRoleClient();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      function emit(data: Record<string, unknown>) {
        controller.enqueue(sseEncode(data));
      }

      try {
        emit({ phase: "understanding" satisfies GenerationPhase });

        emit({ phase: "planning" satisfies GenerationPhase });
        const { siteSpec, cacheHit: specCacheHit } = await generateSiteSpec(description, answers ?? {});

        emit({ phase: "content" satisfies GenerationPhase });
        emit({ phase: "code" satisfies GenerationPhase });
        const { files, cacheHit: filesCacheHit } = await generateSiteFiles(description, answers ?? {}, siteSpec);
        const cacheHit = specCacheHit && filesCacheHit;

        emit({ phase: "finalizing" satisfies GenerationPhase });
        const sections = deriveSections(files);
        const sitePages: Page[] = siteSpec.pages.map(({ purpose: _purpose, ...page }) => page);
        const pages = resolvePages(files, sitePages);

        let activeProjectId = projectId ?? null;
        let nextVersion = 1;

        if (!activeProjectId) {
          const { data: project, error } = await supabase
            .from("projects")
            .insert({ user_id: user!.id, name, description, status: "ready", current_version: 1 })
            .select("id")
            .single();
          if (error) throw error;
          activeProjectId = project.id;
        } else {
          const { data: existingProject } = await supabase
            .from("projects")
            .select("current_version")
            .eq("id", activeProjectId)
            .single();
          nextVersion = (existingProject?.current_version ?? 0) + 1;
          await supabase
            .from("projects")
            .update({ status: "ready", current_version: nextVersion, updated_at: new Date().toISOString() })
            .eq("id", activeProjectId);
        }

        if (!activeProjectId) {
          throw new Error("Project creation failed: no active project id was returned.");
        }

        // Forms in `files` reference WEBMA_PROJECT_ID_PLACEHOLDER instead of a
        // real ID, since the project didn't exist yet when generateSiteFiles
        // ran (see form-wiring.ts). Substitute now that it does, and use the
        // substituted version everywhere from here on — the DB write, the
        // emitted "done" payload, and therefore the editor's in-memory files —
        // so a form a visitor submits five minutes from now actually resolves
        // to this project, and the code shown in the editor doesn't display a
        // literal placeholder token in place of a real ID.
        const filesWithProjectId = substituteProjectId(files, activeProjectId);

        await supabase.from("project_versions").insert({
          project_id: activeProjectId,
          version: nextVersion,
          files: filesWithProjectId,
          pages: pages as unknown as Json,
          prompt_answers: JSON.parse(JSON.stringify({ ...(answers ?? {}), __site_spec: siteSpec })),
        });

        await spendCredits(user!.id, action, {
          isAdmin: gate.isAdmin,
          cacheHit,
          projectId: activeProjectId ?? undefined,
        });

        emit({
          type: "done",
          projectId: activeProjectId,
          files: filesWithProjectId,
          sections,
          pages,
          cacheHit,
        });
      } catch (err) {
        console.error("generate-website error", err, "user:", user!.id);
        emit({ type: "error", message: "Generation failed. No credits were charged — try again." });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
