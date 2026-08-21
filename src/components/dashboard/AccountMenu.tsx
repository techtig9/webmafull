"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, LogOut, Settings, UserRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Was previously a plain <div> with no click handler at all — looked like
 * a dropdown trigger (had a chevron icon) but did nothing. This is the real
 * thing: account details, settings, sign out. */
export function AccountMenu({ name, email }: { name: string; email: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="focus-ring flex items-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.03] px-2 py-1.5 hover:border-white/[0.15]"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet to-signal text-xs font-bold text-white">
          {name.slice(0, 1).toUpperCase()}
        </div>
        <ChevronDown size={13} className={`text-white/30 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-56 rounded-xl border border-white/[0.08] bg-[#0d111d] p-1.5 shadow-2xl">
          <div className="border-b border-white/[0.07] px-3 py-2.5">
            <p className="truncate text-xs font-semibold text-white">{name}</p>
            <p className="truncate text-[11px] text-white/35">{email}</p>
          </div>
          <div className="py-1">
            <Link href="/dashboard/profile" onClick={() => setOpen(false)} className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white">
              <UserRound size={14} /> Account details
            </Link>
            <Link href="/dashboard/settings" onClick={() => setOpen(false)} className="focus-ring flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-white/70 hover:bg-white/[0.05] hover:text-white">
              <Settings size={14} /> Settings
            </Link>
          </div>
          <div className="border-t border-white/[0.07] py-1">
            <button
              onClick={handleLogout}
              disabled={signingOut}
              className="focus-ring flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 disabled:opacity-50"
            >
              <LogOut size={14} /> {signingOut ? "Logging out…" : "Log out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
