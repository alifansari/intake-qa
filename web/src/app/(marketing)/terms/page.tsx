import type { Metadata } from "next";
import Link from "next/link";
import {
  FOUNDER_EMAIL,
  LEGAL_ENTITY,
  LEGAL_DBA,
  LEGAL_LAST_UPDATED,
  LEGAL_GOVERNING_STATE,
} from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Terms of service | Intake QA",
  description: "The terms that govern use of Intake QA and the free Leak Audit.",
  alternates: { canonical: "/terms" },
};

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline py-6">
      <h2 className="font-display text-xl font-semibold text-ink">
        {n}. {title}
      </h2>
      <div className="mt-2 max-w-[72ch] space-y-3 text-ink-muted">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Legal</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink">Terms of Service</h1>
      <p className="mt-3 text-sm text-faint">Last updated {LEGAL_LAST_UPDATED}.</p>

      <p className="mt-6 max-w-[72ch] text-lg text-ink-muted">
        These terms govern your use of {LEGAL_DBA}, operated by {LEGAL_ENTITY}, including the free
        Leak Audit and the desk product. By using the service you agree to them. If you are
        agreeing on behalf of a law firm, you confirm you have authority to bind that firm.
      </p>

      <div className="mt-8">
        <Section n="1" title="What the service does">
          <p>
            {LEGAL_DBA}{" "}reviews a firm’s own intake calls, scores them against a fixed rubric,
            flags signable cases that did not sign, and drafts compliant follow-up messages for a
            person at the firm to approve. In the current pilot phase, nothing is sent to anyone
            without a human at the firm approving it first.
          </p>
        </Section>

        <Section n="2" title="The free Leak Audit">
          <p>
            The audit is offered free to qualifying firms. You send up to ten recent intake calls, we
            review them, and you keep the written report whether or not you ever work with us. The
            audit is a diagnostic review, not legal advice, and it does not create an
            attorney-client, agency, or fee-sharing relationship.
          </p>
        </Section>

        <Section n="3" title="Your responsibilities">
          <p>You are responsible for:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>having the right and any required consent to record the calls you send us, and the authority to share them;</li>
            <li>reviewing and approving every follow-up message before it is sent;</li>
            <li>your own professional, ethics, advertising, and consumer-protection obligations; and</li>
            <li>not sending us data you are not permitted to share.</li>
          </ul>
        </Section>

        <Section n="4" title="Fees and billing">
          <p>
            During the beta, the service is provided free of charge to admitted beta testers under
            the beta conditions described on the{" "}
            <Link href="/pricing" className="font-semibold text-accent hover:text-accent-hover">
              pricing page
            </Link>{" "}
            (NDA, call access, structured feedback). Paid plans, when they begin at launch, are a
            flat monthly subscription tiered by call volume. We never charge per case, per signed
            client, or as a share of any recovery. Subscriptions are billed through our payment
            processor, are month-to-month, and can be cancelled anytime, effective at the end of the
            current period.
          </p>
        </Section>

        <Section n="5" title="Compliance and human approval">
          <p>
            The service is built to be used under your supervision. It makes no legal judgments, and
            in pilot mode it sends nothing on its own. You and your counsel make the final call on
            consent, ethics, and whether any given message should go out. Our compliance approach is
            explained on the{" "}
            <Link href="/compliance" className="font-semibold text-accent hover:text-accent-hover">
              compliance page
            </Link>
            .
          </p>
        </Section>

        <Section n="6" title="Data and confidentiality">
          <p>
            We handle your data as described in the{" "}
            <Link href="/privacy" className="font-semibold text-accent hover:text-accent-hover">
              privacy policy
            </Link>
            . For a firm engagement, a data-processing agreement (DPA) is available and controls where
            it differs from these terms.
          </p>
        </Section>

        <Section n="7" title="Estimates are not guarantees">
          <p>
            Scores and flags are directional, and any estimated fee value is a range based on your own
            averages or named published sources. Nothing in the report is a prediction of case value,
            a promise of recovery, or legal advice. The service is provided on an &ldquo;as is&rdquo;
            basis to the fullest extent the law allows.
          </p>
        </Section>

        <Section n="8" title="Liability">
          <p>
            To the extent the law allows, neither party is liable for indirect, incidental, or
            consequential damages, and our total liability for any claim relating to the service is
            limited to the fees you paid us in the three months before the claim (or, during the free
            audit, is limited as the law allows). Nothing here limits liability that cannot be limited
            by law.
          </p>
        </Section>

        <Section n="9" title="Term and termination">
          <p>
            Either party may stop the engagement at any time. On termination we delete your data as
            described in the privacy policy, and any fees already paid for the current period are
            non-refundable except where the law provides otherwise.
          </p>
        </Section>

        <Section n="10" title="Governing law, changes, and contact">
          <p>
            These terms are governed by the laws of the State of {LEGAL_GOVERNING_STATE}. If we change
            them, we will update the date above and post the new version here. Questions? Email{" "}
            <a href={`mailto:${FOUNDER_EMAIL}`} className="font-semibold text-accent hover:text-accent-hover">
              {FOUNDER_EMAIL}
            </a>
            .
          </p>
        </Section>
      </div>

      <p className="mt-8 text-sm text-faint">
        This is a plain-language agreement for the pilot. Where a signed master services agreement,
        BAA, or DPA is in place, that executed document controls.
      </p>
    </div>
  );
}
