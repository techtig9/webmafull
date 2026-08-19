"use client";

// Minimal, dependency-free toast system. Provided at the root layout so any
// client component can call useToast() — no prop drilling, no extra package.
import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, XCircle, Loader2, X } from "lucide-react";

type ToastKind = "success" | "error" | "loading";

interface ToastItem {
  id: string;
  kind: ToastKind;
  message: string;
}

interface ToastContextValue {
  show: (kind: ToastKind, message: string) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ICONS: Record<ToastKind, React.ReactNode> = {
  success: <CheckCircle2 size={16} className="text-signal2" />,
  error: <XCircle size={16} className="text-red-400" />,
  loading: <Loader2 size={16} className="animate-spin text-ink/60" />,
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (kind: ToastKind, message: string) => {
      const id = crypto.randomUUID();
      setItems((prev) => [...prev, { id, kind, message }]);
      if (kind !== "loading") {
        setTimeout(() => dismiss(id), 4500);
      }
      return id;
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ show, dismiss }}>
      {children}
      <div className="pointer-events-none fixed bottom-6 right-6 z-[100] flex flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            className="glass-panel-strong toast-enter pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm text-ink shadow-2xl"
          >
            {ICONS[t.kind]}
            <span className="max-w-xs">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="focus-ring ml-1 text-ink/40 hover:text-ink"
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
