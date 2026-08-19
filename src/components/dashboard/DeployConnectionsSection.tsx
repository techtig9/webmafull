"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Link2, Unlink } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Connection {
  provider: "vercel";
  provider_account_email: string | null;
  created_at: string;
}

export function DeployConnectionsSection() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [connection, setConnection] = useState<Connection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    fetch("/api/deploy-oauth/status")
      .then((r) => r.json())
      .then((data) => setConnection((data.connections ?? []).find((c: Connection) => c.provider === "vercel") ?? null));

    const connected = searchParams.get("connected");
    const error = searchParams.get("error");
    if (connected) toast.show("success", `${connected} connected — your sites will deploy under your own account.`);
    if (error) toast.show("error", "Couldn't connect Vercel. It may not be configured yet — see .env.example.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function disconnect() {
    setDisconnecting(true);
    try {
      await fetch("/api/deploy-oauth/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "vercel" }),
      });
      setConnection(null);
      toast.show("success", "Vercel disconnected.");
    } catch {
      toast.show("error", "Network error — disconnect didn't complete.");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <h2 className="font-display font-bold">Deploy connection</h2>
      <p className="mt-1 text-sm text-ink/50">Connect your own Vercel account so your sites deploy under it, not Techtig&apos;s.</p>
      <div className="mt-4 flex items-center justify-between rounded-lg border border-ink/10 px-4 py-2.5">
        <div className="flex items-center gap-2 text-sm">
          <span>Vercel</span>
          {connection && <span className="font-mono text-[11px] text-signal2">connected</span>}
        </div>
        {connection ? (
          <button
            onClick={disconnect}
            disabled={disconnecting}
            className="focus-ring flex items-center gap-1.5 text-xs text-red-500 hover:underline disabled:opacity-50"
          >
            <Unlink size={12} /> {disconnecting ? "Disconnecting…" : "Disconnect"}
          </button>
        ) : (
          <a href="/api/deploy-oauth/vercel/authorize" className="focus-ring flex items-center gap-1.5 text-xs text-signal hover:underline">
            <Link2 size={12} /> Connect
          </a>
        )}
      </div>
    </div>
  );
                                                                   }
