import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

const TABS = [
  { href: "/admin", label: "Users" },
  { href: "/admin/subscriptions", label: "Subscriptions" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/feedback", label: "Feedback" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="glass-panel !rounded-none !border-x-0 !border-t-0 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Logo size={20} />
            </Link>
            <span className="rounded-full bg-signal px-2.5 py-0.5 font-mono text-xs text-paper">
              admin
            </span>
          </div>
          <nav className="flex gap-1">
            {TABS.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                className="focus-ring rounded-full px-4 py-1.5 text-sm text-ink/60 hover:bg-ink/5 hover:text-ink"
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
