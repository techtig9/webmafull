"use client";

import { useState } from "react";
import { Plus, X, Pencil, ChevronLeft, ChevronRight, Check, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import type { Page } from "@/lib/preview";

export function PageTabs({
  projectId,
  pages,
  activeSlug,
  onActiveSlugChange,
  onPagesChange,
  onFilesChange,
}: {
  projectId: string | null;
  pages: Page[];
  activeSlug: string;
  onActiveSlugChange: (slug: string) => void;
  onPagesChange: (pages: Page[]) => void;
  onFilesChange: (files: Record<string, string>) => void;
}) {
  const toast = useToast();
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [adding, setAdding] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [newPageDescription, setNewPageDescription] = useState("");
  const [submittingNewPage, setSubmittingNewPage] = useState(false);
  const [busySlug, setBusySlug] = useState<string | null>(null);

  async function submitRename(slug: string) {
    if (!projectId || !editName.trim()) {
      setEditingSlug(null);
      return;
    }
    setBusySlug(slug);
    try {
      const res = await fetch("/api/projects/rename-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, slug, name: editName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show("error", data.message ?? "Couldn't rename that page.");
        return;
      }
      onPagesChange(data.pages);
    } catch {
      toast.show("error", "Network error — rename didn't complete.");
    } finally {
      setBusySlug(null);
      setEditingSlug(null);
    }
  }

  async function deletePage(slug: string) {
    if (!projectId) return;
    if (!window.confirm("Delete this page? This can't be undone.")) return;
    setBusySlug(slug);
    try {
      const res = await fetch("/api/projects/delete-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, slug }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.show("error", data.message ?? "Couldn't delete that page.");
        return;
      }
      onFilesChange(data.files);
      onPagesChange(data.pages);
      if (activeSlug === slug) onActiveSlugChange(data.pages[0]?.slug ?? "index");
      toast.show("success", "Page deleted.");
    } catch {
      toast.show("error", "Network error — delete didn't complete.");
    } finally {
      setBusySlug(null);
    }
  }

  async function movePage(slug: string, direction: -1 | 1) {
    if (!projectId) return;
    const index = pages.findIndex((p) => p.slug === slug);
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= pages.length) return;
    const reordered = [...pages];
    [reordered[index], reordered[newIndex]] = [reordered[newIndex], reordered[index]];
    onPagesChange(reordered);
    try {
      const res = await fetch("/api/projects/reorder-pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, orderedSlugs: reordered.map((p) => p.slug) }),
      });
      const data = await res.json();
      if (!res.ok) {
        onPagesChange(pages);
        toast.show("error", data.message ?? "Couldn't reorder pages.");
      }
    } catch {
      onPagesChange(pages);
      toast.show("error", "Network error — reorder didn't complete.");
    }
  }

  async function submitNewPage() {
    if (!projectId || !newPageName.trim() || !newPageDescription.trim()) return;
    setSubmittingNewPage(true);
    try {
      const res = await fetch("/api/ai/generate-new-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, pageName: newPageName.trim(), pageDescription: newPageDescription.trim() }),
      });
      const data = await res.json();
      if (res.status === 402 || res.status === 403) {
        toast.show("error", data.message ?? "Upgrade your plan to add pages.");
        return;
      }
      if (!res.ok) {
        toast.show("error", data.message ?? "Couldn't create that page.");
        return;
      }
      onFilesChange(data.files);
      onPagesChange(data.pages);
      onActiveSlugChange(data.pages[data.pages.length - 1].slug);
      setNewPageName("");
      setNewPageDescription("");
      setAdding(false);
      toast.show("success", "Page added.");
    } catch {
      toast.show("error", "Network error — page wasn't created.");
    } finally {
      setSubmittingNewPage(false);
    }
  }

  if (!projectId) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-ink/10 px-1 py-2">
      {pages.map((page, i) => (
        <div
          key={page.slug}
          className={`group flex shrink-0 items-center gap-0.5 rounded-full py-1 pl-3 pr-1 font-mono text-xs transition-colors ${
            activeSlug === page.slug ? "bg-signal text-paper" : "border border-ink/15 text-ink/60 hover:border-ink"
          }`}
        >
          {editingSlug === page.slug ? (
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitRename(page.slug)}
              onBlur={() => submitRename(page.slug)}
              className="w-20 rounded bg-white/20 px-1 text-xs text-inherit outline-none"
            />
          ) : (
            <button onClick={() => onActiveSlugChange(page.slug)} className="focus-ring">
              {page.name}
            </button>
          )}
          {busySlug === page.slug ? (
            <Loader2 size={11} className="ml-1 animate-spin" />
          ) : (
            <span className="ml-0.5 flex items-center opacity-0 transition-opacity group-hover:opacity-100">
              <button onClick={() => movePage(page.slug, -1)} disabled={i === 0} aria-label="Move left" className="p-0.5 disabled:opacity-30">
                <ChevronLeft size={11} />
              </button>
              <button
                onClick={() => movePage(page.slug, 1)}
                disabled={i === pages.length - 1}
                aria-label="Move right"
                className="p-0.5 disabled:opacity-30"
              >
                <ChevronRight size={11} />
              </button>
              <button
                onClick={() => {
                  setEditingSlug(page.slug);
                  setEditName(page.name);
                }}
                aria-label="Rename"
                className="p-0.5"
              >
                <Pencil size={11} />
              </button>
              {pages.length > 1 && (
                <button onClick={() => deletePage(page.slug)} aria-label="Delete page" className="p-0.5">
                  <X size={11} />
                </button>
              )}
            </span>
          )}
        </div>
      ))}

      {adding ? (
        <div className="flex shrink-0 items-center gap-1.5 rounded-full border border-ink/15 px-2 py-1">
          <input
            autoFocus
            value={newPageName}
            onChange={(e) => setNewPageName(e.target.value)}
            placeholder="Page name"
            className="w-20 rounded bg-transparent text-xs outline-none"
          />
          <input
            value={newPageDescription}
            onChange={(e) => setNewPageDescription(e.target.value)}
            placeholder="What's on it?"
            className="w-32 rounded bg-transparent text-xs outline-none"
          />
          <button
            onClick={submitNewPage}
            disabled={submittingNewPage || !newPageName.trim() || !newPageDescription.trim()}
            className="focus-ring rounded-full bg-signal p-1 text-paper disabled:opacity-40"
            aria-label="Create page"
          >
            {submittingNewPage ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
          </button>
          <button onClick={() => setAdding(false)} aria-label="Cancel" className="p-1 text-ink/40">
            <X size={11} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="focus-ring flex shrink-0 items-center gap-1 rounded-full border border-dashed border-ink/25 px-2.5 py-1.5 font-mono text-xs text-ink/50 hover:border-ink hover:text-ink"
        >
          <Plus size={11} /> Add page
        </button>
      )}
    </div>
  );
          }
