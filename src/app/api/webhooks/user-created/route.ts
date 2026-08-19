import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: Request) {
  const secret = request.headers.get("x-webhook-secret");
  if (secret !== process.env.USER_EVENTS_WEBHOOK_SECRET) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const record = payload.record; // Supabase sends { type, table, record, ... }
  if (!record?.email) {
    return NextResponse.json({ message: "No email on record" }, { status: 400 });
  }

  try {
    await sendWelcomeEmail(record.email, record.name);
  } catch (err) {
    console.error("welcome email failed", err);
    // Don't fail the webhook response over an email hiccup — Supabase will retry otherwise.
  }

  return NextResponse.json({ received: true });
}
