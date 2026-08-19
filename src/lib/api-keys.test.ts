import { describe, it, expect } from "vitest";
import { generateApiKey, hashApiKey, looksLikeApiKey } from "@/lib/api-keys";

describe("generateApiKey", () => {
  it("produces a key with the expected prefix", () => {
    const { rawKey } = generateApiKey();
    expect(rawKey.startsWith("wm_live_")).toBe(true);
  });

  it("produces a different key on every call", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.rawKey).not.toBe(b.rawKey);
  });

  it("returns a hash that matches hashApiKey applied to the raw key", () => {
    const { rawKey, keyHash } = generateApiKey();
    expect(keyHash).toBe(hashApiKey(rawKey));
  });

  it("returns a prefix that is a real prefix of the raw key, not a separate random value", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(rawKey.startsWith(keyPrefix)).toBe(true);
  });

  it("the prefix alone is not enough to reconstruct the full key", () => {
    const { rawKey, keyPrefix } = generateApiKey();
    expect(keyPrefix.length).toBeLessThan(rawKey.length);
  });

  it("generates keys that pass looksLikeApiKey's own format check", () => {
    const { rawKey } = generateApiKey();
    expect(looksLikeApiKey(rawKey)).toBe(true);
  });
});

describe("hashApiKey", () => {
  it("is deterministic — the same input always hashes the same way", () => {
    expect(hashApiKey("wm_live_abc123")).toBe(hashApiKey("wm_live_abc123"));
  });

  it("produces different hashes for different keys", () => {
    expect(hashApiKey("wm_live_abc123")).not.toBe(hashApiKey("wm_live_xyz789"));
  });

  it("never contains the raw key as a substring of its own output", () => {
    const raw = "wm_live_supersecretvalue";
    expect(hashApiKey(raw)).not.toContain(raw);
  });

  it("is a fixed-length hex string", () => {
    expect(hashApiKey("short")).toMatch(/^[0-9a-f]{64}$/);
    expect(hashApiKey("a".repeat(100))).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("looksLikeApiKey", () => {
  it("accepts a real generated key", () => {
    expect(looksLikeApiKey(generateApiKey().rawKey)).toBe(true);
  });

  it("rejects a string with no wm_live_ prefix", () => {
    expect(looksLikeApiKey("sk_live_1234567890123456789012")).toBe(false);
  });

  it("rejects a string with the right prefix but too little entropy after it", () => {
    expect(looksLikeApiKey("wm_live_abc")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(looksLikeApiKey("")).toBe(false);
  });

  it("rejects a session-token-shaped string (guards against sending the wrong credential type)", () => {
    expect(looksLikeApiKey("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0")).toBe(false);
  });
});
