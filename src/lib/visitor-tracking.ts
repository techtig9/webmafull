import crypto from "crypto";

/** Extracts the real client IP from the standard proxy header. Shared by
 * both public tracking endpoints (forms and analytics) — previously lived
 * only in the forms route with analytics importing it from there, an
 * awkward cross-route dependency direction fixed here by giving both a
 * proper shared home. */
export function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : null;
}

/** A hash of (IP + today's UTC date + a server-side salt) — never the raw
 * IP, never a value that stays stable across days. Deliberately not a
 * durable visitor identifier: it exists only to answer "how many distinct
 * visitors today" and "did the same visitor view and convert on the same
 * day," not to support any cross-session or cross-day tracking.
 *
 * MUST be the one and only place either public endpoint computes a visitor
 * hash. Before this consolidation, forms/submit computed its own
 * independent sha256(ip) — no day, no salt — while analytics/track used
 * this exact function. Two different hashes for the same real visitor's IP
 * meant a viewer and a converter could never be correlated even on the
 * same day, which is exactly what conversion tracking needs to work at
 * all. Found and fixed as a direct prerequisite for that feature, not a
 * cosmetic cleanup. */
export function dailyVisitorHash(ip: string): string {
  const salt = process.env.ANALYTICS_HASH_SALT ?? "webma-analytics";
  const dayKey = new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(`${ip}:${dayKey}:${salt}`).digest("hex");
}
