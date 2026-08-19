"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, LayoutTemplate, Sparkles, Settings, CreditCard, UserRound, Users, Globe, ShieldCheck, MessageSquare, LayoutGrid, Image as ImageIcon, BarChart3 } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

const MAIN = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/projects", label: "Projects", icon: FolderKanban },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/generator", label: "AI Assistant", icon: Sparkles },
  { href: "/dashboard/domains", label: "Domains", icon: Globe },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/team", label: "Team", icon: Users },
];

const SECONDARY = [
  { href: "/dashboard/profile", label: "Profile", icon: UserRound },
  { href: "/dashboard/security", label: "Security", icon: ShieldCheck },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/feedback", label: "Feedback", icon: MessageSquare },
];

export function Sidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();
  const items = isAdmin ? [...MAIN, { href: "/admin", label: "Admin Panel", icon: LayoutGrid }] : MAIN;
  const link = (href: string, label: string, Icon: typeof LayoutDashboard) => {
    const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
    return <Link key={href} href={href} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition ${active ? "bg-violet/15 text-white shadow-inner" : "text-white/55 hover:bg-white/[0.05] hover:text-white"}`}>
      <Icon size={16} className={active ? "text-violet" : "text-white/40 group-hover:text-white/70"} />{label}
    </Link>;
  };

  return (
    <aside className="hidden w-[248px] shrink-0 border-r border-white/[0.07] bg-[#090c15]/95 md:flex md:flex-col">
      <div className="flex h-[72px] items-center border-b border-white/[0.07] px-6">
        <Link href="/" aria-label="Webma home"><Logo size={23} className="text-white" /></Link>
      </div>
      <div className="flex-1 px-3 py-5">
        <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Workspace</p>
        <nav className="space-y-1">{items.map(({ href, label, icon: Icon }) => link(href, label, Icon))}</nav>
        <p className="mt-7 px-3 pb-2 text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Account</p>
        <nav className="space-y-1">{SECONDARY.map(({ href, label, icon: Icon }) => link(href, label, Icon))}</nav>
      </div>
      <div className="m-3 rounded-2xl border border-violet/20 bg-gradient-to-br from-violet/15 to-signal/5 p-4">
        <div className="mb-2 flex items-center gap-2"><Sparkles size={15} className="text-violet" /><span className="text-xs font-semibold text-white">Build with AI</span></div>
        <p className="text-[11px] leading-relaxed text-white/45">Describe a change and Webma can work on your current project.</p>
        <Link href="/dashboard/generator" className="mt-3 flex items-center justify-center rounded-lg bg-violet px-3 py-2 text-xs font-semibold text-white hover:bg-signal">Open assistant</Link>
      </div>
    </aside>
  );
}
