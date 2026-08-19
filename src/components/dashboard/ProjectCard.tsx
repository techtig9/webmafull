"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreVertical, Pencil, Copy, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  archived: boolean;
  updated_at: string;
}

const statusStyle: Record<string, string> = {
  draft: "text-ink/40",
  ready: "text-signal",
  deployed: "text-signal2",
};

export function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleRename(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen(false);
    const name = window.prompt("Rename project", project.name);
    if (!name || name.trim() === project.name) return;
    setBusy(true);
    const res = await fetch("/api/projects/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, name: name.trim() }),
    });
    const data = await res.json();
    if (!res.ok) toast.show("error", data.message ?? "Couldn't rename that project.");
    else router.refresh();
    setBusy(false);
  }

  async function handleDuplicate(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen(false);
    setBusy(true);
    const res = await fetch("/api/projects/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    });
    const data = await res.json();
    if (!res.ok) toast.show("error", data.message ?? "Couldn't duplicate that project.");
    else {
      toast.show("success", "Project duplicated.");
      router.refresh();
    }
    setBusy(false);
  }

  async function handleArchiveToggle(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen(false);
    setBusy(true);
    const res = await fetch("/api/projects/archive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id, archived: !project.archived }),
    });
    const data = await res.json();
    if (!res.ok) toast.show("error", data.message ?? "Couldn't update that project.");
    else router.refresh();
    setBusy(false);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.preventDefault();
    setMenuOpen(false);
    if (!window.confirm(`Delete "${project.name}"? This can't be undone.`)) return;
    setBusy(true);
    const res = await fetch("/api/projects/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: project.id }),
    });
    const data = await res.json();
    if (!res.ok) toast.show("error", data.message ?? "Couldn't delete that project.");
    else {
      toast.show("success", "Project deleted.");
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <div className="group relative">
      <Link
        href={`/dashboard/generator?project=${project.id}`}
        className="glass-panel block rounded-xl p-5 transition-colors hover:border-signal/40"
      >
        <div className="flex items-center justify-between pr-6">
          <p className="font-medium">{project.name}</p>
          <span className={`font-mono text-xs uppercase ${statusStyle[project.status] ?? ""}`}>
            {project.status}
          </span>
        </div>
        <p className="mt-2 line-clamp-2 text-sm text-ink/50">{project.description}</p>
        <p className="mt-3 text-xs text-ink/30">Updated {new Date(project.updated_at).toLocaleDateString()}</p>
      </Link>

      <button
        onClick={(e) => {
          e.preventDefault();
          setMenuOpen((v) => !v);
        }}
        disabled={busy}
        className="focus-ring absolute right-4 top-4 rounded-md p-1 text-ink/40 hover:bg-ink/5 hover:text-ink"
        aria-label="Project actions"
      >
        <MoreVertical size={16} />
      </button>

      {menuOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
          <div className="glass-panel absolute right-4 top-10 z-20 w-40 overflow-hidden rounded-lg p-1 text-sm">
            <button
              onClick={handleRename}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-ink/5"
            >
              <Pencil size={14} /> Rename
            </button>
            <button
              onClick={handleDuplicate}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-ink/5"
            >
              <Copy size={14} /> Duplicate
            </button>
            <button
              onClick={handleArchiveToggle}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left hover:bg-ink/5"
            >
              {project.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
              {project.archived ? "Unarchive" : "Archive"}
            </button>
            <button
              onClick={handleDelete}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-red-500 hover:bg-red-500/10"
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
