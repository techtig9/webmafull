import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { chatWithAssistant, type ChatMessage } from "@/lib/gemini";
import { checkRateLimit } from "@/lib/rate-limit";
import { validate } from "@/lib/validation";
import { z } from "zod";

const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(1000),
      })
    )
    .min(1)
    .max(20), // caps how much conversation history gets sent per request
});

export async function POST(request: Request) {
  // Auth required — the assistant is a real feature, not a marketing gimmick, and
  // every feature in webma requires an account first, no exceptions for this one.
  const { user, response } = await requireUser();
  if (response) return response;

  const limit = await checkRateLimit(`${user!.id}:assistant`, 20, 60_000);
  if (!limit.allowed) {
    return NextResponse.json(
      { message: `Too many messages — try again in ${limit.retryAfterSeconds}s.` },
      { status: 429 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = validate(chatSchema, body);
  if (!parsed.success) {
    return NextResponse.json({ message: parsed.error }, { status: 400 });
  }

  try {
    const reply = await chatWithAssistant(parsed.data.messages as ChatMessage[]);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("assistant chat error", err, "user:", user!.id);
    return NextResponse.json(
      { message: "Couldn't reach the assistant right now — try again in a moment." },
      { status: 500 }
    );
  }
}
