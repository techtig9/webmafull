"use client";

import { useEffect, useState } from "react";

interface AdminSubscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  provider: string;
  credits_remaining: number;
  credits_allowance: number;
  renews_at: string;
  users: { name: string; email: string };
}

export default function AdminSubscriptionsPage() {
  const [subs, setSubs] = useState<AdminSubscription[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/list-subscriptions");
    const data = await res.json();
    setSubs(data.subscriptions ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function act(userId: string, action: "extend" | "cancel") {
    await fetch("/api/admin/override-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action, extendDays: 30 }),
    });
    load();
  }

  const statusColor: Record<string, string> = {
    active: "text-signal2",
    past_due: "text-amber",
    canceled: "text-ink/30",
    paused: "text-ink/30",
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-bold">Subscriptions</h1>
      <div className="glass-panel mt-6 overflow-hidden rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Renews</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-ink/40">
                  Loading…
                </td>
              </tr>
            ) : (
              subs.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3">
                    {s.users?.name}
                    <p className="text-xs text-ink/40">{s.users?.email}</p>
                  </td>
                  <td className="px-4 py-3 capitalize">{s.plan}</td>
                  <td className={`px-4 py-3 capitalize ${statusColor[s.status] ?? ""}`}>{s.status}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {s.credits_remaining.toLocaleString()} / {s.credits_allowance.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-ink/40">{new Date(s.renews_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => act(s.user_id, "extend")}
                      className="focus-ring rounded-full border border-ink/15 px-3 py-1 text-xs hover:border-ink"
                    >
                      +30 days
                    </button>
                    <button
                      onClick={() => act(s.user_id, "cancel")}
                      className="focus-ring rounded-full border border-red-500/30 px-3 py-1 text-xs text-red-400 hover:border-red-400"
                    >
                      Cancel
                    </button>
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
