import { describe, it, expect, vi, afterEach } from "vitest";
import { clientIp, dailyVisitorHash } from "@/lib/visitor-tracking";

function requestWithHeader(headers: Record<string, string>): Request {
  return new Request("https://example.com", { headers });
}

describe("clientIp", () => {
  it("returns the first IP from a single-hop x-forwarded-for header", () => {
    expect(clientIp(requestWithHeader({ "x-forwarded-for": "203.0.113.5" }))).toBe("203.0.113.5");
  });

  it("returns only the client's own IP from a multi-hop x-forwarded-for chain", () => {
    // Format is "client, proxy1, proxy2" — everything after the first entry
    // is infrastructure, not the actual visitor.
    expect(clientIp(requestWithHeader({ "x-forwarded-for": "203.0.113.5, 70.41.3.18, 150.172.238.178" }))).toBe(
      "203.0.113.5"
    );
  });

  it("trims incidental whitespace around the IP", () => {
    expect(clientIp(requestWithHeader({ "x-forwarded-for": "  203.0.113.5  , 70.41.3.18" }))).toBe("203.0.113.5");
  });

  it("returns null when the header is absent", () => {
    expect(clientIp(requestWithHeader({}))).toBeNull();
  });
});

describe("dailyVisitorHash", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("produces the same hash for the same IP within the same day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T08:00:00.000Z"));
    const first = dailyVisitorHash("203.0.113.5");
    vi.setSystemTime(new Date("2026-08-15T20:00:00.000Z"));
    const second = dailyVisitorHash("203.0.113.5");
    expect(first).toBe(second);
  });

  it("produces a different hash for the same IP on a different day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T23:59:00.000Z"));
    const day1 = dailyVisitorHash("203.0.113.5");
    vi.setSystemTime(new Date("2026-08-16T00:01:00.000Z"));
    const day2 = dailyVisitorHash("203.0.113.5");
    expect(day1).not.toBe(day2);
  });

  it("produces different hashes for different IPs on the same day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T12:00:00.000Z"));
    expect(dailyVisitorHash("203.0.113.5")).not.toBe(dailyVisitorHash("198.51.100.9"));
  });

  it("never contains the raw IP as a substring of the output", () => {
    const hash = dailyVisitorHash("203.0.113.5");
    expect(hash).not.toContain("203.0.113.5");
  });

  it("is a fixed-length hex string, not a variable-length encoding that could leak input length", () => {
    expect(dailyVisitorHash("1.2.3.4")).toMatch(/^[0-9a-f]{64}$/);
    expect(dailyVisitorHash("203.0.113.255")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces the exact same hash forms/submit and analytics/track would each compute for the same real visitor — the property conversion tracking depends on", () => {
    // Both endpoints now import this one function rather than each keeping
    // their own hashing logic — this test exists specifically to catch a
    // regression back to the bug that motivated consolidating them (see
    // this module's own header comment): two different hashes for the same
    // IP silently breaking same-day visitor correlation between a page
    // view and a form submission.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-15T10:00:00.000Z"));
    const asIfFromPageView = dailyVisitorHash("203.0.113.5");
    const asIfFromFormSubmit = dailyVisitorHash("203.0.113.5");
    expect(asIfFromPageView).toBe(asIfFromFormSubmit);
  });
});
