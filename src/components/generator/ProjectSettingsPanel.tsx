"use client";

import { useEffect, useMemo, useState } from "react";
import { Globe, Trash2, RefreshCw, History, Inbox, Download, ChevronDown, BarChart3, ShieldCheck, ShieldAlert, Wand2, Github, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { Page } from "@/lib/preview";
import type { AnalyticsSummary } from "@/lib/analytics";
import { auditSeo, type SeoIssue } from "@/lib/seo-audit";
import { applyEdit } from "@/lib/ai-edit";

interface Domain {
  id: string;
  domain: string;
  status: "pending" | "verifying" | "active" | "failed";
  created_at: string;
}

interface VersionEntry {
  version: number;
  created_at: string;
}

interface Submission {
  id: string;
  page_slug: string;
  form_name: string;
  data: Record<string, string>;
  created_at: string;
}

const statusColor: Record<Domain["status"], string> = {
  pending: "text-ink/40",
  verifying: "text-amber",
  active: "text-signal2",
  failed: "text-red-500",
};

export function ProjectSettingsPanel({
  projectId,
  pages,
  files,
  siteSeoTitle,
  siteSeoDescription,
  onSiteSeoChange,
  onLockedAction,
  onVersionRestored,
  onPagesChange,
}: {
  projectId: string;
  pages: Page[];
  files: Record<string, string>;
  siteSeoTitle: string;
  siteSeoDescription: string;
  onSiteSeoChange: (title: string, description: string) => void;
  onLockedAction: (message: string) => void;
  onVersionRestored: (files: Record<string, string>, pages?: Page[]) => void;
  onPagesChange: (pages: Page[]) => void;
}) {
  const toast = useToast();

  // SEO — "" means the site-wide default; any other value is a page slug,
  // editing that one page's override instead.
  const [selectedPageSlug, setSelectedPageSlug] = useState<string>("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [seoOgImageUrl, setSeoOgImageUrl] = useState("");
  const [savingSeo, setSavingSeo] = useState(false);

  // Domains
  const [domains, setDomains] = useState<Domain[]>([]);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  // Version history
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [restoringVersion, setRestoringVersion] = useState<number | null>(null);

  // Form submissions
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [expandedSubmissionId, setExpandedSubmissionId] = useState<string | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [analyticsDays, setAnalyticsDays] = useState<7 | 30 | 90>(30);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  // SEO audit — recomputed whenever the underlying files/pages/site-wide SEO
  // actually change, not on every render; this runs synchronously over
  // in-memory data (no API call, no DB) so it's always current with
  // whatever's in the editor right now, including an AI edit or a quick-style
  // change that hasn't even been saved yet.
  const seoAudit = useMemo(
    () => auditSeo(files, pages, { title: siteSeoTitle, description: siteSeoDescription }),
    [files, pages, siteSeoTitle, siteSeoDescription]
  );
  const [fixingStructuredData, setFixingStructuredData] = useState(false);

  // GitHub sync
  const [githubConnected, setGithubConnected] = useState(false);
  const [pushingToGithub, setPushingToGithub] = useState(false);
  const [lastPush, setLastPush] = useState<{ url: string; at: string } | null>(null);

  async function addStructuredData() {
    // No safe deterministic way to insert a new script tag into arbitrary
    // existing JSX without real parsing — same reasoning QuickStylePanel
    // uses for falling back to AI when a direct patch isn't safe. Target
    // whichever section renders last on the home page (commonly a Footer),
    // since that's the most common real place this kind of sitewide
    // metadata actually lives.
    const home = pages.find((p) => p.slug === "index") ?? pages[0];
    if (!home || home.sections.length === 0) {
      toast.show("error", "This site doesn't have a page to add structured data to yet.");
      return;
    }
    const targetSection = home.sections[home.sections.length - 1];
    const targetFile = files[`components/${targetSection}.tsx`] !== undefined
      ? `components/${targetSection}.tsx`
      : `components/${targetSection}.ts`;

    setFixingStructuredData(true);
    try {
      const result = await applyEdit({
        projectId,
        targetFile,
        instruction: `Add a JSON-LD structured data script to this component, as a direct child near the top or bottom of what it returns: <script type="application/ld+json">{JSON.stringify({"@context":"https://schema.org","@type":"Organization","name":${JSON.stringify(
          siteSeoTitle
        )},"description":${JSON.stringify(siteSeoDescription)}})}</script>. Do not change anything else in this component.`,
        filesBefore: files,
      });
      if (result.outcome === "locked") {
        onLockedAction(result.message);
        return;
      }
      if (result.outcome === "error") {
        toast.show("error", result.message);
        return;
      }
      onVersionRestored(result.files, pages);
      toast.show("success", "Structured data added.");
    } catch {
      toast.show("error", "Network error — couldn't add structured data.");
    } finally {
      setFixingStructuredData(false);
    }
  }

  useEffect(() => {
    setLoadingAnalytics(true);
    fetch(`/api/projects/analytics?projectId=${projectId}&days=${analyticsDays}`)
      .then((r) => r.json())
      .then((data) => setAnalytics(data))
      .catch(() => {})
      .finally(() => setLoadingAnalytics(false));
  }, [projectId, analyticsDays]);

  useEffect(() => {
    fetch(`/api/domains/list?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setDomains(data.domains ?? []))
      .catch(() => {});
    fetch(`/api/projects/versions?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setVersions(data.versions ?? []))
      .catch(() => {});
    fetch(`/api/projects/submissions?projectId=${projectId}`)
      .then((r) => r.json())
      .then((data) => setSubmissions(data.submissions ?? []))
      .catch(() => {});
    fetch(`/api/deploy-oauth/status`)
      .then((r) => r.json())
      .then((data) => setGithubConnected((data.connections ?? []).some((c: { provider: string }) => c.provider === "github")))
      .catch(() => {});
  }, [projectId]);

  async function pushToGithub() {
    setPushingToGithub(true);
    try {
      const res = await fetch("/api/github/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't push to GitHub.");
        return;
      }
      setLastPush({ url: data.commitUrl ?? data.repoUrl, at: new Date().toISOString() });
      toast.show("success", "Pushed to GitHub.");
    } catch {
      toast.show("error", "Network error — push didn't complete.");
    } finally {
      setPushingToGithub(false);
    }
  }

  function downloadSubmissionsCsv() {
    if (submissions.length === 0) return;
    // Field sets can differ between submissions (a "contact" form vs a
    // "newsletter" form on the same project) — union every key seen across
    // all of them so the CSV has one consistent column set, not one shaped
    // by whichever submission happened to come first.
    const fieldNames = Array.from(new Set(submissions.flatMap((s) => Object.keys(s.data))));
    const header = ["submitted_at", "form", "page", ...fieldNames];
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = submissions.map((s) =>
      [s.created_at, s.form_name, s.page_slug, ...fieldNames.map((f) => s.data[f] ?? "")].map((v) => escape(String(v))).join(",")
    );
    const csv = [header.map(escape).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "form-submissions.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    const page = pages.find((p) => p.slug === selectedPageSlug);
    setSeoTitle(page?.seoTitle ?? "");
    setSeoDescription(page?.seoDescription ?? "");
    setSeoOgImageUrl(page?.seoOgImageUrl ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPageSlug]);

  async function saveSeo() {
    setSavingSeo(true);
    try {
      if (selectedPageSlug) {
        const res = await fetch("/api/projects/update-page-seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, slug: selectedPageSlug, seoTitle, seoDescription, seoOgImageUrl }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          toast.show("error", data?.message ?? "Couldn't save that page's SEO settings.");
          return;
        }
        onPagesChange(data.pages);
        toast.show("success", "Page SEO settings saved.");
      } else {
        const res = await fetch("/api/projects/seo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, seoTitle, seoDescription, seoOgImageUrl }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          toast.show("error", data?.message ?? "Couldn't save SEO settings.");
          return;
        }
        toast.show("success", "SEO settings saved.");
        onSiteSeoChange(seoTitle, seoDescription);
      }
    } catch {
      toast.show("error", "Network error — SEO settings didn't save.");
    } finally {
      setSavingSeo(false);
    }
  }

  async function addDomain() {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    try {
      const res = await fetch("/api/domains/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, domain: newDomain.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        onLockedAction(data?.message ?? "Upgrade your plan to add a custom domain.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't add domain.");
        return;
      }
      setDomains((prev) => [
        { id: data.id, domain: newDomain.trim(), status: data.verified ? "active" : "verifying", created_at: new Date().toISOString() },
        ...prev,
      ]);
      setNewDomain("");
      toast.show(
        data.verified ? "success" : "success",
        data.verified ? "Domain connected." : "Domain added — add the DNS records shown to finish verification."
      );
    } catch {
      toast.show("error", "Network error — domain wasn't added.");
    } finally {
      setAddingDomain(false);
    }
  }

  async function recheckDomain(domainId: string) {
    setVerifyingId(domainId);
    try {
      const res = await fetch("/api/domains/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
      const data = await res.json().catch(() => null);
      setDomains((prev) => prev.map((d) => (d.id === domainId ? { ...d, status: data?.status ?? d.status } : d)));
    } catch {
      toast.show("error", "Network error — couldn't recheck domain.");
    } finally {
      setVerifyingId(null);
    }
  }

  async function removeDomain(domainId: string) {
    setDomains((prev) => prev.filter((d) => d.id !== domainId));
    try {
      await fetch("/api/domains/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domainId }),
      });
    } catch {
      toast.show("error", "Network error — domain removal may not have completed.");
    }
  }

  async function restoreVersion(version: number) {
    setRestoringVersion(version);
    try {
      const res = await fetch("/api/projects/restore-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, version }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 403) {
        onLockedAction(data?.message ?? "Upgrade your plan to restore this version.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't restore that version.");
        return;
      }
      onVersionRestored(data.files, data.pages ?? undefined);
      setVersions((prev) => [{ version: data.newVersion, created_at: new Date().toISOString() }, ...prev]);
      toast.show("success", `Restored version ${version}.`);
    } catch {
      toast.show("error", "Network error — restore didn't complete.");
    } finally {
      setRestoringVersion(null);
    }
  }

  return (
    <div className="glass-panel grid gap-6 rounded-xl p-5 md:grid-cols-3">
      <div>
        <h3 className="font-display text-sm font-bold">SEO</h3>
        <p className="mt-1 text-xs text-ink/50">Controls how this site appears in search results and link previews.</p>
        {pages.length > 1 && (
          <select
            value={selectedPageSlug}
            onChange={(e) => setSelectedPageSlug(e.target.value)}
            className="focus-ring mt-3 w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          >
            <option value="">Site-wide default</option>
            {pages.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} page
              </option>
            ))}
          </select>
        )}
        <div className="mt-3 space-y-2.5">
          <input
            value={seoTitle}
            onChange={(e) => setSeoTitle(e.target.value)}
            placeholder={selectedPageSlug ? "Title (blank = use site-wide default)" : "Page title (defaults to website name)"}
            maxLength={60}
            className="focus-ring w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          />
          <textarea
            value={seoDescription}
            onChange={(e) => setSeoDescription(e.target.value)}
            placeholder={
              selectedPageSlug ? "Description (blank = use site-wide default)" : "Meta description (under 160 characters)"
            }
            maxLength={160}
            rows={2}
            className="focus-ring w-full resize-none rounded-lg border border-ink/15 px-3 py-2 text-sm"
          />
          <input
            value={seoOgImageUrl}
            onChange={(e) => setSeoOgImageUrl(e.target.value)}
            placeholder="Social preview image URL (optional)"
            className="focus-ring w-full rounded-lg border border-ink/15 px-3 py-2 text-sm"
          />
          <button
            onClick={saveSeo}
            disabled={savingSeo}
            className="focus-ring rounded-full bg-signal px-4 py-1.5 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-50"
          >
            {savingSeo ? "Saving…" : selectedPageSlug ? "Save page SEO" : "Save SEO settings"}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">SEO &amp; quality score</h3>
          <div className="flex items-center gap-1.5">
            {seoAudit.score >= 90 ? (
              <ShieldCheck size={14} className="text-signal2" />
            ) : (
              <ShieldAlert size={14} className={seoAudit.score >= 70 ? "text-amber" : "text-red-500"} />
            )}
            <span className="font-display text-sm font-bold">{seoAudit.score}</span>
            <span className="text-xs text-ink/35">/100</span>
          </div>
        </div>
        <p className="mt-1 text-xs text-ink/50">
          Checked automatically from the actual generated code — meta tags, image alt text, internal links, heading structure, and structured data. Not a full Lighthouse-style audit (that needs real browser rendering); this is what's mechanically checkable from source.
        </p>

        {seoAudit.issues.length === 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-signal2/20 bg-signal2/[0.05] px-3 py-2.5 text-xs text-signal2">
            <ShieldCheck size={14} /> No issues found.
          </div>
        ) : (
          <div className="mt-3 space-y-1.5">
            {seoAudit.issues.map((issue, i) => (
              <SeoIssueRow key={i} issue={issue} />
            ))}
            {seoAudit.issues.some((i) => i.category === "structured-data") && (
              <button
                onClick={addStructuredData}
                disabled={fixingStructuredData}
                className="focus-ring mt-1 flex items-center gap-1.5 rounded-full border border-signal/30 px-3 py-1.5 text-[11px] font-medium text-signal hover:bg-signal/5 disabled:opacity-50"
              >
                <Wand2 size={11} /> {fixingStructuredData ? "Adding…" : "Add structured data with AI"}
              </button>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-display text-sm font-bold">Custom domains</h3>
        <p className="mt-1 text-xs text-ink/50">Connect your own domain once the site is deployed to Vercel.</p>
        <div className="mt-3 flex gap-2">
          <input
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !addingDomain && addDomain()}
            placeholder="yourdomain.com"
            className="focus-ring flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm"
          />
          <button
            onClick={addDomain}
            disabled={addingDomain || !newDomain.trim()}
            className="focus-ring shrink-0 rounded-full bg-signal px-4 py-2 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-50"
          >
            {addingDomain ? "Adding…" : "Add"}
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {domains.length === 0 && <p className="text-xs text-ink/35">No domains connected yet.</p>}
          {domains.map((d) => (
            <div key={d.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2">
              <div className="flex items-center gap-2">
                <Globe size={13} className="text-ink/40" />
                <span className="text-sm">{d.domain}</span>
                <span className={`font-mono text-[11px] uppercase ${statusColor[d.status]}`}>{d.status}</span>
              </div>
              <div className="flex items-center gap-1">
                {d.status === "verifying" && (
                  <button
                    onClick={() => recheckDomain(d.id)}
                    disabled={verifyingId === d.id}
                    className="focus-ring rounded-md p-1.5 text-ink/40 hover:text-ink"
                    aria-label="Recheck verification"
                  >
                    <RefreshCw size={13} className={verifyingId === d.id ? "animate-spin" : ""} />
                  </button>
                )}
                <button
                  onClick={() => removeDomain(d.id)}
                  className="focus-ring rounded-md p-1.5 text-ink/40 hover:text-red-500"
                  aria-label="Remove domain"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">GitHub</h3>
          {lastPush && (
            <a href={lastPush.url} target="_blank" rel="noreferrer" className="focus-ring flex items-center gap-1 font-mono text-[11px] text-signal hover:underline">
              View last push <ExternalLink size={10} />
            </a>
          )}
        </div>
        <p className="mt-1 text-xs text-ink/50">
          One-way sync — pushing overwrites the repo with this project's current code. Changes made directly on GitHub aren't pulled back in.
        </p>
        <div className="mt-3">
          {!githubConnected ? (
            <a
              href="/api/deploy-oauth/github/authorize"
              className="focus-ring inline-flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 text-xs text-ink/70 hover:text-ink"
            >
              <Github size={13} /> Connect GitHub
            </a>
          ) : (
            <button
              onClick={pushToGithub}
              disabled={pushingToGithub}
              className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-4 py-1.5 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-50"
            >
              <Github size={13} /> {pushingToGithub ? "Pushing…" : "Push to GitHub"}
            </button>
          )}
        </div>
      </div>

      <div>
        <h3 className="font-display text-sm font-bold">Version history</h3>
        <p className="mt-1 text-xs text-ink/50">Restore an earlier version — this adds a new version, it never deletes history.</p>
        <div className="mt-3 max-h-56 space-y-1.5 overflow-y-auto">
          {versions.length === 0 && <p className="text-xs text-ink/35">No versions yet.</p>}
          {versions.map((v, i) => (
            <div key={v.version} className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2">
              <div className="flex items-center gap-2 text-sm">
                <History size={13} className="text-ink/40" />
                <span>Version {v.version}</span>
                {i === 0 && <span className="font-mono text-[11px] text-signal2">current</span>}
              </div>
              {i !== 0 && (
                <button
                  onClick={() => restoreVersion(v.version)}
                  disabled={restoringVersion !== null}
                  className="focus-ring font-mono text-[11px] text-signal hover:underline disabled:opacity-50"
                >
                  {restoringVersion === v.version ? "Restoring…" : "Restore"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">Form submissions</h3>
          {submissions.length > 0 && (
            <button
              onClick={downloadSubmissionsCsv}
              className="focus-ring flex items-center gap-1 font-mono text-[11px] text-signal hover:underline"
            >
              <Download size={12} /> Export CSV
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-ink/50">Leads captured from any working contact/signup form on this site.</p>
        <div className="mt-3 max-h-72 space-y-1.5 overflow-y-auto">
          {submissions.length === 0 && (
            <div className="flex items-center gap-2 rounded-lg border border-dashed border-ink/10 px-3 py-4 text-xs text-ink/35">
              <Inbox size={14} /> No submissions yet.
            </div>
          )}
          {submissions.map((s) => {
            const expanded = expandedSubmissionId === s.id;
            const preview = Object.values(s.data)[0] ?? "";
            return (
              <div key={s.id} className="rounded-lg border border-ink/10 px-3 py-2">
                <button
                  onClick={() => setExpandedSubmissionId(expanded ? null : s.id)}
                  className="focus-ring flex w-full items-center justify-between gap-2 text-left"
                >
                  <div className="flex min-w-0 items-center gap-2 text-sm">
                    <ChevronDown size={13} className={`shrink-0 text-ink/40 transition-transform ${expanded ? "rotate-180" : ""}`} />
                    <span className="font-medium">{s.form_name}</span>
                    <span className="truncate text-ink/45">{preview}</span>
                  </div>
                  <span className="shrink-0 font-mono text-[10px] text-ink/35">{new Date(s.created_at).toLocaleDateString()}</span>
                </button>
                {expanded && (
                  <dl className="mt-2 space-y-1 border-t border-ink/10 pt-2">
                    {Object.entries(s.data).map(([key, value]) => (
                      <div key={key} className="flex gap-2 text-xs">
                        <dt className="w-24 shrink-0 truncate text-ink/40">{key}</dt>
                        <dd className="min-w-0 flex-1 break-words text-ink/70">{value}</dd>
                      </div>
                    ))}
                  </dl>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h3 className="font-display text-sm font-bold">Analytics</h3>
          <div className="flex gap-1">
            {([7, 30, 90] as const).map((d) => (
              <button
                key={d}
                onClick={() => setAnalyticsDays(d)}
                className={`rounded-full px-2.5 py-1 font-mono text-[11px] ${
                  analyticsDays === d ? "bg-signal text-paper" : "text-ink/45 hover:text-ink"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {loadingAnalytics ? (
          <p className="mt-3 text-xs text-ink/35">Loading…</p>
        ) : !analytics || analytics.totalViews === 0 ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-ink/10 px-3 py-4 text-xs text-ink/35">
            <BarChart3 size={14} /> No traffic recorded yet — analytics only tracks sites deployed through webma (not raw code exports).
          </div>
        ) : (
          <div className="mt-3 space-y-4">
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border border-ink/10 p-2.5">
                <p className="font-mono text-[10px] text-ink/40">Total views</p>
                <p className="mt-0.5 font-display text-lg font-bold">{analytics.totalViews.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-ink/10 p-2.5">
                <p className="font-mono text-[10px] text-ink/40">Unique visitors</p>
                <p className="mt-0.5 font-display text-lg font-bold">{analytics.uniqueVisitors.toLocaleString()}</p>
              </div>
              <div className="rounded-lg border border-ink/10 p-2.5" title="Visitors who viewed a page and submitted a form on the same day">
                <p className="font-mono text-[10px] text-ink/40">Conversion rate</p>
                <p className="mt-0.5 font-display text-lg font-bold">{analytics.conversionRate}%</p>
              </div>
            </div>

            <div>
              <p className="mb-1.5 font-mono text-[10px] text-ink/40">Views per day</p>
              <div className="flex h-16 items-end gap-[2px]">
                {analytics.dailyViews.map((d) => {
                  const max = Math.max(1, ...analytics.dailyViews.map((x) => x.views));
                  return (
                    <div
                      key={d.date}
                      title={`${d.date}: ${d.views} view${d.views === 1 ? "" : "s"}`}
                      className="flex-1 rounded-t-sm bg-signal/60"
                      style={{ height: `${Math.max(2, (d.views / max) * 100)}%` }}
                    />
                  );
                })}
              </div>
            </div>

            {analytics.topPages.length > 0 && (
              <div>
                <p className="mb-1.5 font-mono text-[10px] text-ink/40">Top pages</p>
                <div className="space-y-1">
                  {analytics.topPages.slice(0, 5).map((p) => (
                    <div key={p.path} className="flex items-center justify-between text-xs">
                      <span className="truncate text-ink/70">{p.path}</span>
                      <span className="shrink-0 font-mono text-ink/40">{p.views}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {analytics.topReferrers.length > 0 && (
              <div>
                <p className="mb-1.5 font-mono text-[10px] text-ink/40">Top referrers</p>
                <div className="space-y-1">
                  {analytics.topReferrers.slice(0, 5).map((r) => (
                    <div key={r.referrer} className="flex items-center justify-between text-xs">
                      <span className="truncate text-ink/70">{r.referrer}</span>
                      <span className="shrink-0 font-mono text-ink/40">{r.views}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const CATEGORY_LABEL: Record<SeoIssue["category"], string> = {
  meta: "Meta tags",
  "alt-text": "Alt text",
  links: "Links",
  "structured-data": "Structured data",
  headings: "Headings",
  labels: "Form labels",
  "accessible-names": "Accessible names",
};

function SeoIssueRow({ issue }: { issue: SeoIssue }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-ink/10 px-2.5 py-2">
      <span
        className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${issue.severity === "error" ? "bg-red-500" : "bg-amber"}`}
      />
      <div className="min-w-0">
        <p className="font-mono text-[9px] uppercase tracking-wide text-ink/35">{CATEGORY_LABEL[issue.category]}</p>
        <p className="text-xs text-ink/70">{issue.message}</p>
      </div>
    </div>
  );
}
