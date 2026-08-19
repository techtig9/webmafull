import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const CATEGORIES = [
  { name: "Business", color: "bg-signal" },
  { name: "Portfolio", color: "bg-signal2" },
  { name: "Restaurant", color: "bg-amber" },
  { name: "Travel", color: "bg-coral" },
  { name: "Education", color: "bg-violet" },
  { name: "Agency", color: "bg-signal" },
  { name: "Startup", color: "bg-signal2" },
  { name: "Healthcare", color: "bg-amber" },
  { name: "Real Estate", color: "bg-coral" },
];

export function Templates() {
  return (
    <section id="templates" className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        eyebrow="Starting points"
        title="A template for whatever you're building"
        description="Every category below ships with multiple themes — or skip templates entirely and generate from scratch."
      />
      <div className="mt-12 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {CATEGORIES.map((c, i) => (
          <Reveal key={c.name} delay={(i % 3) * 60}>
            <div className="lift-on-hover glass-panel group relative aspect-[4/3] overflow-hidden rounded-xl p-5 transition-colors hover:border-signal/40">
              <div className="flex h-full flex-col justify-between">
                <div className="flex gap-1.5">
                  <span className={`h-1.5 w-6 rounded-full ${c.color} opacity-70`} />
                  <span className="h-1.5 w-3 rounded-full bg-ink/10" />
                </div>
                <span className="font-display font-bold">{c.name}</span>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
