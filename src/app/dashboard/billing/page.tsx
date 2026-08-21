"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useToast } from "@/components/ui/Toast";

interface SubStatus {
  plan: string;
  status: string;
  creditsRemaining: number | null;
  creditsAllowance: number | null;
  renews_at?: string;
  isAdmin: boolean;
}

const PLANS = [
  { id: "starter", label: "Starter", price: 9.6 },
  { id: "pro", label: "Pro", price: 19.2 },
  { id: "business", label: "Business", price: 39.2 },
] as const;

export default function BillingPage() {
  const toast = useToast();
  const [sub, setSub] = useState<SubStatus | null>(null);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    fetch("/api/billing/subscription-status")
      .then((r) => r.json())
      .then(setSub);
  }, []);

  async function upgrade(plan: string) {
    setCheckingOut(plan);
    try {
      const res = await fetch("/api/billing/paddle-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, cycle: "month" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show("error", data.message ?? "Couldn't start checkout.");
        return;
      }
      // @ts-expect-error Paddle is attached to window by the script below
      const paddle = window.Paddle;
      // Previously used optional chaining here (window.Paddle?.Initialize?.(...)),
      // which meant that if paddle.js hadn't finished loading yet — a real,
      // plausible race even with strategy="afterInteractive", since that
      // only guarantees the script starts loading after hydration, not that
      // it's finished by the time someone clicks Subscribe — this entire
      // block would silently do nothing. The checkout call above already
      // succeeded, credits/plan state may already reflect it server-side,
      // but no checkout UI would ever appear and nothing would tell the
      // person why. This is that missing feedback.
      if (!paddle) {
        toast.show("error", "Checkout is still loading — wait a moment and try again.");
        return;
      }
      paddle.Initialize?.({ token: data.clientToken });
      paddle.Checkout.open({
        items: [{ priceId: data.priceId, quantity: 1 }],
        customer: { id: data.customerId },
      });
    } catch {
      toast.show("error", "Network error — checkout didn't open.");
    } finally {
      setCheckingOut(null);
    }
  }

  async function cancelSubscription() {
    if (!confirm("Cancel your subscription? You'll keep access until the end of this billing period.")) return;
    setCanceling(true);
    try {
      const res = await fetch("/api/billing/cancel-subscription", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't cancel — try again.");
        return;
      }
      toast.show("success", data.message ?? "Subscription canceled.");
    } catch {
      toast.show("error", "Network error — cancellation didn't complete.");
    } finally {
      setCanceling(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <Script src="https://cdn.paddle.com/paddle/v2/paddle.js" strategy="afterInteractive" />
      <h1 className="font-display text-2xl font-bold">Billing</h1>

      {sub && (
        <div className="glass-panel mt-6 rounded-2xl p-6">
          <p className="font-mono text-xs uppercase text-ink/40">Current plan</p>
          <p className="mt-1 font-display text-xl font-bold capitalize">
            {sub.isAdmin ? "Admin (unlimited)" : sub.plan}
          </p>
          {!sub.isAdmin && (
            <>
              <p className="mt-1 text-sm text-ink/50">
                {sub.creditsRemaining?.toLocaleString()} / {sub.creditsAllowance?.toLocaleString()} credits
                remaining this cycle
              </p>
              {sub.plan !== "free" && sub.status === "active" && (
                <button
                  onClick={cancelSubscription}
                  disabled={canceling}
                  className="focus-ring mt-3 text-xs text-red-500 hover:underline disabled:opacity-50"
                >
                  {canceling ? "Canceling…" : "Cancel subscription"}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {!sub?.isAdmin && (
        <div className="mt-8">
          <h2 className="mb-3 font-display font-bold">Change plan</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {PLANS.map((p) => (
              <div key={p.id} className="glass-panel rounded-xl p-5">
                <p className="font-medium">{p.label}</p>
                <p className="mt-1 font-display text-2xl font-bold">${p.price.toFixed(2)}/mo</p>
                <button
                  onClick={() => upgrade(p.id)}
                  disabled={checkingOut !== null || sub?.plan === p.id}
                  className="focus-ring mt-4 w-full rounded-full bg-signal py-2 text-sm text-paper hover:bg-signal2 disabled:opacity-40"
                >
                  {sub?.plan === p.id ? "Current plan" : checkingOut === p.id ? "Opening checkout…" : "Choose"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
