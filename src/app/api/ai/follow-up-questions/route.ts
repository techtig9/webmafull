import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { generateFollowUpQuestions } from "@/lib/gemini";
import { followUpQuestionsSchema, validate } from "@/lib/validation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const { user, response } = await requireUser();
  if (response) return response;
  const limit = await checkRateLimit(`${user!.id}:follow-up-questions`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many requests — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(followUpQuestionsSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  try {
    const { questions } = await generateFollowUpQuestions(parsed.data.name, parsed.data.description);
    return NextResponse.json({ questions });
  } catch (err) {
    console.error("follow-up-questions error", err, "user:", user!.id);
    return NextResponse.json(
      { message: "Couldn't generate follow-up questions right now. Try again in a moment." },
      { status: 500 }
    );
  }
}
