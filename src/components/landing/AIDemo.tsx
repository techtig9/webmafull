import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

export function AIDemo() {
  return (
    <section className="relative border-y border-ink/10 bg-gradient-to-b from-signal/[0.07] via-transparent to-signal2/[0.05] py-24 text-ink">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            eyebrow="Try it"
            title="Your first website is three prompts away"
            description="Sign up, describe what you're building, answer a few quick questions — the generator does the rest."
          />
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {[
            { step: "01", label: "Describe", body: '"A yoga studio in Islamabad, calm and earthy"' },
            { step: "02", label: "Answer 4 quick questions", body: "Type, theme, color, style — tap, don't type." },
            { step: "03", label: "Watch it build", body: "Full site, live in the preview, in under a minute." },
          ].map((s, i) => (
            <Reveal key={s.step} delay={i * 100}>
              <div className="lift-on-hover glass-panel h-full rounded-xl p-6">
                <span className="font-mono text-xs text-signal2">{s.step}</span>
                <h3 className="mt-3 font-display font-bold">{s.label}</h3>
                <p className="mt-2 text-sm text-ink/60">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal delay={300}>
          <div className="mt-10">
            <Button href="/signup" variant="primary">
              Generate your website
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
