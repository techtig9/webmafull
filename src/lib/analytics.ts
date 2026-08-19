export interface PageViewRow {
  path: string;
  referrer: string | null;
  visitor_hash: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  totalViews: number;
  uniqueVisitors: number;
  /** Visitors whose hash appears in both page_views and form_submissions
   * for the period — real same-day attribution, not a raw ratio of two
   * independent totals. See summarizeAnalytics's own comment on why this
   * is necessarily same-day only. */
  conversions: number;
  /** Percentage, one decimal place, 0 when there are no visitors at all
   * (not NaN/Infinity from a division by zero). */
  conversionRate: number;
  topPages: { path: string; views: number }[];
  topReferrers: { referrer: string; views: number }[];
  dailyViews: { date: string; views: number }[];
}

/** conversions / uniqueVisitors as a percentage, one decimal place. Pulled
 * out as its own pure function — same reasoning as the SEO score's
 * deduction model — so the exact arithmetic behind the number shown on the
 * dashboard is independently testable and reconstructible, not buried
 * inline where a future edit to summarizeAnalytics could subtly change it
 * without a dedicated test to catch it. */
export function computeConversionRate(uniqueVisitors: number, conversions: number): number {
  if (uniqueVisitors === 0) return 0;
  return Math.round((conversions / uniqueVisitors) * 1000) / 10;
}

/** Turns raw page_views rows into the shapes the analytics dashboard actually
 * renders. Pure and synchronous on purpose — the route just fetches rows for
 * a project and a date range, then hands them here, so the grouping/sorting
 * logic (the part most likely to have an off-by-one or a sort-order bug) is
 * testable without a database.
 *
 * `convertingVisitorHashes` is every form_submissions.submitter_ip_hash for
 * the same project and date range — a conversion is counted only when that
 * exact hash also appears in this period's page view rows, i.e. real
 * attribution via hash intersection, not an independent count. This is only
 * possible because forms/submit and analytics/track now compute that hash
 * identically (see visitor-tracking.ts) — before that fix, the two hashes
 * for the same real visitor could never match, and this parameter would
 * have been meaningless. Necessarily same-day only: the hash rotates daily
 * by design (a deliberate privacy tradeoff, not an oversight), so a visitor
 * who views today and submits tomorrow won't be counted as a conversion —
 * undercounting true conversion rate somewhat rather than fabricating a
 * cross-day link the underlying data structurally doesn't support. */
export function summarizeAnalytics(
  rows: PageViewRow[],
  days: number,
  now: Date = new Date(),
  convertingVisitorHashes: string[] = []
): AnalyticsSummary {
  const totalViews = rows.length;

  const visitorHashes = new Set(rows.map((r) => r.visitor_hash).filter((h): h is string => h !== null));
  const uniqueVisitors = visitorHashes.size;

  const convertingSet = new Set(convertingVisitorHashes);
  const conversions = [...visitorHashes].filter((h) => convertingSet.has(h)).length;
  const conversionRate = computeConversionRate(uniqueVisitors, conversions);

  const pageCounts = new Map<string, number>();
  for (const r of rows) pageCounts.set(r.path, (pageCounts.get(r.path) ?? 0) + 1);
  const topPages = [...pageCounts.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const referrerCounts = new Map<string, number>();
  for (const r of rows) {
    // Group anything without a usable referrer — direct traffic, a referrer
    // header stripped by the visitor's browser, or a malformed value this
    // public unauthenticated endpoint received — under one bucket rather
    // than scattering it across several buckets that don't mean anything
    // different to someone reading the dashboard.
    const key = referrerHostname(r.referrer) ?? "Direct";
    referrerCounts.set(key, (referrerCounts.get(key) ?? 0) + 1);
  }
  const topReferrers = [...referrerCounts.entries()]
    .map(([referrer, views]) => ({ referrer, views }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  // Always returns exactly `days` buckets, oldest first, even for days with
  // zero views — a chart with gaps where empty days were simply omitted
  // would misrepresent the trend (a missing day looks different from a
  // confirmed-zero day).
  const dailyBuckets = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dailyBuckets.set(dateKey(d), 0);
  }
  for (const r of rows) {
    const key = dateKey(new Date(r.created_at));
    if (dailyBuckets.has(key)) dailyBuckets.set(key, (dailyBuckets.get(key) ?? 0) + 1);
  }
  const dailyViews = [...dailyBuckets.entries()].map(([date, views]) => ({ date, views }));

  return { totalViews, uniqueVisitors, conversions, conversionRate, topPages, topReferrers, dailyViews };
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD, UTC
}

/** Extracts just the hostname from a referrer string for grouping ("google.com"
 * rather than the full search-results URL) — returns null for empty/missing
 * referrers OR anything that isn't a parseable URL. This endpoint is public
 * and unauthenticated (see /api/public/analytics/track), so `referrer` is
 * whatever the caller's browser happened to send; it must never be assumed
 * to already be a valid URL. new URL() throws on malformed input rather than
 * returning something falsy, so this has to catch, not just check truthiness. */
function referrerHostname(referrer: string | null): string | null {
  if (!referrer || referrer.trim().length === 0) return null;
  const withScheme = referrer.startsWith("http://") || referrer.startsWith("https://") ? referrer : `https://${referrer}`;
  try {
    const hostname = new URL(withScheme).hostname;
    return hostname.length > 0 ? hostname : null;
  } catch {
    return null;
  }
}
