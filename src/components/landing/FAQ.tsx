"use client";

import { useState } from "react";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";

const ITEMS = [
  {
    q: "Do I need to know how to code?",
    a: "No. Describe your site in plain language and answer a few tap-to-pick questions — webma generates the whole thing. Full code access is there if you want to fine-tune it.",
  },
  {
    q: "Can I edit the site after it's generated?",
    a: "Yes, two ways: describe a change in plain English (\"make the hero shorter\") and it applies to the right file, or open the built-in code editor and make changes directly. Both autosave.",
  },
  {
    q: "What can I export?",
    a: "A ZIP file, a standalone React project, or a full Next.js project — each includes source code, assets, and a README. Export is always free, on every plan.",
  },
  {
    q: "Where can I deploy?",
    a: "One-click deploy to Vercel, straight from the dashboard — connect your own account in Settings so sites deploy under it, not ours.",
  },
  {
    q: "What happens when I run out of credits?",
    a: "Credits renew every billing cycle. If you run out before renewal, you can upgrade your plan or buy a credit top-up separately.",
  },
  {
    q: "Can I use my own domain?",
    a: "Yes, starting on the Starter plan — the number of custom domains you can connect scales with your plan, and SEO settings ship with the deployed site.",
  },
  {
    q: "Can I start from an existing website instead?",
    a: "Yes — paste a URL and webma generates a new site inspired by its structure and tone, with original copy, not a scrape.",
  },
  {
    q: "Can my team work on the same projects?",
    a: "Business plans include organizations — invite teammates by email and collaborate on the same projects together.",
  },
  {
    q: "Is my account secure?",
    a: "Every account can enable two-factor authentication from Settings, and every project's data is isolated at the database level so it's never visible to other accounts.",
  },
  {
    q: "What if I want a refund?",
    a: "New subscribers get a full refund within 7 days of their first payment, no questions asked. Reach out any time at techtig9@gmail.com.",
  },
];

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section id="faq" className="mx-auto max-w-3xl px-6 py-24">
      <SectionHeading align="center" eyebrow="FAQ" title="Questions, answered" />
      <div className="mt-10 divide-y divide-ink/10 border-t border-ink/10">
        {ITEMS.map((item, i) => (
          <div key={item.q}>
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="focus-ring flex w-full items-center justify-between gap-4 py-5 text-left"
              aria-expanded={open === i}
            >
              <span className="font-medium">{item.q}</span>
              <span
                className="font-mono text-signal transition-transform duration-300"
                style={{ transform: open === i ? "rotate(45deg)" : "rotate(0deg)" }}
              >
                +
              </span>
            </button>
            {open === i && (
              <p className="reveal reveal-in pb-5 text-sm leading-relaxed text-ink/60">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
