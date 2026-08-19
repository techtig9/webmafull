import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { generateImage } from "@/lib/image-gen";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";
import { validate } from "@/lib/validation";
import { nanoid } from "nanoid";

const requestSchema = z.object({
  prompt: z.string().min(3).max(500),
  projectId: z.string().uuid().optional(),
});

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:generate-image`, 10, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(requestSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }
  const { prompt, projectId } = parsed.data;

  const gate = await canUseFeature(user!.id, "generate_image");
  if (!gate.allowed) {
    const status = gate.reason === "insufficient_credits" ? 402 : 403;
    return NextResponse.json({ message: gate.message }, { status });
  }

  const supabase = createServiceRoleClient();

  let imageBuffer: Buffer;
  let mimeType: string;
  try {
    const generated = await generateImage(prompt);
    imageBuffer = Buffer.from(generated.base64, "base64");
    mimeType = generated.mimeType;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Image generation failed. No credits were charged.";
    return NextResponse.json({ message }, { status: 502 });
  }

  const storagePath = `${user!.id}/ai-${nanoid()}.png`;
  const { error: uploadError } = await supabase.storage.from("assets").upload(storagePath, imageBuffer, {
    contentType: mimeType,
    upsert: false,
  });
  if (uploadError) {
    return NextResponse.json({ message: "Generated the image, but couldn't save it. No credits were charged." }, { status: 500 });
  }

  const { data: inserted, error: dbError } = await supabase
    .from("assets")
    .insert({
      user_id: user!.id,
      storage_path: storagePath,
      file_name: `ai-generated-${Date.now()}.png`,
      mime_type: mimeType,
      size_bytes: imageBuffer.byteLength,
    })
    .select("id, storage_path")
    .single();

  if (dbError || !inserted) {
    await supabase.storage.from("assets").remove([storagePath]);
    return NextResponse.json({ message: "Generated the image, but couldn't save it. No credits were charged." }, { status: 500 });
  }

  await spendCredits(user!.id, "generate_image", { isAdmin: gate.isAdmin, cacheHit: false, projectId });

  const { data: publicUrl } = supabase.storage.from("assets").getPublicUrl(storagePath);
  return NextResponse.json({ assetId: inserted.id, url: publicUrl.publicUrl });
}
