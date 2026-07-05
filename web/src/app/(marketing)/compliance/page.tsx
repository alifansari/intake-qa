import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceGateDiagram } from "@/components/marketing/ComplianceGateDiagram";

export const metadata: Metadata = {
  title: "The compliance case for Intake QA (California)",
  description:
    "Built on California authority: runner/capper (B&P §6151–6152), flat-fee pricing and AB 931, Rules 7.2/7.3, confidentiality (1.18/1.6), vendor supervision (5.3), GenAI ethics (Formal Op. 512 + CA State Bar guidance), §632 recording, and TCPA.",
  alternates: { canonical: "/compliance" },
};

function Sec({ rule, title, children }: { rule: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline py-9">
      <p className="eyebrow">{rule}</p>
      <h2 className="mt-2 font-display text-2xl font-semibold text-ink text-balance">{title}</h2>
      <div className="mt-4 max-w-[72ch] space-y-4 text-ink-muted">{children}</div>
      <p className="mt-5 text-sm text-faint">Confirm with your own counsel — your firm makes the final call.</p>
    </section>
  );
}

export default function CompliancePage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">Compliance</p>
      <h1 className="mt-3 max-w-[26ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Written for your ethics counsel, in California terms.
      </h1>
      <p className="mt-5 max-w-[72ch] text-lg text-ink-muted">
        Forward this page to your ethics counsel. Every claim below maps to California authority and
        to something in the product you can inspect. Intake QA is a quality-control and follow-up
        tool your firm runs and supervises. It never contacts a stranger and never sends anything on
        its own.
      </p>

      <Sec rule="B&P §6151–§6152 · runner / capper" title="We don't find you clients. We help you answer the ones who already called.">
        <p>
          California Business &amp; Professions Code §6151–§6152 makes it unlawful to act as a
          &ldquo;runner or capper&rdquo; — a person or entity paid to act as an agent in the
          solicitation or procurement of business for a lawyer; §6154 voids any contract procured
          through one.
        </p>
        <p>
          Intake QA never solicits or procures new clients. It only helps your firm re-contact
          people who already called your firm — your own inbound prospective clients. It is
          quality control and internal follow-up, not an agent bringing you strangers.
        </p>
      </Sec>

      <Sec rule="Flat fee · California AB 931 (2025)" title="A fixed fee per recovered case — not a percentage, not per lead.">
        <p>
          Intake QA is paid a fixed fee per recovered case, the same whether the case settles for
          $10,000 or $1,000,000. It is not a percentage of any recovery and not a per-lead or
          referral fee.
        </p>
        <p>
          California AB 931 (signed October 10, 2025; applies to contracts entered on or after
          January 1, 2026) addresses fee-sharing and consumer legal funding, and carves out
          contracts that (1) use a flat-fee structure, (2) don&apos;t pay for referrals or lead
          generation, and (3) don&apos;t scale payment with the amount recovered (Holland &amp;
          Knight analysis, Sept. 2025). Our pricing sits inside all three conditions. AB 931 is
          under a constitutional challenge (Wisner Baum LLP v. Bonta, filed Nov. 2025); we frame
          flat-fee pricing as aligned with the direction of California law, not as
          &ldquo;AB 931 compliance.&rdquo;
        </p>
      </Sec>

      <Sec rule="CA Rules of Professional Conduct 7.2 &amp; 7.3" title="Responding to someone's own inquiry is not solicitation.">
        <p>
          Rule 7.2 bars a lawyer from giving anything of value for recommending the lawyer&apos;s
          services. Intake QA doesn&apos;t recommend your firm to anyone and isn&apos;t paid to
          refer.
        </p>
        <p>
          Rule 7.3 prohibits solicitation by live contact for pecuniary gain. The nuance that
          matters: a communication made in response to the prospective client&apos;s own inquiry is
          not a prohibited solicitation. Win-back texts go only to people who already called your
          firm — you&apos;re responding to an inbound inquiry, not soliciting a stranger. Written
          communications must honor a recipient&apos;s stated wish not to be contacted and must
          avoid intrusion, coercion, or harassment (Rule 7.3(b)); every draft includes an opt-out
          (&ldquo;Reply STOP&rdquo;) and human approval. We don&apos;t claim win-back SMS is
          categorically outside 7.3 — we give you the controls, and your counsel makes the call.
        </p>
        <div className="pt-2">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-ink-muted">
            The seven gates every message clears, in order
          </h3>
          <ComplianceGateDiagram />
        </div>
      </Sec>

      <Sec rule="CA Rules 1.18 &amp; 1.6 · confidentiality" title="Your callers' words are confidential prospective-client information.">
        <p>
          Intake calls are prospective-client information under Rule 1.18. We treat every uploaded
          call as confidential and process it only to provide the service. Your firm remains the
          party that owes the duty; we&apos;re built to help you keep it.
        </p>
      </Sec>

      <Sec rule="CA Rule 5.3 · supervising nonlawyer vendors" title="A nonlawyer service your firm supervises.">
        <p>
          Intake QA is a nonlawyer service under your supervision (Rule 5.3). The tool never contacts
          anyone autonomously; a person at your firm approves every send. The AI drafts — it does
          not decide who to contact or what your firm owes anyone.
        </p>
      </Sec>

      <Sec rule="ABA Formal Op. 512 · CA State Bar GenAI guidance" title="The AI drafts. A human at your firm verifies and sends.">
        <p>
          ABA Formal Opinion 512 (July 29, 2024) and the California State Bar&apos;s Practical
          Guidance for the Use of Generative Artificial Intelligence in the Practice of Law
          (Nov. 16, 2023) address competence (Rule 1.1) and confidentiality (Rule 1.6) when lawyers
          use AI. Intake QA is built for that posture: it drafts and scores, a person at your firm
          reviews and approves, and it makes no legal judgments and sends nothing on its own.
        </p>
      </Sec>

      <Sec rule="Penal Code §632 / §632.7 · call recording" title="You record the calls. We process the recordings you already made.">
        <p>
          California is an all-party-consent state (Penal Code §632; §632.7 for cell and cordless
          calls; Smith v. LoanMe, 2021). Intake QA processes calls your firm already recorded — we do
          not obtain consent for you, and your firm is responsible for having obtained it. Under
          Kearney v. Salomon Smith Barney (2006), telling callers at the outset that the call is
          recorded is sufficient. A disclosure pattern that works: &ldquo;This call is being recorded
          for quality assurance.&rdquo;
          {" "}
          {/* TODO(Ali): confirm the firm's own consent/disclosure process before relying on this in onboarding. */}
        </p>
      </Sec>

      <Sec rule="TCPA / SMS (2025–2026)" title="Texts go to your own prior callers, with opt-out, only after registration.">
        <p>
          The FCC&apos;s &ldquo;one-to-one consent&rdquo; rule was vacated by the Eleventh Circuit in
          Insurance Marketing Coalition v. FCC (Jan. 24, 2025) and repealed by the FCC, so that
          heightened lead-gen consent regime is not in force. The TCPA still requires prior express
          consent for certain autodialed or marketing texts, and revocation must be honored (FCC
          revocation rules effective April 11, 2025). Win-back texts go to your firm&apos;s own prior
          callers, include an opt-out, and send only after A2P 10DLC registration clears and a person
          at your firm approves. Your counsel should confirm your consent basis.
        </p>
      </Sec>

      <Sec rule="CCPA / CPRA" title="We act as your service provider — process only, never sell.">
        <p>
          Call recordings and transcripts may contain personal information under the CCPA/CPRA.
          Intake QA acts as your service provider: it processes the data only to provide the service
          and does not sell it.
          {" "}
          {/* TODO(Ali): confirm the exact "service provider" contract language exists in the DPA before publishing. */}
        </p>
      </Sec>

      <div className="mt-10 rounded-card border border-hairline bg-canvas p-5 text-sm text-ink-muted">
        This is not legal advice. Intake QA gives PI firms tools to run their own compliant
        follow-up; your firm and its counsel make the final call on ethics and consent.
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run your free Intake Quality Audit
        </Link>
        <Link href="/security" className="inline-flex rounded-pill border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:border-accent">
          See how your data is handled
        </Link>
      </div>
    </div>
  );
}
