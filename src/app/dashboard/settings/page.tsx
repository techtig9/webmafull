"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { ApiKeysCard } from "@/components/dashboard/ApiKeysCard";

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const toast = useToast();
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    setLoggingOut(false);
    if (error) {
      toast.show("error", "Couldn't log out — try again.");
      return;
    }
    router.push("/login");
    router.refresh();
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      // Deleting the auth.users row requires the service role — routed through a
      // dedicated endpoint rather than exposing that key to the browser.
      const res = await fetch("/api/account/delete", { method: "POST" });
      if (!res.ok) {
        // The account was NOT actually deleted — never sign the user out or redirect
        // here, or they'd wrongly believe deletion succeeded.
        toast.show("error", "Couldn't delete your account. Try again.");
        return;
      }
      await supabase.auth.signOut();
      router.push("/");
    } catch {
      toast.show("error", "Network error — account was not deleted. Try again.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-ink/50">Manage your account preferences.</p>
      </div>

      <div className="glass-panel rounded-2xl p-6">
        <h2 className="font-display font-bold">Notifications</h2>
        <p className="mt-1 text-sm text-ink/50">
          Success and error toasts appear automatically across the dashboard — nothing to configure here yet.
        </p>
      </div>

      <div className="glass-panel flex items-center justify-between rounded-2xl p-6">
        <div>
          <h2 className="font-display font-bold">Account</h2>
          <p className="mt-1 text-sm text-ink/50">Signed in on this device.</p>
        </div>
        <Button variant="secondary" onClick={handleLogout} disabled={loggingOut}>
          <LogOut size={14} /> {loggingOut ? "Logging out…" : "Log out"}
        </Button>
      </div>

      <Link href="/dashboard/security" className="lift-on-hover glass-panel flex items-center justify-between rounded-2xl p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck size={18} className="text-signal" />
          <div>
            <h2 className="font-display font-bold">Security</h2>
            <p className="mt-1 text-sm text-ink/50">Two-factor authentication and connected deploy accounts.</p>
          </div>
        </div>
        <span className="font-mono text-xs text-signal">Manage →</span>
      </Link>

      <ApiKeysCard />

      <div className="rounded-2xl border border-red-500/30 bg-red-500/[0.04] p-6">
        <h2 className="font-display font-bold text-red-600">Delete account</h2>
        <p className="mt-1 text-sm text-ink/50">
          This permanently deletes your account, projects, and subscription. This can't be undone.
        </p>
        <input
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder='Type "DELETE" to confirm'
          className="focus-ring mt-4 w-full rounded-lg border border-ink/15 px-4 py-2.5 text-sm"
        />
        <Button
          variant="secondary"
          className="mt-3 !border-red-500/40 !text-red-400 hover:!border-red-500"
          disabled={confirmText !== "DELETE" || deleting}
          onClick={handleDeleteAccount}
        >
          {deleting ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
    </div>
  );
}
