import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { sendLoginNotificationEmail } from "@/lib/email";
import { createServiceRoleClient } from "@/lib/supabase/server";

/** Called client-side right after a successful email/password sign-in
 * (login/page.tsx). The Google OAuth path sends this same email directly
 * from auth/callback/route.ts instead, since that flow is already
 * server-side and has no client round trip to make.
 *
 * A failed email send here never blocks or fails the login itself — the
 * person is already authenticated by the time this fires; a transient
 * Resend outage or a missing RESEND_API_KEY shouldn't turn into a broken
 * sign-in experience for something this secondary. */
export async function POST() {
  const { user, response } = await requireUser();
  if (response) return response;

  const supabase = createServiceRoleClient();
  const { data: profile } = await supabase.from("users").select("name").eq("id", user!.id).maybeSingle();

  try {
    await sendLoginNotificationEmail(user!.email ?? "", profile?.name ?? "");
  } catch (err) {
    console.error("login notification email failed", err);
  }

  return NextResponse.json({ ok: true });
}
