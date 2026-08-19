"use client";

import { useEffect, useState } from "react";

interface AuditEntry {
  id: string;
  actor_id: string | null;
  actor_role: "user" | "admin" | "system";
  action: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  users: { name: string; email: string } | null;
}

const roleColor: Record<string, string> = {
  admin: "text-signal",
  system: "text-signal2",
  user: "text-ink/60",
};

export default function AuditLogPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/list-audit-log")
      .then((r) => r.json())
      .then((data) => {
        setEntries(data.entries ?? []);
        setLoading(false);
      });
  }, []);

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Audit log</h1>
      <p className="mt-1 text-sm text-ink/50">
        Admin actions, account deletions, and subscription lifecycle events from Paddle.
      </p>
      <div className="glass-panel mt-6 overflow-hidden rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
            <tr>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink/40">
                  Loading…
                </td>
              </tr>
            ) : entries.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ink/40">
                  No events yet.
                </td>
              </tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id}>
                  <td className={`px-4 py-3 font-mono text-xs ${roleColor[e.actor_role]}`}>
                    {e.users?.email ?? e.actor_role}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{e.action}</td>
                  <td className="px-4 py-3 font-mono text-xs text-ink/50">
                    {e.target_id?.slice(0, 8) ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/40">{new Date(e.created_at).toLocaleString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
