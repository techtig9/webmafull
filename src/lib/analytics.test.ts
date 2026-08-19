import { describe, it, expect } from "vitest";
import { summarizeAnalytics, computeConversionRate, type PageViewRow } from "@/lib/analytics";

function row(overrides: Partial<PageViewRow>): PageViewRow {
  return { path: "/", referrer: null, visitor_hash: null, created_at: new Date().toISOString(), ...overrides };
}

describe("summarizeAnalytics", () => {
  it("counts total views as the row count", () => {
    const rows = [row({}), row({}), row({})];
    expect(summarizeAnalytics(rows, 7).totalViews).toBe(3);
  });

  it("counts unique visitors as distinct non-null visitor hashes", () => {
    const rows = [row({ visitor_hash: "a" }), row({ visitor_hash: "a" }), row({ visitor_hash: "b" }), row({ visitor_hash: null })];
    expect(summarizeAnalytics(rows, 7).uniqueVisitors).toBe(2);
  });

  it("ranks top pages by view count, descending", () => {
    const rows = [row({ path: "/about" }), row({ path: "/" }), row({ path: "/" }), row({ path: "/" })];
    const top = summarizeAnalytics(rows, 7).topPages;
    expect(top[0]).toEqual({ path: "/", views: 3 });
    expect(top[1]).toEqual({ path: "/about", views: 1 });
  });

  it("caps top pages at 10 entries", () => {
    const rows = Array.from({ length: 15 }, (_, i) => row({ path: `/page-${i}` }));
    expect(summarizeAnalytics(rows, 7).topPages).toHaveLength(10);
  });

  it("groups referrers by hostname, not full URL", () => {
    const rows = [
      row({ referrer: "https://www.google.com/search?q=webma" }),
      row({ referrer: "https://www.google.com/search?q=other" }),
      row({ referrer: "https://twitter.com/foo" }),
    ];
    const top = summarizeAnalytics(rows, 7).topReferrers;
    expect(top[0]).toEqual({ referrer: "www.google.com", views: 2 });
    expect(top.find((r) => r.referrer === "twitter.com")?.views).toBe(1);
  });

  it("buckets missing referrers as Direct", () => {
    const rows = [row({ referrer: null }), row({ referrer: "" })];
    const top = summarizeAnalytics(rows, 7).topReferrers;
    expect(top).toEqual([{ referrer: "Direct", views: 2 }]);
  });

  it("buckets a malformed referrer as Direct instead of throwing", () => {
    // This endpoint is public and unauthenticated — `referrer` is whatever a
    // caller's browser sent, never guaranteed to be a valid URL.
    const rows = [row({ referrer: "not a url at all!!" })];
    expect(() => summarizeAnalytics(rows, 7)).not.toThrow();
    expect(summarizeAnalytics(rows, 7).topReferrers).toEqual([{ referrer: "Direct", views: 1 }]);
  });

  it("returns exactly `days` daily buckets, oldest first, even with no data", () => {
    const result = summarizeAnalytics([], 7);
    expect(result.dailyViews).toHaveLength(7);
    expect(result.dailyViews.every((d) => d.views === 0)).toBe(true);
    const dates = result.dailyViews.map((d) => d.date);
    expect(dates).toEqual([...dates].sort()); // ascending / oldest-first
  });

  it("places a view in the correct daily bucket by UTC calendar date", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");
    const rows = [row({ created_at: "2026-08-14T23:59:00.000Z" }), row({ created_at: "2026-08-15T00:01:00.000Z" })];
    const result = summarizeAnalytics(rows, 3, now);
    const aug14 = result.dailyViews.find((d) => d.date === "2026-08-14");
    const aug15 = result.dailyViews.find((d) => d.date === "2026-08-15");
    expect(aug14?.views).toBe(1);
    expect(aug15?.views).toBe(1);
  });

  it("ignores a view that falls outside the requested day range", () => {
    const now = new Date("2026-08-15T12:00:00.000Z");
    const rows = [row({ created_at: "2026-01-01T00:00:00.000Z" })];
    const result = summarizeAnalytics(rows, 7, now);
    expect(result.totalViews).toBe(1); // still counted in the raw total...
    expect(result.dailyViews.every((d) => d.views === 0)).toBe(true); // ...but not attributed to any bucket in range
  });

  it("handles an empty row set without error", () => {
    const result = summarizeAnalytics([], 30);
    expect(result.totalViews).toBe(0);
    expect(result.uniqueVisitors).toBe(0);
    expect(result.topPages).toEqual([]);
    expect(result.topReferrers).toEqual([]);
  });
});

describe("computeConversionRate", () => {
  it("computes a simple percentage to one decimal place", () => {
    expect(computeConversionRate(100, 25)).toBe(25);
    expect(computeConversionRate(3, 1)).toBe(33.3);
  });

  it("returns 0 rather than NaN or Infinity when there are no visitors", () => {
    expect(computeConversionRate(0, 0)).toBe(0);
  });

  it("returns 100 when every visitor converted", () => {
    expect(computeConversionRate(10, 10)).toBe(100);
  });
});

describe("summarizeAnalytics — conversion attribution via hash intersection", () => {
  it("counts a visitor as converted only when their hash appears in both page views and the converting-hash list", () => {
    const rows = [row({ visitor_hash: "a" }), row({ visitor_hash: "b" }), row({ visitor_hash: "c" })];
    const result = summarizeAnalytics(rows, 7, new Date(), ["a", "b"]);
    expect(result.uniqueVisitors).toBe(3);
    expect(result.conversions).toBe(2);
    expect(result.conversionRate).toBeCloseTo(66.7, 1);
  });

  it("does not count a converting hash that never appears in this period's page views", () => {
    // A visitor whose form_submissions hash is from a different day (the
    // hash rotates daily) or a different project shouldn't inflate this
    // period's conversion count just because it's in the input list.
    const rows = [row({ visitor_hash: "a" })];
    const result = summarizeAnalytics(rows, 7, new Date(), ["z", "y"]);
    expect(result.conversions).toBe(0);
    expect(result.conversionRate).toBe(0);
  });

  it("does not double-count a visitor who converted more than once (multiple form submissions, same hash)", () => {
    const rows = [row({ visitor_hash: "a" })];
    const result = summarizeAnalytics(rows, 7, new Date(), ["a", "a", "a"]);
    expect(result.conversions).toBe(1);
  });

  it("defaults to zero conversions when no converting hashes are provided at all", () => {
    const rows = [row({ visitor_hash: "a" }), row({ visitor_hash: "b" })];
    const result = summarizeAnalytics(rows, 7);
    expect(result.conversions).toBe(0);
    expect(result.conversionRate).toBe(0);
  });

  it("ignores null visitor hashes on both sides rather than treating them as a matching pair", () => {
    const rows = [row({ visitor_hash: null }), row({ visitor_hash: "a" })];
    const result = summarizeAnalytics(rows, 7, new Date(), ["a"]);
    expect(result.uniqueVisitors).toBe(1); // null is excluded from the unique-visitor set
    expect(result.conversions).toBe(1);
  });
});
