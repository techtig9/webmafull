"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

// Uses Supabase Auth's built-in TOTP MFA (auth.mfa.*) — no third-party MFA
// service needed, Supabase already implements the enrollment/challenge/verify flow.
export function MfaSection() {
  // A lazy useState initializer, not a plain `createClient()` call at the top
  // of the component (the convention used everywhere else in this codebase,
  // and a fine one — the client itself is cheap to create and stateless
  // enough that recreating it every render doesn't cause bugs there). This
  // component specifically needs a client with a STABLE identity across
  // renders, since refreshStatus below is memoized with useCallback and
  // needs a dependency that doesn't change every render to actually be
  // stable — the real fix for the exhaustive-deps warning this file had,
  // not just adding a dependency that would make the effect refire on every
  // render instead of running once on mount as intended.
  const [supabase] = useState(() => createClient());
  const toast = useToast();
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const refreshStatus = useCallback(async () => {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error) return;
    const totp = data.totp.find((f) => f.status === "verified");
    setEnrolled(!!totp);
    setFactorId(totp?.id ?? null);
  }, [supabase]);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  async function startEnrollment() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp" });
      if (error) {
        toast.show("error", error.message);
        return;
      }
      if (data.type !== "totp") return;
      setFactorId(data.id);
      if (data.type === "totp") setQrCode(data.totp.qr_code);
    } finally {
      setBusy(false);
    }
  }

  async function confirmEnrollment() {
    if (!factorId || code.length !== 6) return;
    setBusy(true);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) {
        toast.show("error", challengeError.message);
        return;
      }
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) {
        toast.show("error", "Incorrect code — check your authenticator app and try again.");
        return;
      }
      toast.show("success", "Two-factor authentication enabled.");
      setQrCode(null);
      setCode("");
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    if (!factorId) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) {
        toast.show("error", error.message);
        return;
      }
      toast.show("success", "Two-factor authentication disabled.");
      setFactorId(null);
      await refreshStatus();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold">Two-factor authentication</h2>
          <p className="mt-1 text-sm text-ink/50">
            {enrolled ? "Enabled — an authenticator app is required at login." : "Add an extra layer of security to your account."}
          </p>
        </div>
        {enrolled === true && (
          <Button variant="secondary" onClick={disable} disabled={busy} className="!border-red-500/40 !text-red-400">
            <ShieldOff size={14} /> Disable
          </Button>
        )}
        {enrolled === false && !qrCode && (
          <Button variant="secondary" onClick={startEnrollment} disabled={busy}>
            <ShieldCheck size={14} /> Enable
          </Button>
        )}
      </div>

      {qrCode && (
        <div className="mt-4 border-t border-ink/10 pt-4">
          <p className="text-sm text-ink/60">Scan this with an authenticator app (Google Authenticator, 1Password, Authy), then enter the 6-digit code it shows.</p>
          {/* Supabase returns the QR code as an inline SVG data URI — not a
          remote URL, so next/image's optimization (deferred loading, format
          conversion, bandwidth savings) has nothing to actually do here; the
          data is already fully embedded in the page with no separate
          network fetch to optimize. unoptimized is the honest setting for
          that, not a workaround — and width/height are required explicitly
          since Next can't reliably infer intrinsic dimensions from a data
          URI the way it can from a real image file. */}
          <Image
            src={qrCode}
            alt="MFA QR code"
            width={160}
            height={160}
            unoptimized
            className="my-4 rounded-lg border border-ink/10"
          />
          <div className="flex gap-2">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="focus-ring w-32 rounded-lg border border-ink/15 px-3 py-2 text-center font-mono text-sm tracking-widest"
            />
            <Button onClick={confirmEnrollment} disabled={busy || code.length !== 6}>
              Confirm
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
