"use client";

import { useEffect, useState } from "react";
import { Download, Rocket, Loader2, ChevronDown } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

type ExportFormat = "zip" | "react" | "nextjs";

interface DeploymentEntry {
  id: string;
  provider: string;
  deployment_url: string | null;
  status: "queued" | "building" | "ready" | "error";
  logs: string | null;
  provider_deployment_id: string | null;
  created_at: string;
}

const statusColor: Record<DeploymentEntry["status"], string> = {
  queued: "text-ink/40",
  building: "text-amber",
  ready: "text-signal2",
  error: "text-red-500",
};

export function ExportBar({
  projectId,
  onLockedAction,
}: {
  projectId: string | null;
  onLockedAction: (message: string) => void;
}) {
  const toast = useToast();
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [deploying, setDeploying] = useState<"vercel" | null>(null);
  const [deployments, setDeployments] = useState<DeploymentEntry[]>([]);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const load = async () => {
      try {
        const response = await fetch(`/api/projects/deployments?projectId=${projectId}`, { cache: "no-store" });
        const data = await response.json();
        if (cancelled) return;
        const next = (data.deployments ?? []) as DeploymentEntry[];
        setDeployments(next);
        const latest = next[0];
        if (latest && (latest.status === "queued" || latest.status === "building")) {
          if (latest.provider_deployment_id) {
            fetch(`/api/deploy/vercel-status?deploymentId=${latest.id}`, { cache: "no-store" }).catch(() => null);
          }
          timer = setTimeout(load, 4000);
        }
      } catch {
        if (!cancelled) timer = setTimeout(load, 8000);
      }
    };
    load();
    return () => { cancelled = true; if (timer) clearTimeout(timer); };
  }, [projectId, deploying]);

  async function handleExport(format: ExportFormat) {
    if (!projectId) return;
    setExporting(format);
    try {
      const res = await fetch("/api/export/export-zip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format }),
      });
      if (res.status === 402 || res.status === 403) {
        const data = await res.json();
        onLockedAction(data.message);
        return;
      }
      if (!res.ok) {
        // Any other failure (404 "nothing to export yet", 500, etc.) — the body is
        // JSON, not a zip, so it must never reach res.blob()/the download flow below.
        const data = await res.json().catch(() => null);
        toast.show("error", data?.message ?? "Export failed — try again.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${projectId}-${format}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      toast.show("success", `${format.toUpperCase()} export ready.`);
    } catch {
      toast.show("error", "Network error — export didn't complete. Try again.");
    } finally {
      setExporting(null);
    }
  }

  async function handleDeploy(provider: "vercel" ) {
    if (!projectId) return;
    setDeploying(provider);
    try {
      const res = await fetch(`/api/deploy/deploy-${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 402 || res.status === 403) {
        onLockedAction(data?.message ?? "Upgrade your plan to deploy.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data?.message ?? "Deployment failed — try again.");
        return;
      }
      if (data?.deploymentUrl) {
        window.open(data.deploymentUrl, "_blank");
        toast.show("success", `Deploying to ${provider} — opening in a new tab.`);
      }
    } catch {
      toast.show("error", "Network error — deployment didn't start. Try again.");
    } finally {
      setDeploying(null);
    }
  }

  return (
    <div className="border-t border-ink/10 px-1 py-3">
      <div className="flex flex-wrap items-center gap-2">
        {(["zip", "react", "nextjs"] as ExportFormat[]).map((format) => (
          <button
            key={format}
            onClick={() => handleExport(format)}
            disabled={!projectId || exporting !== null}
            className="focus-ring flex items-center gap-1.5 rounded-full border border-ink/15 px-3 py-1.5 font-mono text-xs hover:border-ink disabled:opacity-40"
          >
            {exporting === format ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
            {format.toUpperCase()}
          </button>
        ))}
        <span className="mx-1 h-4 w-px bg-ink/10" />
        <button
          onClick={() => handleDeploy("vercel")}
          disabled={!projectId || deploying !== null}
          className="focus-ring flex items-center gap-1.5 rounded-full bg-signal px-3 py-1.5 font-mono text-xs text-paper hover:bg-signal2 disabled:opacity-40"
        >
          {deploying === "vercel" ? <Loader2 size={12} className="animate-spin" /> : <Rocket size={12} />}
          Deploy to vercel
        </button>
      </div>

      {deployments.length > 0 && (
        <div className="mt-2 space-y-1">
          {deployments.slice(0, 3).map((d) => (
            <div key={d.id} className="flex items-center gap-2 font-mono text-[11px]">
              <span className={statusColor[d.status]}>{d.status}</span>
              <span className="text-ink/40">{d.provider}</span>
              <span className="text-ink/30">{new Date(d.created_at).toLocaleString()}</span>
              {d.deployment_url && (
                <a href={d.deployment_url} target="_blank" rel="noreferrer" className="text-signal hover:underline">
                  view site
                </a>
              )}
              {d.logs && (
                <button
                  onClick={() => setExpandedLog(expandedLog === d.id ? null : d.id)}
                  className="focus-ring flex items-center gap-0.5 text-ink/40 hover:text-ink"
                >
                  logs <ChevronDown size={11} className={expandedLog === d.id ? "rotate-180" : ""} />
                </button>
              )}
            </div>
          ))}
          {deployments.find((d) => d.id === expandedLog)?.logs && (
            <pre className="mt-1 overflow-x-auto rounded-lg bg-ink/[0.04] p-2 font-mono text-[11px] text-ink/70">
              {deployments.find((d) => d.id === expandedLog)?.logs}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
