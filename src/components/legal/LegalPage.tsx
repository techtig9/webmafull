import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/">
        <Logo />
      </Link>

      <div className="glass-panel mt-8 rounded-xl border border-amber/30 bg-amber/[0.06] p-4 text-sm text-amber">
        <strong>Draft, not legal advice.</strong> This page is a starting-point template, written to
        match webma&apos;s actual features — it has not been reviewed by a lawyer. Have qualified legal
        counsel review and adapt it (especially for your specific jurisdictions, tax setup, and any
        Paddle merchant-of-record terms) before relying on it for a real launch.
      </div>

      <h1 className="mt-8 font-display text-3xl font-bold">{title}</h1>
      <p className="mt-1 font-mono text-xs text-ink/40">Last updated: {updated}</p>

      <div className="prose-legal mt-8 space-y-6 text-sm leading-relaxed text-ink/75">{children}</div>
    </main>
  );
}
