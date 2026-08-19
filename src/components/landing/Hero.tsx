"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Check, Eye, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";

const PROMPTS = [
  "A modern website for a digital marketing agency called Nova",
  "A cozy neighborhood bakery with online ordering",
  "A bold portfolio for a freelance architect",
];
const BUILD_STEPS = ["Understanding your request", "Planning website structure", "Generating content", "Designing responsive pages", "Optimizing for devices"];

export function Hero() {
  const [promptIndex, setPromptIndex] = useState(0); const [typed, setTyped] = useState(""); const [step, setStep] = useState(0);
  useEffect(() => { if (typed.length < PROMPTS[promptIndex].length) { const t=setTimeout(()=>setTyped(PROMPTS[promptIndex].slice(0,typed.length+1)),22); return()=>clearTimeout(t);} const t=setTimeout(()=>setStep(1),500); return()=>clearTimeout(t); },[typed,promptIndex]);
  useEffect(() => { if (step>0 && step<BUILD_STEPS.length) { const t=setTimeout(()=>setStep(s=>s+1),350); return()=>clearTimeout(t);} if(step===BUILD_STEPS.length){const t=setTimeout(()=>{setTyped("");setStep(0);setPromptIndex(i=>(i+1)%PROMPTS.length)},1400);return()=>clearTimeout(t);} },[step]);
  return <section className="relative overflow-hidden">
    <div className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-violet/10 blur-3xl" />
    <div className="relative mx-auto grid max-w-7xl gap-14 px-5 pb-20 pt-20 lg:grid-cols-[.9fr_1.1fr] lg:items-center lg:px-8 lg:pb-28 lg:pt-28">
      <Reveal><div className="inline-flex items-center gap-2 rounded-full border border-violet/20 bg-violet/10 px-3 py-1.5 text-xs font-medium text-violet"><Sparkles size={12}/> AI website builder for everyone</div>
        <h1 className="mt-6 max-w-2xl font-display text-5xl font-bold leading-[.98] tracking-[-.04em] text-white md:text-7xl">Create a website <span className="bg-gradient-to-r from-violet via-signal to-signal2 bg-clip-text text-transparent">with AI.</span></h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-white/50">Describe your idea and Webma designs, generates and helps you publish a professional website — without starting from a blank canvas.</p>
        <div className="mt-8 flex flex-wrap gap-3"><Button href="/signup">Create your website <ArrowRight size={16}/></Button><Button href="#features" variant="secondary"><Eye size={16}/> See how it works</Button></div>
        <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/35"><span className="flex items-center gap-1.5"><Check size={13} className="text-signal2"/> AI-powered</span><span className="flex items-center gap-1.5"><Check size={13} className="text-signal2"/> Visual editing</span><span className="flex items-center gap-1.5"><Check size={13} className="text-signal2"/> Responsive preview</span><span className="flex items-center gap-1.5"><Check size={13} className="text-signal2"/> Publish when ready</span></div>
      </Reveal>
      <Reveal delay={150}><div className="relative rounded-[26px] border border-white/10 bg-[#0b0f1c] p-3 shadow-2xl shadow-violet/10">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-3 py-3"><div className="flex gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-white/15"/><i className="h-2.5 w-2.5 rounded-full bg-white/15"/><i className="h-2.5 w-2.5 rounded-full bg-white/15"/></div><span className="font-mono text-[10px] text-white/25">webma / builder</span><span className="rounded-md bg-signal px-2 py-1 text-[9px] font-semibold">Live</span></div>
        <div className="grid gap-3 p-3 md:grid-cols-[.7fr_1.3fr]"><div className="rounded-xl border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-violet">Your prompt</p><div className="mt-3 min-h-[100px] text-sm leading-6 text-white/70">{typed}<span className="animate-pulse text-violet">▍</span></div><div className="mt-5 space-y-2">{BUILD_STEPS.map((s,i)=><div key={s} className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-[10px] transition ${i<step?"bg-signal2/10 text-signal2":"text-white/20"}`}><span className={`h-1.5 w-1.5 rounded-full ${i<step?"bg-signal2":"bg-white/15"}`}/>{s}{i<step&&<Check size={11} className="ml-auto"/>}</div>)}</div></div>
          <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-white"><div className="flex h-7 items-center border-b border-black/5 px-3"><span className="text-[8px] font-semibold text-black/40">NOVA</span><span className="ml-auto text-[7px] text-black/30">Home · Services · About · Contact</span></div><div className="relative min-h-[360px] bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-7 text-white"><span className="text-[9px] uppercase tracking-[.25em] text-violet-300">Digital growth studio</span><h2 className="mt-8 max-w-xs text-4xl font-bold leading-none">We build brands that grow.</h2><p className="mt-4 max-w-xs text-xs leading-5 text-white/55">A generated responsive website preview appears here before you publish.</p><button className="mt-6 rounded-md bg-violet px-4 py-2 text-[10px] font-semibold">Get started</button><div className="absolute bottom-0 right-0 h-2/3 w-1/2 bg-gradient-to-t from-violet/20 to-transparent"/></div></div></div>
      </div></Reveal>
    </div>
  </section>;
}
