import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

// Tailwind's build-time scanner only detects literal class strings — a template
// literal like `text-${color}` would never generate real CSS, so the color has to
// be a fully-written class name here, not assembled at runtime.
const NUMBER_COLOR: Record<string, string> = {
  signal: "text-signal",
  signal2: "text-signal2",
  violet: "text-violet",
  amber: "text-amber",
  coral: "text-coral",
};

const FEATURES = [
  {
    title: "Type or speak your brief",
    body: "Describe the site's name and purpose in plain language — or say it out loud and let Gemini transcribe it.",
    color: "signal",
  },
  {
    title: "Guided follow-up questions",
    body: "webma asks a handful of quick questions — type, theme, color, style — with tap-to-pick options, not blank text boxes.",
    color: "signal2",
  },
  {
    title: "Full sections, generated",
    body: "Navbar, Hero, About, Services, Features, Footer, and anything else your description implies — built in React and Tailwind.",
    color: "violet",
  },
  {
    title: "Live, on every device",
    body: "Preview instantly on desktop, tablet, and mobile as the site is generated, before you touch a single line of code.",
    color: "amber",
  },
  {
    title: "Talk it into shape",
    body: "\"Make the hero copy shorter,\" \"switch to a cooler palette\" — describe a change in plain English and watch it apply, file by file.",
    color: "coral",
  },
  {
    title: "Edit the code directly",
    body: "Drop into a Monaco-powered editor with syntax highlighting, autosave, and full version history whenever you want finer control.",
    color: "signal",
  },
  {
    title: "Your own domain, real SEO",
    body: "Connect a custom domain, set the title, description, and social preview image — they ship in the actual exported and deployed code.",
    color: "signal2",
  },
  {
    title: "Never lose a version",
    body: "Every regeneration and restyle is saved. Browse your history and restore any earlier version without losing what came after.",
    color: "violet",
  },
  {
    title: "Ship it, from one screen",
    body: "Export as ZIP, a React project, or a Next.js project — or deploy straight to Vercel without leaving the dashboard.",
    color: "amber",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        eyebrow="How it works"
        title="From a sentence to a shipped website"
        description="Every part of the loop — describing, refining, previewing, exporting — happens in one place."
      />
      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 80}>
            <div className="lift-on-hover glass-panel h-full rounded-2xl p-6">
              <span className={`font-mono text-xs ${NUMBER_COLOR[f.color]}`}>{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-3 font-display text-lg font-bold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/60">{f.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
