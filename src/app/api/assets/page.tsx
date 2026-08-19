"use client";

import { useEffect, useRef, useState } from "react";
import { Upload, Copy, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Asset {
  id: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
  url: string;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetsPage() {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await fetch("/api/assets/list");
    const data = await res.json();
    setAssets(data.assets ?? []);
    setLoading(false);
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file next time
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/assets/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        toast.show("error", data.message ?? "Upload failed.");
        return;
      }
      toast.show("success", "Uploaded.");
      await load();
    } catch {
      toast.show("error", "Network error — try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(assetId: string) {
    if (!window.confirm("Delete this image? This can't be undone.")) return;
    const res = await fetch("/api/assets/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assetId }),
    });
    if (!res.ok) {
      const data = await res.json();
      toast.show("error", data.message ?? "Couldn't delete that asset.");
      return;
    }
    setAssets((prev) => prev.filter((a) => a.id !== assetId));
  }

  function handleCopy(url: string) {
    navigator.clipboard.writeText(url);
    toast.show("success", "Image URL copied — paste it into an AI edit instruction to use it.");
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">Assets</h1>
          <p className="mt-1 text-sm text-ink/50">
            Upload images to use in your generated websites — logos, photos, anything you want on a page.
          </p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="focus-ring flex items-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
          {uploading ? "Uploading…" : "Upload image"}
        </button>
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" onChange={handleFileSelect} className="hidden" />
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-ink/40">Loading…</p>
      ) : assets.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-ink/15 p-10 text-center">
          <p className="text-sm text-ink/50">No images yet — upload one to use it in your websites.</p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assets.map((asset) => (
            <div key={asset.id} className="glass-panel overflow-hidden rounded-xl">
              <div className="aspect-square bg-ink/5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt={asset.file_name} className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="truncate text-sm font-medium">{asset.file_name}</p>
                <p className="text-xs text-ink/40">{formatSize(asset.size_bytes)}</p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleCopy(asset.url)}
                    className="focus-ring flex flex-1 items-center justify-center gap-1 rounded-md border border-ink/15 py-1.5 text-xs hover:bg-ink/5"
                  >
                    <Copy size={12} /> Copy URL
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    className="focus-ring flex items-center justify-center rounded-md border border-ink/15 px-2 py-1.5 text-red-500 hover:bg-red-500/10"
                    aria-label="Delete"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
