"use client";

import { useEffect, useState } from "react";

interface AdminPayment {
  id: string;
  paddle_transaction_id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  users: { name: string; email: string };
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/list-payments");
      const data = await res.json();
      setPayments(data.payments ?? []);
      setTotalRevenue(data.totalRevenue ?? 0);
      setLoading(false);
    })();
  }, []);

  const statusColor: Record<string, string> = {
    completed: "text-signal2",
    failed: "text-red-600",
    refunded: "text-amber",
  };

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h1 className="font-display text-2xl font-bold">Payments</h1>
        <p className="font-mono text-sm text-ink/50">
          Total revenue (completed): <span className="text-ink">${totalRevenue.toFixed(2)}</span>
        </p>
      </div>
      <div className="glass-panel mt-6 overflow-hidden rounded-xl">
        <table className="w-full text-left text-sm">
          <thead className="bg-ink/[0.03] text-xs uppercase text-ink/40">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Transaction</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-ink/40">
                  Loading…
                </td>
              </tr>
            ) : (
              payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3">
                    {p.users?.name}
                    <p className="text-xs text-ink/40">{p.users?.email}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-ink/50">{p.paddle_transaction_id}</td>
                  <td className="px-4 py-3">
                    {p.currency} {Number(p.amount).toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 capitalize ${statusColor[p.status] ?? ""}`}>{p.status}</td>
                  <td className="px-4 py-3 text-ink/40">{new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
