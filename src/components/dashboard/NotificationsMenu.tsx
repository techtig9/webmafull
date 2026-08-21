"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, BellOff } from "lucide-react";

/** The bell previously had no onClick at all, and permanently rendered an
 * "unread" dot regardless of whether anything had actually happened —
 * visually implying notifications existed when none did. This makes the
 * button real: it opens, and shows an honest empty state rather than fake
 * content. There is deliberately no unread-dot here, since nothing in this
 * app currently generates a real notification event to be unread about —
 * a genuine notification-generating system (deploy finished, form
 * submission received, etc.) is real, separate, future scope, not
 * something to fake behind a working button. */
export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Notifications"
        className="relative rounded-xl p-2 text-white/45 hover:bg-white/[0.05] hover:text-white"
      >
        <Bell size={17} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] w-72 rounded-xl border border-white/[0.08] bg-[#0d111d] p-1.5 shadow-2xl">
          <div className="border-b border-white/[0.07] px-3 py-2.5">
            <p className="text-xs font-semibold text-white">Notifications</p>
          </div>
          <div className="flex flex-col items-center gap-2 px-3 py-8 text-center">
            <BellOff size={18} className="text-white/20" />
            <p className="text-[11px] text-white/35">No notifications yet.</p>
          </div>
        </div>
      )}
    </div>
  );
          }
