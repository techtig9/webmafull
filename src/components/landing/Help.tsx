import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const SECTIONS = [
  {
    title: "How it works",
    items: [
      "You describe the website you want — by typing or speaking — including its name and purpose.",
      "webma's AI asks a few quick follow-up questions (website type, theme, color preference, style) with selectable options, so you're picking rather than typing everything out.",
      "The AI generates a complete, responsive website — Navbar, Hero, About, Services, Features, Footer, and any extra sections your description implies — built with React and Tailwind CSS.",
      "You review it instantly in the live preview, on desktop, tablet, or mobile.",
    ],
  },
  {
    title: "How to use it",
    items: [
      "Sign up (or log in with Google) and go to AI Generator in your dashboard.",
      "Enter your website's name and a description of what it's for.",
      "Answer the AI's short follow-up questions (or skip and let it choose sensible defaults).",
      "Click Generate Website and watch your site build in the live preview.",
      "Fine-tune it in the built-in code editor if you want to adjust anything directly.",
      "Export the code (ZIP, React, or Next.js project) or deploy straight to Vercel  — all from one screen.",
    ],
  },
  {
    title: "What it provides",
    items: [
      "A complete, ready-to-deploy website generated from a plain-language description — no coding required, but full code access if you want it.",
      "Live preview across devices, a Monaco-powered code editor, version history, and one-click deployment.",
      "A library of ready-made templates and themes across categories like Business, Portfolio, Restaurant, Travel, Education, Agency, Startup, Healthcare, and Real Estate.",
    ],
  },
];

export function Help() {
  return (
    <section id="help" className="border-y border-ink/10 bg-ink/[0.02] py-24">
      <div className="mx-auto max-w-5xl px-6">
        <SectionHeading eyebrow="Help center" title="Everything you need to know" />
        <div className="mt-12 grid gap-10 md:grid-cols-3">
          {SECTIONS.map((s, si) => (
            <Reveal key={s.title} delay={si * 100}>
              <h3 className="font-display text-lg font-bold">{s.title}</h3>
              <ol className="mt-4 space-y-3">
                {s.items.map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-ink/65">
                    <span className="font-mono text-xs text-signal">{i + 1}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
