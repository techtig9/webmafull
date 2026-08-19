"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Globe, RefreshCw } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface DomainEntry {
  id: string;
  domain: string;
  status: "pending" | "verifying" | "active" | "failed";
  created_at: string;
  projects: { id: string; name: string };
}

const statusColor: Record<DomainEntry["status"], string> = {
  pending: "text-ink/40",
  verifying: "text-amber",
  active: "text-signal2",
  failed: "text-red-500",
};

export default function DomainsPage() {
  const toast = useToast();
  const [domains, setDomains] = useState<DomainEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/domains/list-all")
      .then((r) => r.json())
      .then((data) => {
        setDomains(data.domains ?? []);
        setLoading(false);
      });
  }, []);

  async function recheck(domainId: string) {
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

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Domains</h1>
      <p className="mt-1 text-sm text-ink/50">Every custom domain connected across your projects.</p>

      <div className="glass-panel mt-6 overflow-hidden rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
            <tr>
              <th className="px-4 py-3">Domain</th>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Connected</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Loading…
                </td>
              </tr>
            ) : domains.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  No domains connected yet — add one from a project's SEO & domains panel.
                </td>
              </tr>
            ) : (
              domains.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Globe size={13} className="text-ink/40" />
                      {d.domain}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/dashboard/generator?project=${d.projects.id}`} className="text-signal hover:underline">
                      {d.projects.name}
                    </Link>
                  </td>
                  <td className={`px-4 py-3 font-mono text-xs uppercase ${statusColor[d.status]}`}>{d.status}</td>
                  <td className="px-4 py-3 text-ink/40">{new Date(d.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {d.status === "verifying" && (
                      <button
                        onClick={() => recheck(d.id)}
                        disabled={verifyingId === d.id}
                        className="focus-ring flex items-center gap-1 text-xs text-ink/50 hover:text-ink"
                      >
                        <RefreshCw size={12} className={verifyingId === d.id ? "animate-spin" : ""} /> Recheck
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
