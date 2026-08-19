"use client";

import { useEffect, useRef, useState } from "react";
import { Code2, Eye, Redo2, Save, Settings2, Undo2, Sparkles } from "lucide-react";
import { DescribeStep } from "@/components/generator/DescribeStep";
import { LivePreview, type SelectedElement } from "@/components/generator/LivePreview";
import { SectionReorder } from "@/components/generator/SectionReorder";
import { LayersPanel } from "@/components/generator/LayersPanel";
import { GenerationProgress } from "@/components/generator/GenerationProgress";
import { QuickStylePanel } from "@/components/generator/QuickStylePanel";
import { AiImagePanel } from "@/components/generator/AiImagePanel";
import { PresenceIndicator } from "@/components/generator/PresenceIndicator";
import { consumeGenerationStream, type GenerationPhase } from "@/lib/generation-stream";
import { PageTabs } from "@/components/generator/PageTabs";
import { CodeEditor } from "@/components/generator/CodeEditor";
import { ExportBar } from "@/components/generator/ExportBar";
import { AIEditBar } from "@/components/generator/AIEditBar";
import { ThemeChangeBar } from "@/components/generator/ThemeChangeBar";
import dynamic from "next/dynamic";
import { deriveSections, resolvePages, type Page } from "@/lib/preview";
import type { FollowUpAnswers } from "@/lib/gemini";

const ProjectSettingsPanel = dynamic(
  () => import("@/components/generator/ProjectSettingsPanel").then((m) => m.ProjectSettingsPanel),
  { ssr: false, loading: () => <div className="p-4 text-sm text-ink/40">Loading settings…</div> }
);
import { useToast } from "@/components/ui/Toast";

type Stage = "describe" | "generating" | "result";
type EditorMode = "visual" | "code";
type Snapshot = { files: Record<string, string>; pages: Page[]; activeSlug: string };

interface InitialProject {
  projectId: string;
  name: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  files: Record<string, string>;
  sections: string[];
  pages: Page[];
}

function cloneFiles(files: Record<string, string>) { return { ...files }; }

export function GeneratorFlow({ initialProject }: { initialProject?: InitialProject | null }) {
  const toast = useToast();
  const [stage, setStage] = useState<Stage>(initialProject ? "result" : "describe");
  const [name, setName] = useState(initialProject?.name ?? "");
  const [description, setDescription] = useState(initialProject?.description ?? "");
  const [siteSeoTitle, setSiteSeoTitle] = useState(initialProject?.seoTitle ?? "");
  const [siteSeoDescription, setSiteSeoDescription] = useState(initialProject?.seoDescription ?? "");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [generationPhase, setGenerationPhase] = useState<GenerationPhase | null>(null);
  const [files, setFiles] = useState<Record<string, string>>(initialProject?.files ?? {});
  const [sections, setSections] = useState<string[]>(initialProject?.sections ?? []);
  const [pages, setPages] = useState<Page[]>(initialProject?.pages ?? []);
  const [activeSlug, setActiveSlug] = useState<string>(resolvePages(initialProject?.files ?? {}, initialProject?.pages ?? null)[0]?.slug ?? "index");
  const [projectId, setProjectId] = useState<string | null>(initialProject?.projectId ?? null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [showSettings, setShowSettings] = useState(false);
  const [activeFile, setActiveFile] = useState<string>(Object.keys(initialProject?.files ?? {})[0] ?? "");
  const [mode, setMode] = useState<EditorMode>("visual");
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSnapshot = useRef<string>("");

  const resolvedPages = resolvePages(files, pages.length > 0 ? pages : null);
  const activePage = resolvedPages.find((p) => p.slug === activeSlug) ?? resolvedPages[0];

  function snapshot(): Snapshot {
    return { files: cloneFiles(files), pages: [...resolvedPages], activeSlug };
  }

  function snapshotKey(s: Snapshot) { return JSON.stringify({ files: s.files, pages: s.pages, activeSlug: s.activeSlug }); }

  function pushHistory(next: Snapshot) {
    const key = snapshotKey(next);
    if (key === lastSnapshot.current) return;
    setHistory((prev) => [...prev.slice(-39), next]);
    setFuture([]);
    lastSnapshot.current = key;
  }

  function applySnapshot(next: Snapshot) {
    setFiles(cloneFiles(next.files));
    setPages(next.pages);
    setSections(deriveSections(next.files));
    setActiveSlug(next.activeSlug);
    setActiveFile(Object.keys(next.files)[0] ?? "");
  }

  function undo() {
    if (!history.length) return;
    const current = snapshot();
    const previous = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setFuture((f) => [...f.slice(-39), current]);
    applySnapshot(previous);
    lastSnapshot.current = snapshotKey(previous);
  }

  function redo() {
    if (!future.length) return;
    const current = snapshot();
    const next = future[future.length - 1];
    setFuture((f) => f.slice(0, -1));
    setHistory((h) => [...h.slice(-39), current]);
    applySnapshot(next);
    lastSnapshot.current = snapshotKey(next);
  }

  useEffect(() => {
    if (stage !== "result") return;
    const onKey = (event: KeyboardEvent) => {
      const modifier = event.ctrlKey || event.metaKey;
      if (!modifier) return;
      if (event.key.toLowerCase() === "z" && !event.shiftKey) { event.preventDefault(); undo(); }
      if (event.key.toLowerCase() === "z" && event.shiftKey) { event.preventDefault(); redo(); }
      if (event.key.toLowerCase() === "y") { event.preventDefault(); redo(); }
      if (event.key.toLowerCase() === "s") { event.preventDefault(); saveNow(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  async function saveNow() {
    if (!projectId) return;
    setSaveStatus("saving");
    try {
      const response = await fetch("/api/projects/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, files, pages: resolvedPages }),
      });
      if (!response.ok) throw new Error("save failed");
      setSaveStatus("saved");
      toast.show("success", "All changes saved.");
    } catch { setSaveStatus("idle"); toast.show("error", "Couldn't save your edits — check your connection."); }
  }

  function applyGenerated(data: any) {
    const nextFiles = data.files ?? {};
    setFiles(nextFiles); setSections(data.sections ?? deriveSections(nextFiles)); setPages(data.pages ?? []);
    setActiveSlug(data.pages?.[0]?.slug ?? "index"); setProjectId(data.projectId); setActiveFile(Object.keys(nextFiles)[0] ?? "");
    setHistory([]); setFuture([]); lastSnapshot.current = ""; setStage("result");
  }

  async function runGeneration(overrides?: { name?: string; description?: string; answers?: FollowUpAnswers }) {
    // Accepts optional overrides rather than only ever reading name/
    // description/answers from closure state, specifically because the new
    // structured describe form calls this synchronously right after
    // setName/setDescription/setAnswers in the same handler — React batches
    // those state updates, so this function's own closure would still see
    // the PREVIOUS render's stale values without an explicit override path.
    // The existing FollowUpStep call sites (onGenerate={runGeneration},
    // onSkip={runGeneration}) still work unchanged: they call this with no
    // arguments, after the user has already seen a real render with the
    // updated state, so reading from closure state there remains correct.
    const n = overrides?.name ?? name;
    const d = overrides?.description ?? description;
    const a = overrides?.answers ?? answers;
    const stageBeforeGenerating = stage;
    setGenerating(true); setNotice(null); setGenerationPhase(null);
    setStage("generating");
    try {
      const res = await fetch("/api/ai/generate-website", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, description: d, answers: a, projectId }) });
      if (res.status === 402 || res.status === 403) {
        const data = await res.json().catch(() => null);
        const message = data?.message ?? "Upgrade your plan to generate a website.";
        setNotice(message); toast.show("error", message); setStage(stageBeforeGenerating); return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        const message = data?.message ?? "Generation failed — your credits were refunded. Try again.";
        setNotice(message); toast.show("error", message); setStage(stageBeforeGenerating); return;
      }
      const data = await consumeGenerationStream(res.body, (phase) => setGenerationPhase(phase as GenerationPhase));
      applyGenerated(data); toast.show("success", "Your website is ready.");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error — check your connection and try again. No credits were charged.";
      setNotice(message); toast.show("error", message); setStage(stageBeforeGenerating);
    }
    finally { setGenerating(false); }
  }

  // The structured describe form already collects websiteType/style/
  // colorPreference directly (real FollowUpAnswers fields), so there's
  // nothing left for a follow-up-questions round trip to usefully ask —
  // skips straight to generation instead of the old
  // handleDescribeSubmit -> /api/ai/follow-up-questions -> FollowUpStep path.
  function handleStructuredSubmit(n: string, d: string, a: FollowUpAnswers) {
    setName(n); setDescription(d); setAnswers(a as Record<string, string>);
    runGeneration({ name: n, description: d, answers: a });
  }

  async function runUrlGeneration(n: string, url: string) {
    setName(n); setGenerating(true); setNotice(null);
    try {
      const res = await fetch("/api/ai/generate-from-url", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: n, url, answers: {} }) });
      const data = await res.json();
      if (res.status === 402 || res.status === 403) { setNotice(data.message); toast.show("error", data.message); return; }
      if (!res.ok) { const message = data.message ?? "Generation failed — your credits were refunded. Try again."; setNotice(message); toast.show("error", message); return; }
      applyGenerated(data); toast.show("success", "Your website is ready.");
    } catch { const message = "Network error — check your connection and try again. No credits were charged."; setNotice(message); toast.show("error", message); }
    finally { setGenerating(false); }
  }

  function handleFileChange(path: string, value: string) {
    if (!saveTimeout.current) pushHistory(snapshot());
    setFiles((prev) => {
      const updated = { ...prev, [path]: value };
      if (projectId) {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        setSaveStatus("saving");
        saveTimeout.current = setTimeout(async () => {
          try {
            const response = await fetch("/api/projects/save", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projectId, files: updated, pages: resolvedPages }) });
            if (!response.ok) throw new Error("Autosave failed");
            setSaveStatus("saved");
          } catch { setSaveStatus("idle"); toast.show("error", "Couldn't save your edits — check your connection."); }
        }, 1200);
      }
      return updated;
    });
  }

  function handleAIResult(updatedFiles: Record<string, string>) {
    pushHistory(snapshot());
    setFiles(updatedFiles); setSections(deriveSections(updatedFiles)); setSaveStatus("saved");
  }

  function handleElementSelect(el: SelectedElement | null) {
    setSelectedElement(el);
    if (el?.file && el.file !== activeFile) setActiveFile(el.file);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {notice && <div className="toast-enter mb-4 rounded-lg border border-amber/30 bg-amber/10 px-4 py-3 text-sm text-amber">{notice}</div>}

      {stage === "describe" && <div className="reveal-in flex flex-1 items-center"><DescribeStep onSubmit={handleStructuredSubmit} onSubmitUrl={runUrlGeneration} submitting={generating} /></div>}
      {stage === "generating" && <div className="reveal-in flex flex-1 items-center"><GenerationProgress phase={generationPhase} /></div>}

      {stage === "result" && (
        <div className="reveal-in flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.07] bg-[#0b0f1c] px-3 py-2.5 shadow-lg">
            <div className="flex items-center gap-1">
              <button onClick={undo} disabled={!history.length} className="focus-ring rounded-lg p-2 text-white/35 hover:bg-white/[0.05] disabled:opacity-25" title="Undo"><Undo2 size={15} /></button>
              <button onClick={redo} disabled={!future.length} className="focus-ring rounded-lg p-2 text-white/35 hover:bg-white/[0.05] disabled:opacity-25" title="Redo"><Redo2 size={15} /></button>
              <span className="mx-1 h-5 w-px bg-ink/10" />
              <button onClick={() => setMode("visual")} className={`focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${mode === "visual" ? "bg-violet text-white" : "text-white/40 hover:bg-white/[0.05]"}`}><Eye size={13} /> Visual</button>
              <button onClick={() => setMode("code")} className={`focus-ring flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs ${mode === "code" ? "bg-violet text-white" : "text-white/40 hover:bg-white/[0.05]"}`}><Code2 size={13} /> Code</button>
            </div>
            <div className="flex items-center gap-2">
              <PresenceIndicator projectId={projectId} />
              <span className="hidden font-mono text-[10px] text-ink/35 sm:inline">{saveStatus === "saving" ? "Saving…" : saveStatus === "saved" ? "Saved" : "Unsaved"}</span>
              <button onClick={saveNow} disabled={!projectId || saveStatus === "saving"} className="focus-ring flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 hover:border-violet/30 disabled:opacity-40"><Save size={12} /> Save</button>
              {projectId && <button onClick={() => setShowSettings((v) => !v)} className="focus-ring flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-white/70 hover:border-violet/30"><Settings2 size={12} /> {showSettings ? "Hide settings" : "Settings"}</button>}
            </div>
          </div>

          {showSettings && projectId && <div className="reveal-in max-h-[45vh] overflow-auto"><ProjectSettingsPanel projectId={projectId} pages={resolvedPages} files={files} siteSeoTitle={siteSeoTitle || name} siteSeoDescription={siteSeoDescription || description} onSiteSeoChange={(t, d) => { setSiteSeoTitle(t); setSiteSeoDescription(d); }} onLockedAction={setNotice} onPagesChange={setPages} onVersionRestored={(restoredFiles, restoredPages) => { pushHistory(snapshot()); setFiles(restoredFiles); setSections(deriveSections(restoredFiles)); setPages(restoredPages ?? []); setActiveSlug((restoredPages ?? [])[0]?.slug ?? "index"); setActiveFile(Object.keys(restoredFiles)[0] ?? ""); }} /></div>}

          <PageTabs projectId={projectId} pages={resolvedPages} activeSlug={activeSlug} onActiveSlugChange={(slug) => { setSelectedElement(null); setActiveSlug(slug); }} onPagesChange={(next) => { pushHistory(snapshot()); setPages(next); }} onFilesChange={(next) => { pushHistory(snapshot()); setFiles(next); }} />

          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-hidden xl:grid-cols-[minmax(0,1fr)_300px]">
            <div className="min-h-0">
              {mode === "visual" ? (
                <LivePreview files={files} sections={activePage?.sections ?? sections} selected={selectedElement} onSelect={handleElementSelect} onNavigate={(path) => { const target = resolvedPages.find((p) => p.path === path); if (target) setActiveSlug(target.slug); }} />
              ) : (
                <CodeEditor files={files} onChange={handleFileChange} active={activeFile} onActiveChange={setActiveFile} pages={resolvedPages} />
              )}
            </div>

            <aside className="min-h-0 overflow-auto rounded-2xl border border-white/[0.07] bg-[#0b0f1c] p-4">
              <div className="mb-4 flex items-center gap-2"><Sparkles size={15} className="text-signal" /><span className="font-display text-sm font-semibold">Webma AI</span></div>
              {selectedElement ? (
                <div className="mb-4 rounded-xl border border-signal/20 bg-signal/[0.05] p-3">
                  <p className="font-mono text-[10px] uppercase tracking-wide text-signal">Selected element</p>
                  <p className="mt-1 font-medium">{selectedElement.tag}{selectedElement.text ? ` · ${selectedElement.text}` : ""}</p>
                  <p className="mt-1 text-xs text-ink/45">Tell Webma what you want changed. It will keep unrelated parts intact.</p>
                </div>
              ) : (
                <div className="mb-4 rounded-xl border border-dashed border-ink/10 p-3 text-xs text-ink/45">Click an element in the preview to select it, then ask AI to change it.</div>
              )}
              {selectedElement && (
                <div className="mb-4 space-y-4">
                  <QuickStylePanel
                    projectId={projectId}
                    files={files}
                    selectedElement={selectedElement}
                    onDirectPatch={handleFileChange}
                    onApplied={handleAIResult}
                    onLockedAction={setNotice}
                  />
                  <AiImagePanel
                    projectId={projectId}
                    files={files}
                    selectedElement={selectedElement}
                    onDirectPatch={handleFileChange}
                    onApplied={handleAIResult}
                    onLockedAction={setNotice}
                  />
                </div>
              )}
              {mode === "visual" && activePage && activePage.sections.length > 0 && (
                <div className="mb-4">
                  <SectionReorder
                    projectId={projectId}
                    slug={activePage.slug}
                    sections={activePage.sections}
                    onReorder={(nextSections) => {
                      pushHistory(snapshot());
                      const nextPages = resolvedPages.map((p) =>
                        p.slug === activeSlug ? { ...p, sections: nextSections } : p
                      );
                      setPages(nextPages);
                    }}
                  />
                </div>
              )}
              {mode === "visual" && activePage && activePage.sections.length > 0 && (
                <div className="mb-4">
                  <LayersPanel sections={activePage.sections} files={files} onSelect={handleElementSelect} />
                </div>
              )}
              {activeFile && <p className="mb-2 font-mono text-[10px] text-ink/35">Target file: {activeFile}</p>}
              <AIEditBar projectId={projectId} activeFile={activeFile} files={files} selectedElement={selectedElement} onApplied={handleAIResult} onLockedAction={setNotice} />
              <div className="mt-3"><ThemeChangeBar projectId={projectId} onApplied={handleAIResult} onLockedAction={setNotice} /></div>
            </aside>
          </div>

          <ExportBar projectId={projectId} onLockedAction={setNotice} />
        </div>
      )}
    </div>
  );
}
