"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

interface MyFeedback {
  id: string;
  type: "bug" | "feature" | "other";
  message: string;
  status: "open" | "reviewed" | "closed";
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  bug: "Bug",
  feature: "Feature request",
  other: "Other",
};

const STATUS_LABEL: Record<string, string> = {
  open: "Received",
  reviewed: "In progress",
  closed: "Resolved",
};

export default function FeedbackPage() {
  const toast = useToast();
  const [type, setType] = useState<"bug" | "feature" | "other">("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<MyFeedback[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/feedback/list");
    const data = await res.json();
    setItems(data.feedback ?? []);
    setLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show("error", data.message ?? "Couldn't submit that — try again.");
        return;
      }
      toast.show("success", "Thanks — we've got it.");
      setMessage("");
      await load();
    } catch {
      toast.show("error", "Network error — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Feedback</h1>
        <p className="mt-1 text-sm text-ink/50">Report a bug or request a feature — it goes straight to the team.</p>
      </div>

      <form onSubmit={handleSubmit} className="glass-panel space-y-4 rounded-2xl p-6">
        <div>
          <label className="mb-1.5 block text-sm font-medium">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="focus-ring w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-sm"
          >
            <option value="bug">Bug</option>
            <option value="feature">Feature request</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium">Message</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
            minLength={10}
            rows={4}
            placeholder="What happened, or what would help?"
            className="focus-ring w-full rounded-lg border border-ink/15 bg-transparent px-3 py-2 text-sm"
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send feedback"}
        </Button>
      </form>

      <div>
        <h2 className="font-display font-bold">Your past submissions</h2>
        <div className="mt-3 space-y-2">
          {loading ? (
            <p className="text-sm text-ink/40">Loading…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-ink/40">Nothing submitted yet.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="glass-panel rounded-xl p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{TYPE_LABEL[item.type]}</span>
                  <span className="text-xs text-ink/40">{STATUS_LABEL[item.status]}</span>
                </div>
                <p className="mt-1 text-ink/70">{item.message}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
