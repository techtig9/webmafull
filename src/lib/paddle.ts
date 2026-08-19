// Paddle Billing helpers: price-id lookups and webhook signature verification.
// Docs: https://developer.paddle.com/webhooks/signature-verification

import crypto from "crypto";
import type { PlanId } from "@/lib/credits";

export type BillingCycle = "month" | "year";

/** Paddle's REST API has two separate hosts — sandbox keys only work against the
 * sandbox host, and live keys only work against the production host. Every direct
 * fetch() call to Paddle's API must go through this instead of a hardcoded URL,
 * or sandbox testing will silently fail with an auth error against the live host. */
export function paddleApiBase(): string {
  return process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

/** Maps our (plan, cycle) pairs to the Paddle price IDs configured in the dashboard. */
export function priceIdFor(plan: Exclude<PlanId, "free">, cycle: BillingCycle): string {
  const key = `PADDLE_PRICE_${plan.toUpperCase()}_${cycle === "month" ? "MONTH" : "YEAR"}`;
  const id = process.env[key];
  if (!id) throw new Error(`Missing env var ${key} — set it to the matching Paddle price ID.`);
  return id;
}

/**
 * Verifies the `Paddle-Signature` header per Paddle's HMAC-SHA256 scheme:
 * header looks like "ts=<unix_ts>;h1=<hex_hmac>". Reject anything that doesn't match —
 * webhook handlers must never trust an unverified payload.
 */
export function verifyPaddleWebhook(rawBody: string, signatureHeader: string | null): boolean {
  if (!signatureHeader) return false;
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) throw new Error("PADDLE_WEBHOOK_SECRET is not set.");

  const parts = Object.fromEntries(
    signatureHeader.split(";").map((p) => p.split("=") as [string, string])
  );
  const { ts, h1 } = parts;
  if (!ts || !h1) return false;

  const signedPayload = `${ts}:${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  // Constant-time comparison to avoid timing attacks. Copied through
  // Uint8Array.from() so the strict ArrayBuffer-backed type crypto expects
  // is satisfied regardless of the installed @types/node's Buffer typing.
  const a = Uint8Array.from(Buffer.from(expected, "hex"));
  const b = Uint8Array.from(Buffer.from(h1, "hex"));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Maps a Paddle price ID back to our internal plan, for webhook processing. */
export function planForPriceId(priceId: string): PlanId | null {
  const table: Record<string, PlanId> = {
    [process.env.PADDLE_PRICE_STARTER_MONTH ?? ""]: "starter",
    [process.env.PADDLE_PRICE_STARTER_YEAR ?? ""]: "starter",
    [process.env.PADDLE_PRICE_PRO_MONTH ?? ""]: "pro",
    [process.env.PADDLE_PRICE_PRO_YEAR ?? ""]: "pro",
    [process.env.PADDLE_PRICE_BUSINESS_MONTH ?? ""]: "business",
    [process.env.PADDLE_PRICE_BUSINESS_YEAR ?? ""]: "business",
  };
  return table[priceId] ?? null;
}
