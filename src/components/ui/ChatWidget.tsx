"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X, Send, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "👋 Hi, I'm the webma assistant. Trying to decide what kind of site to build, which template fits, or which plan makes sense? Ask me anything.",
};

/** The chat bubble icon — a speech bubble framing the same four-point spark used in
 * the logo mark, so the assistant reads as part of the product, not a bolted-on widget. */
function AssistantIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6 8a4 4 0 0 1 4-4h20a4 4 0 0 1 4 4v16a4 4 0 0 1-4 4H16l-7 6v-6H10a4 4 0 0 1-4-4V8Z"
        fill="#5B6CFF"
      />
      <path
        d="M20 12L22.2 17.2L27.5 19.5L22.2 21.8L20 27L17.8 21.8L12.5 19.5L17.8 17.2Z"
        fill="#F7F5F0"
      />
    </svg>
  );
}

export function ChatWidget() {
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session?.user);
    });
    return () => sub.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function send() {
    if (!input.trim() || sending) return;
    const next = [...messages, { role: "user" as const, content: input.trim() }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.slice(-10) }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setMessages((m) => [...m, { role: "assistant", content: data?.message ?? "Something went wrong — try again." }]);
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Network error — try again in a moment." }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="focus-ring fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-ink shadow-xl shadow-ink/20 transition-transform hover:scale-105"
        aria-label="Open webma assistant"
      >
        {open ? <X size={20} className="text-paper" /> : <AssistantIcon size={26} />}
      </button>

      {open && (
        <div className="glass-panel-strong reveal-in fixed bottom-24 right-6 z-50 flex h-[480px] w-[360px] flex-col overflow-hidden rounded-2xl">
          <div className="flex items-center gap-2 border-b border-ink/10 px-4 py-3">
            <AssistantIcon size={20} />
            <span className="font-display text-sm font-bold">webma assistant</span>
          </div>

          {authed === false ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
              <AssistantIcon size={36} />
              <p className="text-sm text-ink/70">
                Sign in to chat with the assistant — like every feature in webma, it's available once you have an account.
              </p>
              <div className="flex gap-2">
                <Link href="/login" className="focus-ring rounded-full border border-ink/15 px-4 py-1.5 text-xs hover:border-ink">
                  Log in
                </Link>
                <Link href="/signup" className="focus-ring rounded-full bg-signal px-4 py-1.5 text-xs text-paper hover:bg-signal2">
                  Sign up free
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.role === "user" ? "ml-auto bg-signal text-paper" : "bg-ink/[0.05] text-ink/85"
                    }`}
                  >
                    {m.content}
                  </div>
                ))}
                {sending && (
                  <div className="flex items-center gap-1.5 text-xs text-ink/40">
                    <Sparkles size={12} className="animate-pulse" /> thinking…
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 border-t border-ink/10 p-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  placeholder={authed === null ? "Loading…" : "Ask about templates, plans, or your site…"}
                  disabled={authed !== true || sending}
                  className="focus-ring flex-1 rounded-full border border-ink/15 px-3 py-2 text-sm disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={authed !== true || sending || !input.trim()}
                  className="focus-ring flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-signal text-paper hover:bg-signal2 disabled:opacity-40"
                  aria-label="Send"
                >
                  <Send size={14} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
