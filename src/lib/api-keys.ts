import crypto from "crypto";

const KEY_PREFIX_LENGTH = 12; // "wm_live_" (8) + 4 more visible chars

/** Generates a new raw API key and its stored representation. The raw key
 * is what gets shown to the user once and embedded in their own client
 * code; only the hash and prefix are ever persisted. Uses crypto.randomBytes
 * (CSPRNG), not Math.random — an API key is a bearer credential with the
 * same security weight as a password, and needs the same unpredictability
 * guarantee. */
export function generateApiKey(): { rawKey: string; keyHash: string; keyPrefix: string } {
  const secret = crypto.randomBytes(24).toString("base64url"); // 32 chars, URL-safe
  const rawKey = `wm_live_${secret}`;
  const keyHash = hashApiKey(rawKey);
  const keyPrefix = rawKey.slice(0, KEY_PREFIX_LENGTH);
  return { rawKey, keyHash, keyPrefix };
}

/** SHA-256 of the raw key — deterministic (so a lookup can hash an incoming
 * key and compare against the stored hash directly) but one-way (so the
 * stored value alone can never be turned back into a usable key, the same
 * property a password hash needs). Not bcrypt/argon2: those add
 * intentional slowness to resist offline brute-forcing of a *low-entropy*
 * secret like a human password. This key already has 32 random,
 * high-entropy base64url characters (a keyspace no realistic brute force
 * approaches), so a fast, deterministic hash is the right tool, not the
 * wrong one — bcrypt would only add latency to every single API request
 * for a security property this key's own entropy already provides. */
export function hashApiKey(rawKey: string): string {
  return crypto.createHash("sha256").update(rawKey).digest("hex");
}

/** True only for a string that's actually shaped like one of this app's own
 * API keys — checked before ever touching the database on an incoming
 * request, so a request with an obviously-wrong Authorization header (a
 * session JWT accidentally sent as a Bearer token, a random string) fails
 * fast without spending a database round trip on something that could
 * never have matched anyway. */
export function looksLikeApiKey(value: string): boolean {
  return /^wm_live_[A-Za-z0-9_-]{20,}$/.test(value);
}
