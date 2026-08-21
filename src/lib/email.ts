import { Resend } from "resend";

// Lazily constructed so a missing RESEND_API_KEY doesn't crash builds or cold
// starts — matches the same defensive pattern as the optional OpenAI client in
// src/lib/gemini.ts. Callers just get a clear runtime error if it's actually used
// without a key configured, instead of the whole app failing to build.
let resend: Resend | null = null;
function getResendClient(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not set — emails can't be sent yet.");
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

export async function sendWelcomeEmail(to: string, name: string) {
  await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Welcome to webma",
    html: `<p>Hi ${name || "there"},</p>
           <p>Your webma account is ready — no extra steps needed. Log in and start generating your first site.</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/login">Log in</a></p>`,
  });
}

export async function sendPaymentFailedEmail(to: string, name: string) {
  await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "Your webma payment didn't go through",
    html: `<p>Hi ${name || "there"},</p>
           <p>We couldn't process your last payment. Please update your billing details to avoid losing access to your plan.</p>
           <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing">Update billing</a></p>`,
  });
}
/** A security-notification-style email sent on every real sign-in — both
 * the email/password path (login/page.tsx) and the Google OAuth path
 * (auth/callback/route.ts). Deliberately not wired into every code exchange
 * that route handles (it also completes email verification and password
 * reset links, not just logins) — sending "you just logged in" after
 * someone verifies their email would be misleading. Callers decide when a
 * genuine login actually happened; this function only sends. */
export async function sendLoginNotificationEmail(to: string, name: string) {
  await getResendClient().emails.send({
    from: process.env.EMAIL_FROM!,
    to,
    subject: "New sign-in to your webma account",
    html: `<p>Hi ${name || "there"},</p>
           <p>Your webma account was just signed into. If this was you, no action is needed.</p>
           <p>If you don't recognize this, secure your account by resetting your password.</p>`,
  });
}
