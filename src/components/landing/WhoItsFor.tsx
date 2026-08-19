import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const AUDIENCES = [
  {
    tag: "Freelancers",
    color: "border-signal/30 bg-signal/[0.05]",
    dot: "bg-signal",
    body: "Turn a client call into a live preview before the call ends. Generate, restyle, and hand off a real Next.js project — not a mockup they have to wait on.",
  },
  {
    tag: "Agencies",
    color: "border-violet/30 bg-violet/[0.05]",
    dot: "bg-violet",
    body: "Spin up a workspace, invite your team, and manage every client site's domain, SEO, and deploy status from one dashboard instead of a dozen tabs.",
  },
  {
    tag: "Small businesses",
    color: "border-signal2/30 bg-signal2/[0.05]",
    dot: "bg-signal2",
    body: "Describe your business in plain language and get a site that actually looks like it was designed for you — connect your domain and you're live the same day.",
  },
  {
    tag: "Indie hackers",
    color: "border-coral/30 bg-coral/[0.05]",
    dot: "bg-coral",
    body: "Skip the landing-page yak-shave. Generate it, export the code, and keep building your actual product — you own everything you get.",
  },
];

export function WhoItsFor() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        eyebrow="Built for"
        title="Whoever's building the site, not just the code"
        description="webma fits differently depending on who's using it — here's how."
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2">
        {AUDIENCES.map((a, i) => (
          <Reveal key={a.tag} delay={i * 90}>
            <div className={`lift-on-hover rounded-2xl border p-6 ${a.color}`}>
              <div className="flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${a.dot}`} />
                <span className="font-display font-bold">{a.tag}</span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-ink/65">{a.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
