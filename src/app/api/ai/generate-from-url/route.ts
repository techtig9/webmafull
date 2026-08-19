import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { generateFromUrl } from "@/lib/gemini";
import { deriveSections, resolvePages } from "@/lib/preview";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const generateFromUrlSchema = z.object({
  name: z.string().trim().min(1, "Website name is required.").max(120),
  url: z.string().trim().url("Enter a valid URL, including https://."),
  answers: z.record(z.string()).optional().default({}),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:generate-from-url`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(generateFromUrlSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { name, url, answers } = parsed.data;

  const gate = await canUseFeature(user!.id, "generate_from_url");
  if (!gate.allowed) {
    const status = gate.reason === "insufficient_credits" ? 402 : 403;
    return NextResponse.json({ message: gate.message }, { status });
  }

  const supabase = createServiceRoleClient();

  try {
    const { site, cacheHit } = await generateFromUrl(url, answers);
    const sections = deriveSections(site.files);
    const pages = resolvePages(site.files, site.pages ?? null);

    const { data: project, error } = await supabase
      .from("projects")
      .insert({ user_id: user!.id, name, description: `Generated from ${url}`, status: "ready", current_version: 1 })
      .select("id")
      .single();
    if (error) throw error;

    await supabase.from("project_versions").insert({
      project_id: project.id,
      version: 1,
      files: site.files,
      pages: pages as unknown as Json,
      prompt_answers: { ...answers, sourceUrl: url },
    });

    await spendCredits(user!.id, "generate_from_url", { isAdmin: gate.isAdmin, cacheHit, projectId: project.id });

    return NextResponse.json({ projectId: project.id, files: site.files, sections, pages, cacheHit });
  } catch (err) {
    console.error("generate-from-url error", err, "user:", user!.id);
    const message = err instanceof Error && err.message.startsWith("Couldn't fetch")
      ? err.message
      : "Generation failed. No credits were charged — try again.";
    return NextResponse.json({ message }, { status: 500 });
  }
      }
