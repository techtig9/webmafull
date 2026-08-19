import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Terms of Service — webma" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="July 2026">
      <section>
        <h2 className="font-display font-bold text-ink">1. What webma is</h2>
        <p className="mt-2">
          webma is a service, built and operated by Techtig, that generates website code from a
          plain-language description using AI models (currently Google Gemini, with OpenAI as an
          automatic fallback). You can preview, edit, export, and deploy the generated code. These
          Terms govern your use of webma.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">2. Accounts</h2>
        <p className="mt-2">
          You need an account to use webma, created via email/password or Google sign-in. You&apos;re
          responsible for keeping your credentials secure and for activity on your account. You must
          be able to form a binding contract in your jurisdiction to create an account.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">3. Plans and credits</h2>
        <p className="mt-2">
          webma offers Free, Starter, Pro, and Business plans, each with a monthly credit allowance
          that AI actions (generation, editing, restyling, voice transcription) draw down. Credits
          reset each billing cycle and don&apos;t carry over. Exporting code and deploying to Vercel 
           never cost credits, regardless of plan. We reserve the right to change plan pricing,
          credit costs, or allowances with notice; changes apply from your next billing cycle, not
          retroactively.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">4. Billing</h2>
        <p className="mt-2">
          Paid plans are billed monthly in advance through Paddle.com, our payment provider and
          merchant of record. Paddle handles payment processing and applicable sales tax/VAT for
          your purchase. You can cancel anytime from your billing settings; cancellation takes effect
          at the end of your current billing period, and you keep access until then. Payments made
          are non-refundable except at our discretion or where required by law.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">5. Who owns what you generate</h2>
        <p className="mt-2">
          You own the code webma generates for you, and the content of any website you build with it,
          subject to the underlying AI provider&apos;s terms (Google Gemini / OpenAI) and to you not
          having used webma to generate content that infringes someone else&apos;s rights. We don&apos;t
          claim ownership over your generated sites. You&apos;re responsible for the accuracy, legality,
          and appropriateness of the description you provide and the site you publish.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">6. Acceptable use</h2>
        <p className="mt-2">You agree not to use webma to:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Generate content that is illegal, fraudulent, or infringes someone else&apos;s intellectual property</li>
          <li>Generate malware, phishing pages, or anything designed to deceive or harm visitors</li>
          <li>Abuse, scrape, or attempt to circumvent the credit system or rate limits</li>
          <li>Attempt to access other users&apos; accounts, projects, or data</li>
        </ul>
        <p className="mt-2">We can suspend or terminate accounts that violate this section.</p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">7. AI-generated content — no warranty of accuracy</h2>
        <p className="mt-2">
          Generated code and copy are produced by AI models and may contain errors, be imperfectly
          styled, or need editing before use. Review generated sites before publishing them, especially
          for accuracy of any factual claims.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">8. Third-party services</h2>
        <p className="mt-2">
          webma relies on third-party infrastructure: Supabase (database/auth), Google Gemini and
          OpenAI (generation), Paddle (billing), and Vercel(deployment, including your own
          connected account if you choose to link one). Their availability affects ours; we&apos;re not
          liable for their outages.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">9. Limitation of liability</h2>
        <p className="mt-2">
          webma is provided &quot;as is.&quot; To the maximum extent permitted by law, Techtig isn&apos;t liable
          for indirect, incidental, or consequential damages arising from your use of the service,
          including issues with generated code or content.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">10. Termination</h2>
        <p className="mt-2">
          You can delete your account at any time from Settings — this permanently deletes your
          account, projects, and subscription. We can suspend or terminate accounts that violate
          these Terms.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">11. Changes to these terms</h2>
        <p className="mt-2">
          We may update these Terms from time to time. Material changes will be communicated before
          they take effect.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">12. Contact</h2>
        <p className="mt-2">
          Questions about these Terms: <a href="mailto:techtig9@gmail.com" className="text-signal hover:underline">techtig9@gmail.com</a>
        </p>
      </section>
    </LegalPage>
  );
}
