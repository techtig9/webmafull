import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    credits: "3,000 credits/mo",
    blurb: "Generate and export one real site, on us.",
    features: ["1 full website generation", "Real React + Tailwind code", "Live preview", "Code export"],
  },
  {
    id: "starter",
    name: "Starter",
    price: "$12",
    foundingPrice: "$9.60",
    credits: "10,000 credits/mo",
    blurb: "For a first real project, full-stack.",
    features: ["Full-stack React/Next.js sites", "Generate from a URL", "AI editing + voice input", "SEO settings", "1 custom domain", "Deploy to Vercel"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$24",
    foundingPrice: "$19.20",
    credits: "30,000 credits/mo",
    blurb: "For freelancers shipping client sites.",
    features: ["Everything in Starter", "Priority generation", "5 custom domains", "Last 25 versions", "Two-factor authentication"],
    highlight: true,
  },
  {
    id: "business",
    name: "Business",
    price: "$49",
    foundingPrice: "$39.20",
    credits: "75,000 credits/mo",
    blurb: "For agencies running multiple builds.",
    features: ["Everything in Pro", "Team collaboration", "Unlimited custom domains", "Unlimited version history", "24/7 priority support"],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-24">
      <SectionHeading
        align="center"
        eyebrow="Founding member pricing — 20% off"
        title="Plans that scale with what you build"
        description="Join now and lock in 20% off every paid plan, for as long as you stay subscribed — prices go up once the founding window closes."
      />
      <div className="mt-14 grid gap-6 lg:grid-cols-4">
        {PLANS.map((p, i) => (
          <Reveal key={p.id} delay={i * 90}>
            <div
              className={`lift-on-hover glass-panel flex h-full flex-col rounded-2xl p-6 ${
                p.highlight ? "!border-signal/40 bg-signal/[0.06] shadow-lg shadow-signal/10" : ""
              }`}
            >
            <h3 className="font-display text-lg font-bold">{p.name}</h3>
            <p className="mt-1 text-sm text-ink/50">{p.blurb}</p>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold">
                {"foundingPrice" in p ? p.foundingPrice : p.price}
              </span>
              {p.id !== "free" && <span className="text-sm text-ink/40">/mo</span>}
            </div>
            {"foundingPrice" in p && (
              <p className="font-mono text-xs text-signal2">
                <span className="line-through text-ink/30">{p.price}/mo</span> 20% off, locked in
              </p>
            )}
            <p className="mt-1 font-mono text-xs text-ink/40">{p.credits}</p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2 text-ink/70">
                  <span className="text-signal2">✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Button
              href="/signup"
              variant={p.highlight ? "primary" : "secondary"}
              className="mt-6 w-full"
            >
              {p.id === "free" ? "Start free" : "Choose " + p.name}
            </Button>
            </div>
          </Reveal>
        ))}
      </div>
      <p className="mt-8 text-center text-xs text-ink/40">
        Annual billing available on every paid plan at a lower effective monthly rate. Extra credit top-ups can be purchased separately, anytime.
      </p>
    </section>
  );
}
