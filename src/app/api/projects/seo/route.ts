import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validate } from "@/lib/validation";
import { z } from "zod";

const seoSchema = z.object({
  projectId: z.string().uuid(),
  seoTitle: z.string().trim().max(60, "Titles over 60 characters get truncated in search results.").optional(),
  seoDescription: z
    .string()
    .trim()
    .max(160, "Descriptions over 160 characters get truncated in search results.")
    .optional(),
  seoOgImageUrl: z.string().trim().url().optional().or(z.literal("")),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const parsed = validate(seoSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { projectId, seoTitle, seoDescription, seoOgImageUrl } = parsed.data;

  const supabase = createServiceRoleClient();
  const { data: project } = await supabase.from("projects").select("user_id").eq("id", projectId).single();
  if (!project || project.user_id !== user!.id) {
    return NextResponse.json({ message: "Project not found." }, { status: 404 });
  }

  const { error } = await supabase
    .from("projects")
    .update({
      seo_title: seoTitle ?? null,
      seo_description: seoDescription ?? null,
      seo_og_image_url: seoOgImageUrl || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", projectId);

  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
