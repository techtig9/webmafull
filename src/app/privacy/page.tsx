import { LegalPage } from "@/components/legal/LegalPage";

export const metadata = { title: "Privacy Policy — webma" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="July 2026">
      <section>
        <h2 className="font-display font-bold text-ink">1. What we collect</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Account info:</strong> name, email, and (if you sign in with Google) your Google profile info.</li>
          <li><strong>Content you provide:</strong> website descriptions, follow-up answers, uploaded voice recordings (processed for transcription, not stored as audio), generated code and its version history, SEO settings, and any custom domains you connect.</li>
          <li><strong>Billing info:</strong> handled directly by Paddle, our payment processor — we don&apos;t see or store your card details ourselves.</li>
          <li><strong>Usage data:</strong> which features you use and how many credits you spend, kept in a credit ledger and an audit log of security-relevant account events (logins, plan changes, deletions).</li>
          <li><strong>If you connect Vercel:</strong> an access token allowing us to deploy on your behalf, until you disconnect it.</li>
        </ul>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">2. How we use it</h2>
        <p className="mt-2">To operate webma: authenticate you, generate and store your websites, process payments, enforce plan limits, provide customer support, and maintain security (including the audit log). We don&apos;t sell your data.</p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">3. Who we share it with</h2>
        <p className="mt-2">Only the processors needed to run the service:</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>Supabase</strong> — hosts our database and handles authentication.</li>
          <li><strong>Google Gemini and OpenAI</strong> — process your website descriptions and voice recordings to generate content. Your prompts may be cached (as a task+prompt hash, not linked to your identity) to avoid re-billing identical requests.</li>
          <li><strong>Paddle</strong> — processes payments and, as merchant of record, handles applicable sales tax/VAT. See Paddle&apos;s own privacy policy for how they handle payment data.</li>
          <li><strong>Vercel</strong> — host deployed sites, either under our platform account or yours if you&apos;ve connected one.</li>
        </ul>
        <p className="mt-2">We don&apos;t share your data with anyone else, except where required by law.</p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">4. Your rights</h2>
        <p className="mt-2">
          You can view and update your profile info from your account settings. You can permanently
          delete your account — including all projects, subscription data, and connected
          integrations — at any time from Settings; this is irreversible. If you&apos;re in a
          jurisdiction with statutory data rights (GDPR, CCPA, or similar), you may also have a right
          to request a copy of your data or object to certain processing — contact us to exercise
          these.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">5. Data retention</h2>
        <p className="mt-2">
          We keep your account and project data for as long as your account is active. Audit log
          entries (security-relevant events) are retained separately for accountability purposes even
          after related records change. Deleting your account removes your projects, subscription,
          and connections; some records may be retained where we&apos;re legally required to (e.g.
          payment records for tax purposes, handled by Paddle).
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">6. Security</h2>
        <p className="mt-2">
          We use row-level security so your data is only ever accessible to your own account (or an
          administrator, for support purposes) at the database level, encrypted connections
          throughout, and optional two-factor authentication you can enable from Settings.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">7. Cookies</h2>
        <p className="mt-2">
          We use essential cookies for authentication (session management via Supabase Auth). We
          don&apos;t currently use tracking or advertising cookies.
        </p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">8. Changes to this policy</h2>
        <p className="mt-2">We may update this policy from time to time; material changes will be communicated before they take effect.</p>
      </section>

      <section>
        <h2 className="font-display font-bold text-ink">9. Contact</h2>
        <p className="mt-2">
          Questions or data requests: <a href="mailto:techtig9@gmail.com" className="text-signal hover:underline">techtig9@gmail.com</a>
        </p>
      </section>
    </LegalPage>
  );
}
