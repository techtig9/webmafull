import { describe, it, expect } from "vitest";
import { checkRateLimit } from "@/lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests within the limit", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect((await checkRateLimit(key, 5, 60_000)).allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", async () => {
    const key = `test-${Math.random()}`;
    for (let i = 0; i < 3; i++) await checkRateLimit(key, 3, 60_000);
    const result = await checkRateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  it("tracks separate keys independently", async () => {
    const keyA = `test-a-${Math.random()}`;
    const keyB = `test-b-${Math.random()}`;
    await checkRateLimit(keyA, 1, 60_000);
    expect((await checkRateLimit(keyA, 1, 60_000)).allowed).toBe(false);
    expect((await checkRateLimit(keyB, 1, 60_000)).allowed).toBe(true);
  });

  it("resets after the window elapses", async () => {
    const key = `test-${Math.random()}`;
    expect((await checkRateLimit(key, 1, 50)).allowed).toBe(true);
    expect((await checkRateLimit(key, 1, 50)).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 60));
    expect((await checkRateLimit(key, 1, 50)).allowed).toBe(true);
  });
});
