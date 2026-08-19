"use client";

import { useRef, useState } from "react";
import { ArrowRight, ChevronDown, Link2, Mic, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { buildEnrichedDescription } from "@/lib/structured-form";
import type { FollowUpAnswers } from "@/lib/gemini";

const EXAMPLES = [
  "Modern digital agency called Nova with a dark, premium look",
  "Restaurant website with menu, reservations and location",
  "Personal portfolio for a product designer with case studies",
];

// websiteType/style/colorPreference map directly onto real FollowUpAnswers
// fields (gemini.ts) — every option below flows straight into the actual
// generation prompt, not a cosmetic-only selector.
const WEBSITE_TYPES = ["Agency", "Business", "Portfolio", "Restaurant", "E-commerce", "Blog", "Startup", "Personal"];
const STYLES = ["Modern", "Minimal", "Bold", "Playful", "Elegant", "Classic"];
const COLOR_PREFERENCES = ["Blue", "Purple", "Green", "Black & white", "Warm", "Custom"];
const PAGE_COUNTS = ["1-2", "3-4", "5+"];

function Dropdown({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block text-[10px] font-medium text-white/40">
      {label}
      <div className="relative mt-1.5">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="saas-input appearance-none pr-8 text-xs"
        >
          <option value="">Any</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <ChevronDown size={12} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
      </div>
    </label>
  );
}

export function DescribeStep({
  onSubmit,
  onSubmitUrl,
  submitting,
}: {
  onSubmit: (name: string, description: string, answers: FollowUpAnswers) => void;
  onSubmitUrl: (name: string, url: string) => void;
  submitting: boolean;
}) {
  const toast = useToast();
  const [mode, setMode] = useState<"describe" | "url">("describe");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<BlobPart[]>([]);

  // Website Type / Style / Color Preference / Pages — the four fields shown
  // in the reference create-website screen. Submitting skips the separate
  // AI follow-up-questions round trip entirely (FollowUpStep) rather than
  // asking again for information already collected right here.
  const [websiteType, setWebsiteType] = useState("");
  const [style, setStyle] = useState("");
  const [colorPreference, setColorPreference] = useState("");
  const [pages, setPages] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [targetAudience, setTargetAudience] = useState("");
  const [primaryCta, setPrimaryCta] = useState("");

  async function startRecording() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.show("error", "Couldn't access your microphone — check permissions and try again.");
      return;
    }
    const recorder = new MediaRecorder(stream);
    chunks.current = [];
    recorder.ondataavailable = (e) => chunks.current.push(e.data);
    recorder.onstop = async () => {
      setTranscribing(true);
      const blob = new Blob(chunks.current, { type: "audio/webm" });
      const base64 = await blobToBase64(blob);
      try {
        const res = await fetch("/api/ai/transcribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ audio: base64, mimeType: "audio/webm" }),
        });
        const data = await res.json();
        if (res.ok && data.text) setDescription((d) => (d ? `${d} ${data.text}` : data.text));
        else if (!res.ok) toast.show("error", data.message ?? "Couldn't transcribe that — try typing instead.");
      } catch {
        toast.show("error", "Network error — transcription failed.");
      } finally {
        setTranscribing(false);
        stream.getTracks().forEach((t) => t.stop());
      }
    };
    recorder.start();
    mediaRecorder.current = recorder;
    setRecording(true);
  }
  function stopRecording() {
    mediaRecorder.current?.stop();
    setRecording(false);
  }

  function handleSubmit() {
    const enriched = buildEnrichedDescription({ description, pages, targetAudience, primaryCta });
    onSubmit(name, enriched, { websiteType, style, colorPreference });
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet/10 text-violet">
          <Sparkles size={21} />
        </div>
        <h1 className="font-display text-3xl font-bold tracking-tight">What do you want to build?</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-white/40">
          Describe your website in detail and Webma&apos;s AI will take care of the rest.
        </p>
      </div>

      <div className="saas-card overflow-hidden">
        <div className="flex border-b border-white/[0.07] p-1.5">
          <button onClick={() => setMode("describe")} className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold ${mode === "describe" ? "bg-white/[0.07] text-white" : "text-white/35"}`}>Describe with AI</button>
          <button onClick={() => setMode("url")} className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-semibold ${mode === "url" ? "bg-white/[0.07] text-white" : "text-white/35"}`}>Generate from URL</button>
        </div>

        {mode === "url" ? (
          <div className="p-6 lg:p-8">
            <h2 className="font-display text-lg font-semibold">Use a reference website</h2>
            <p className="mt-1 text-xs text-white/35">Webma uses the reference for structure and inspiration and generates original content.</p>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="text-xs text-white/45">Website name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bloom & Co." className="saas-input mt-2" /></label>
              <label className="text-xs text-white/45">Reference URL<input value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://example.com" className="saas-input mt-2" /></label>
            </div>
            <Button onClick={() => onSubmitUrl(name, sourceUrl)} disabled={!name || !sourceUrl || submitting} className="mt-6 w-full">{submitting ? "Fetching & generating…" : "Generate from URL"}<Link2 size={16} /></Button>
          </div>
        ) : (
          <div className="p-6 lg:p-8">
            <div className="grid gap-6 lg:grid-cols-[1fr_260px]">
              <div>
                <label className="text-xs font-medium text-white/45">Website name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Nova Agency" className="saas-input mt-2" /></label>
                <label className="mt-5 block text-xs font-medium text-white/45">
                  Describe your website
                  <div className="relative mt-2">
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} placeholder="Create a modern website for a digital marketing agency called Nova. Include a strong hero, services, case studies, testimonials and contact section…" className="saas-input resize-none pr-12 leading-6" />
                    <button type="button" onClick={recording ? stopRecording : startRecording} className={`absolute bottom-3 right-3 rounded-lg p-2 ${recording ? "bg-red-500/10 text-red-400" : "bg-violet/10 text-violet"}`} title="Use voice">{recording ? <Square size={14} /> : <Mic size={14} />}</button>
                  </div>
                </label>
                <div className="mt-3 flex items-center justify-between text-[10px] text-white/25">
                  <span>{transcribing ? "Transcribing your voice…" : "Tip: include pages, style, audience and your main CTA."}</span>
                  <span>{description.length}/2000</span>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Dropdown label="Website type" value={websiteType} options={WEBSITE_TYPES} onChange={setWebsiteType} />
                  <Dropdown label="Style" value={style} options={STYLES} onChange={setStyle} />
                  <Dropdown label="Color preference" value={colorPreference} options={COLOR_PREFERENCES} onChange={setColorPreference} />
                  <Dropdown label="Pages" value={pages} options={PAGE_COUNTS} onChange={setPages} />
                </div>

                <button
                  type="button"
                  onClick={() => setShowAdvanced((v) => !v)}
                  className="focus-ring mt-4 flex items-center gap-1 text-[11px] font-medium text-white/40 hover:text-white/70"
                >
                  <ChevronDown size={12} className={`transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                  Advanced options
                </button>
                {showAdvanced && (
                  <div className="mt-3 grid gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 sm:grid-cols-2">
                    <label className="text-[10px] font-medium text-white/40">Target audience<input value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)} placeholder="e.g. small business owners" className="saas-input mt-1.5 text-xs" /></label>
                    <label className="text-[10px] font-medium text-white/40">Primary call to action<input value={primaryCta} onChange={(e) => setPrimaryCta(e.target.value)} placeholder="e.g. Book a call" className="saas-input mt-1.5 text-xs" /></label>
                  </div>
                )}

                <Button onClick={handleSubmit} disabled={!name || !description || submitting} className="mt-5 w-full">{submitting ? "Generating…" : "Generate Website"}<ArrowRight size={16} /></Button>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.16em] text-white/25">Try an example</p>
                <div className="mt-3 space-y-2">{EXAMPLES.map((x) => <button key={x} onClick={() => setDescription(x)} className="w-full rounded-xl border border-white/[0.07] bg-white/[0.025] p-3 text-left text-xs leading-5 text-white/45 hover:border-violet/30 hover:text-white/70">{x}</button>)}</div>
                <div className="mt-5 rounded-xl border border-violet/15 bg-violet/[0.06] p-3 text-[11px] leading-5 text-white/40"><span className="font-semibold text-violet">No need to be technical.</span> Webma can infer sections, navigation, responsive behavior and a design system from your brief.</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
