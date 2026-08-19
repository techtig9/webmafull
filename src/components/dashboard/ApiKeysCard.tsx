"use client";

import { useEffect, useState } from "react";
import { Key, Trash2, Copy, AlertTriangle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface ApiKeyEntry {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
}

/** Public API v1 key management — create, list, revoke. The raw key value
 * is shown exactly once, right after creation, and is never retrievable
 * again after that (only its hash is stored — see api-keys.ts). This
 * component is the only place in the whole app that ever sees a raw key
 * value in a network response. */
export function ApiKeysCard() {
  const toast = useToast();
  const [keys, setKeys] = useState<ApiKeyEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/api-keys")
      .then((r) => r.json())
      .then((data) => setKeys(data.keys ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function createKey() {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/account/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newKeyName }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't create the key.");
        return;
      }
      setKeys((prev) => [{ ...data.key, last_used_at: null }, ...prev]);
      setJustCreatedKey(data.key.rawKey);
      setNewKeyName("");
    } catch {
      toast.show("error", "Network error — key wasn't created.");
    } finally {
      setCreating(false);
    }
  }

  async function revokeKey(id: string) {
    setRevokingId(id);
    try {
      const res = await fetch("/api/account/api-keys/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId: id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast.show("error", data?.message ?? "Couldn't revoke the key.");
        return;
      }
      setKeys((prev) => prev.filter((k) => k.id !== id));
      toast.show("success", "Key revoked.");
    } catch {
      toast.show("error", "Network error — key wasn't revoked.");
    } finally {
      setRevokingId(null);
    }
  }

  function copyKey(value: string) {
    navigator.clipboard.writeText(value).then(() => toast.show("success", "Copied."));
  }

  return (
    <div className="glass-panel rounded-2xl p-6">
      <div className="flex items-center gap-2">
        <Key size={16} className="text-signal" />
        <h2 className="font-display font-bold">API keys</h2>
      </div>
      <p className="mt-1 text-sm text-ink/50">
        Read-only access to your own projects via <code>GET /api/v1/projects</code>. This is a first, deliberately
        small slice of a public API — one endpoint, no write access, no webhooks yet.
      </p>

      {justCreatedKey && (
        <div className="mt-4 rounded-xl border border-amber/40 bg-amber/[0.06] p-4">
          <div className="flex items-center gap-2 text-amber">
            <AlertTriangle size={14} />
            <p className="text-xs font-medium">Copy this now — you won&apos;t be able to see it again.</p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap rounded-lg bg-ink/[0.04] px-3 py-2 text-xs">
              {justCreatedKey}
            </code>
            <button
              onClick={() => copyKey(justCreatedKey)}
              className="focus-ring shrink-0 rounded-lg border border-ink/15 p-2 text-ink/60 hover:text-ink"
              aria-label="Copy key"
            >
              <Copy size={14} />
            </button>
          </div>
          <button onClick={() => setJustCreatedKey(null)} className="focus-ring mt-2 text-[11px] text-ink/40 hover:text-ink">
            Done — I&apos;ve saved it
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center gap-2">
        <input
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !creating && createKey()}
          placeholder='Key name (e.g. "CI pipeline")'
          disabled={creating}
          className="focus-ring min-w-0 flex-1 rounded-lg border border-ink/15 px-3 py-2 text-sm disabled:opacity-50"
        />
        <button
          onClick={createKey}
          disabled={creating || !newKeyName.trim()}
          className="focus-ring shrink-0 rounded-full bg-signal px-4 py-2 text-xs font-medium text-paper hover:bg-signal2 disabled:opacity-40"
        >
          {creating ? "Creating…" : "Create key"}
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {loading && <p className="text-xs text-ink/35">Loading…</p>}
        {!loading && keys.length === 0 && <p className="text-xs text-ink/35">No API keys yet.</p>}
        {keys.map((k) => (
          <div key={k.id} className="flex items-center justify-between rounded-lg border border-ink/10 px-3 py-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{k.name}</p>
              <p className="font-mono text-[11px] text-ink/40">
                {k.key_prefix}… · {k.last_used_at ? `used ${new Date(k.last_used_at).toLocaleDateString()}` : "never used"}
              </p>
            </div>
            <button
              onClick={() => revokeKey(k.id)}
              disabled={revokingId === k.id}
              className="focus-ring shrink-0 rounded-md p-1.5 text-ink/35 hover:text-red-500 disabled:opacity-40"
              aria-label={`Revoke ${k.name}`}
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
