"use client";

import { Bell, ChevronDown, Search, Sparkles } from "lucide-react";

export function Topnav({ name, plan, creditsRemaining }: { name: string; plan: string; creditsRemaining: number }) {
  return (
    <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between border-b border-white/[0.07] bg-[#090c15]/90 px-5 backdrop-blur-xl lg:px-7">
      <div className="hidden items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5 sm:flex">
        <Search size={15} className="text-white/30" />
        <input aria-label="Search" placeholder="Search projects, templates…" className="w-52 bg-transparent text-sm text-white outline-none placeholder:text-white/25" />
        <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] text-white/25">⌘ K</kbd>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-3 py-1.5 text-[11px] text-violet sm:flex"><Sparkles size={12} />{Number.isFinite(creditsRemaining) ? `${creditsRemaining.toLocaleString()} credits` : "Unlimited"}</div>
        <div className="hidden rounded-full border border-white/[0.07] px-3 py-1.5 text-[11px] capitalize text-white/50 sm:block">{plan}</div>
        <button className="relative rounded-xl p-2 text-white/45 hover:bg-white/[0.05] hover:text-white"><Bell size={17} /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-violet" /></button>
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-1.5"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-signal text-xs font-bold text-white">{name.slice(0,1).toUpperCase()}</div><ChevronDown size={13} className="text-white/30" /></div>
      </div>
    </header>
  );
}
