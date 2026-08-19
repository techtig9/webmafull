import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { canUseFeature, spendCredits } from "@/lib/credits";
import { transcribeVoicePrompt } from "@/lib/gemini";
import { transcribeSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:transcribe`, 30, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(transcribeSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  const gate = await canUseFeature(user!.id, "voice_prompt");
  if (!gate.allowed) {
    const status = gate.reason === "insufficient_credits" ? 402 : 403;
    return NextResponse.json({ message: gate.message }, { status });
  }

  try {
    const text = await transcribeVoicePrompt(parsed.data.audio, parsed.data.mimeType);
    await spendCredits(user!.id, "voice_prompt", { isAdmin: gate.isAdmin });
    return NextResponse.json({ text });
  } catch (err) {
    console.error("transcribe error", err, "user:", user!.id);
    return NextResponse.json({ message: "Couldn't transcribe that — try typing instead." }, { status: 500 });
  }
}
