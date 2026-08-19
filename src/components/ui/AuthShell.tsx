import Link from "next/link";
import { Logo } from "@/components/ui/Logo";

export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <Link href="/">
          <Logo />
        </Link>
        <h1 className="mt-8 font-display text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-ink/50">{subtitle}</p>
        <div className="glass-panel mt-8 rounded-2xl p-6">{children}</div>
      </div>
    </main>
  );
}
