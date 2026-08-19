import { Reveal } from "@/components/ui/Reveal";

export function About() {
  return (
    <section id="about" className="mx-auto max-w-3xl px-6 py-24 text-center">
      <Reveal>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-signal mb-5">About us</p>
        <blockquote className="font-accent italic text-2xl font-medium leading-snug text-balance md:text-3xl">
          Techtig — An AI development agency that builds intelligent, scalable, and modern digital
          solutions. We specialize in AI-powered websites, SaaS platforms, AI chatbots, business
          automation, custom web applications, eCommerce solutions, UI/UX design, and digital
          marketing — helping businesses innovate, automate, and grow.
        </blockquote>
        <p className="mt-8 text-sm text-ink/50">
          webma is a product built and maintained by Techtig.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2 font-mono text-xs text-ink/50">
          <span>Fiverr / Upwork / Freelancer: techtig</span>
          <span>Facebook: techtig</span>
          <span>Instagram: @techtig9</span>
        </div>
      </Reveal>
    </section>
  );
}
