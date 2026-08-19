// Fair-use rate limiting for the AI routes, per the Security standard's explicit
// "API rate limiting" requirement.
//
// Backed by Upstash Redis so the limit is enforced across your WHOLE app, not just
// one warm serverless instance — this replaces the old in-memory Map, which only
// caught the trivial "spam the same warm instance" case on Vercel's serverless
// platform. Falls back to the old in-memory behavior automatically when
// UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN aren't set (local dev without
// Upstash configured, or the test suite) — see .env.example for setup.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds?: number;
}

const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

// One Ratelimit instance per distinct (limit, windowMs) pair, cached so repeated
// calls with the same numbers reuse it instead of constructing a new one per request.
const limiters = new Map<string, Ratelimit>();

function upstashLimiterFor(limit: number, windowMs: number): Ratelimit {
  const cacheKey = `${limit}:${windowMs}`;
  let limiter = limiters.get(cacheKey);
  if (!limiter) {
    limiter = new Ratelimit({
      redis: redis!,
      limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
      analytics: false,
    });
    limiters.set(cacheKey, limiter);
  }
  return limiter;
}

// --- In-memory fallback (used only when Upstash isn't configured) -----------------
// Identical logic to the original implementation. Single-instance only — this is
// the exact limitation this fix closes for production, kept here purely so local
// dev and the test suite work without needing a real Redis database.
interface Bucket {
  count: number;
  windowStart: number;
}
const memoryBuckets = new Map<string, Bucket>();

function checkMemory(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const existing = memoryBuckets.get(key);

  if (!existing || now - existing.windowStart > windowMs) {
    memoryBuckets.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (existing.count >= limit) {
    const retryAfterSeconds = Math.ceil((existing.windowStart + windowMs - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  existing.count += 1;
  return { allowed: true };
}

setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of memoryBuckets) {
    if (now - bucket.windowStart > 10 * 60 * 1000) memoryBuckets.delete(key);
  }
}, 5 * 60 * 1000);

/**
 * @param key Unique identifier for the thing being limited — typically `${userId}:${action}`.
 * @param limit Max requests allowed within the window.
 * @param windowMs Window length in milliseconds.
 */
export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (!redis) return checkMemory(key, limit, windowMs);

  const result = await upstashLimiterFor(limit, windowMs).limit(key);
  if (result.success) return { allowed: true };

  const retryAfterSeconds = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return { allowed: false, retryAfterSeconds };
}
