"use client";

import { useEffect, useState } from "react";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin";
  created_at: string;
  subscriptions: { plan: string; credits_remaining: number }[];
}

const PLANS = ["free", "starter", "pro", "business"] as const;

interface Analytics {
  totalUsers: number;
  activeSubscriptions: number;
  byPlan: Record<string, number>;
  estimatedMrr: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  async function load(q = "") {
    setLoading(true);
    const res = await fetch(`/api/admin/list-users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    fetch("/api/admin/analytics")
      .then((r) => r.json())
      .then(setAnalytics)
      .catch(() => {});
  }, []);

  async function overridePlan(userId: string, plan: string) {
    await fetch("/api/admin/override-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, action: "set_plan", plan }),
    });
    load(search);
  }

  return (
    <div>
      {analytics && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="glass-panel rounded-xl p-4">
            <p className="font-mono text-xs uppercase text-ink/40">Total users</p>
            <p className="mt-1 font-display text-2xl font-bold">{analytics.totalUsers}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="font-mono text-xs uppercase text-ink/40">Active subs</p>
            <p className="mt-1 font-display text-2xl font-bold">{analytics.activeSubscriptions}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="font-mono text-xs uppercase text-ink/40">Est. MRR</p>
            <p className="mt-1 font-display text-2xl font-bold">${analytics.estimatedMrr}</p>
          </div>
          <div className="glass-panel rounded-xl p-4">
            <p className="font-mono text-xs uppercase text-ink/40">By plan</p>
            <p className="mt-1 font-mono text-xs text-ink/60">
              {Object.entries(analytics.byPlan).map(([p, n]) => `${p}:${n}`).join("  ")}
            </p>
          </div>
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Users</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load(search)}
          placeholder="Search by email…"
          className="focus-ring rounded-full border border-ink/15 px-4 py-2 text-sm"
        />
      </div>

      <div className="glass-panel mt-6 overflow-hidden rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Credits</th>
              <th className="px-4 py-3">Signed up</th>
              <th className="px-4 py-3">Override</th>
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
              users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    {u.name} {u.role === "admin" && <span className="ml-1 text-xs text-signal">(admin)</span>}
                  </td>
                  <td className="px-4 py-3 text-ink/60">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.subscriptions?.[0]?.plan ?? "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs">
                    {u.subscriptions?.[0]?.credits_remaining?.toLocaleString() ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-ink/40">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    {u.role !== "admin" && (
                      <select
                        defaultValue=""
                        onChange={(e) => e.target.value && overridePlan(u.id, e.target.value)}
                        className="focus-ring rounded-md border border-ink/15 px-2 py-1 text-xs"
                      >
                        <option value="" disabled>
                          Set plan…
                        </option>
                        {PLANS.map((p) => (
                          <option key={p} value={p}>
                            {p}
                          </option>
                        ))}
                      </select>
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
