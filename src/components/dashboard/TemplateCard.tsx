"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ImageOff, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export function TemplateCard({
  id,
  name,
  tierRequired,
  thumbnail,
  locked,
}: {
  id: string;
  name: string;
  tierRequired: string;
  thumbnail: string | null;
  locked: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  async function handleUse() {
    if (locked || loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/templates/use", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId: id }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        toast.show("error", data?.message ?? "Couldn't use that template.");
        setLoading(false);
        return;
      }
      router.push(`/dashboard/generator?project=${data.projectId}`);
    } catch {
      toast.show("error", "Network error — couldn't use that template.");
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleUse}
      disabled={locked || loading}
      className={`glass-panel relative flex aspect-[4/3] flex-col justify-end overflow-hidden rounded-xl text-left ${
        locked ? "cursor-not-allowed opacity-50" : "hover:!border-signal/40"
      }`}
    >
      {thumbnail && !imageFailed ? (
        // unoptimized, deliberately: next/image's remotePatterns allowlist
        // (next.config.mjs) only covers *.supabase.co today, and thumbnails
        // could plausibly be hosted elsewhere depending on how templates
        // get seeded — an unlisted host wouldn't just skip optimization,
        // it would throw and crash the whole page. unoptimized sidesteps
        // both the crash risk and the optimization pipeline, which a small,
        // pre-sized template preview image doesn't meaningfully need anyway.
        <Image
          src={thumbnail}
          alt={`${name} preview`}
          fill
          unoptimized
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-signal/10 to-violet/10">
          <ImageOff size={20} className="text-ink/20" />
        </div>
      )}

      <div className="relative z-10 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 pt-8">
        <p className="font-medium text-white">{name}</p>
        <p className="font-mono text-xs uppercase text-white/50">{tierRequired}</p>
      </div>

      {locked && (
        <span className="absolute right-3 top-3 z-10 text-white/70">
          <Lock size={14} />
        </span>
      )}
      {loading && (
        <span className="absolute right-3 top-3 z-10 text-white/70">
          <Loader2 size={14} className="animate-spin" />
        </span>
      )}
    </button>
  );
}
