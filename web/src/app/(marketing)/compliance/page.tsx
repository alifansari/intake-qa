import type { Metadata } from "next";
import Link from "next/link";
import { ComplianceGateDiagram } from "@/components/marketing/ComplianceGateDiagram";
import { ACCOUNTABLE_PARTY_LINE, CTA_PRIMARY } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "The compliance case for Intake QA (California)",
  description:
    "Built on California authority: runner/capper and outcome-decoupled pricing (B&P §§6151–6152, SB 37), Rules 7.2/7.3 solicitation, confidentiality (1.18/1.6), vendor supervision (5.3), GenAI ethics (CA State Bar guidance + ABA Formal Op. 512), §632 recording, and the current TCPA posture.",
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

      <Sec rule="B&P §§6151–6152 · runner / capper · SB 37 (2026)" title="Our fee is flat and monthly. It is never tied to whether you sign or recover a case.">
        <p>
          This is the design decision that matters most. California Business &amp; Professions Code
          §6151 defines a &ldquo;runner or capper&rdquo; as a person or entity acting{" "}
          <em>for consideration</em> as an agent for a lawyer &ldquo;in the solicitation or
          procurement of business.&rdquo; §6152 prohibits that arrangement. A fee paid to a
          non-lawyer that rises or falls with whether a case is signed, recovered, or won can be
          characterized as exactly that kind of payment.
        </p>
        <p>
          So we don&apos;t structure our fee that way. Intake QA charges a flat monthly subscription
          to analyze your calls. It does not change whether you sign zero cases or fifty. Because
          our compensation is not tied to procuring or recovering any case, it cannot fairly be
          characterized as payment to an agent for soliciting or procuring clients under §§6151–6152.
          You pay us for analysis, the same way you pay your answering service or your CRM.
        </p>
        <p>
          The stakes here rose in 2026. §6153 makes capping a crime — &ldquo;punishable, upon a first
          conviction, by imprisonment in a county jail for not more than one year or by a fine not
          exceeding fifteen thousand dollars ($15,000), or by both.&rdquo; SB 37 (Umberg), Chapter
          645, Statutes of 2025, effective January 1, 2026, added a civil private right of action:
          &ldquo;statutory damages of a minimum of five thousand dollars ($5,000) up to a maximum of
          one hundred thousand dollars ($100,000) per violation, or three times the amount of actual
          damages, whichever is larger,&rdquo; plus attorney&apos;s fees. SB 37 does not contain a
          stand-alone ban on per-case vendor pricing; that conduct is reached through the §§6151–6152
          capping framework, now backed by this private right of action. Flat monthly pricing keeps
          the question from arising.
        </p>
        <p>
          The same logic governs our guarantee. The Intake Quality Audit is free, and the $25,000
          find-it-free guarantee attaches to a <em>diagnostic threshold and the first paid month</em>
          — not to any recovery. It triggers on estimated value <em>identified</em> in your own
          calls; if the audit doesn&apos;t surface at least $25,000, we won&apos;t pitch a
          subscription, and if you start one anyway your first month is free. Because nothing here is
          a share of, or contingent on, recovered fees, it creates no outcome-fee arrangement under
          §§6151–6152 / SB 37 and no earnings claim under FTC §5 / CA §17500.
        </p>
      </Sec>

      <Sec rule="B&P §§6151–6152 · runner / capper" title="We don't find you clients. We help you answer the ones who already called.">
        <p>
          The same statutes bar acting as an agent who brings a lawyer new business. Intake QA never
          solicits or procures new clients. It only helps your firm re-contact people who already
          called your firm — your own inbound prospective clients. It is quality control and internal
          follow-up, not an agent bringing you strangers. §6154 voids any contract procured through a
          runner or capper; we never procure a contract for you.
        </p>
      </Sec>

      <Sec rule="CA Rules of Professional Conduct 7.2 &amp; 7.3 (2018)" title="Responding to someone's own inquiry is not solicitation.">
        <p>
          Rule 7.2 bars a lawyer from giving anything of value for recommending the lawyer&apos;s
          services. Intake QA doesn&apos;t recommend your firm to anyone and isn&apos;t paid to
          refer.
        </p>
        <p>
          Rule 7.3 governs solicitation. The nuance that matters: a communication made in response to
          the prospective client&apos;s own inquiry is treated differently from an unsolicited
          approach to a stranger. Save-protocol texts go only to people who already called your firm —
          you are responding to an inbound inquiry, not soliciting a stranger. Written communications
          must still honor a recipient&apos;s stated wish not to be contacted and must avoid intrusion,
          coercion, or harassment; every draft includes an opt-out (&ldquo;Reply STOP&rdquo;) and human
          approval. We don&apos;t claim the save protocol is categorically outside 7.3 — we give you the
          controls, and your counsel makes the call.
        </p>
        <p className="text-sm text-faint">
          These are the Chapter 7 rules effective November 1, 2018, which remain the operative rules.
          {" "}
          {/* TODO(Ali): the second-round audit referenced "March 2025 amendments to Rules 7.1–7.3." This task could not confirm any such amendment is in force; a separate State Bar proposal on lawyer-referral-service rules had public comment close Jan. 10, 2026 but is not yet enacted. Do not cite a March 2025 amendment as live until confirmed. */}
          A separate State Bar proposal on lawyer-referral-service rules is pending and not yet
          enacted.
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
          Intake calls are prospective-client information under Rule 1.18, and the duty of
          confidentiality under Rule 1.6 attaches. We treat every uploaded call as confidential and
          process it only to provide the service. Your firm remains the party that owes the duty;
          we&apos;re built to help you keep it. {ACCOUNTABLE_PARTY_LINE} The vendor detail is on the{" "}
          <Link href="/security" className="font-semibold text-accent hover:text-accent-hover">
            security page
          </Link>
          .
        </p>
      </Sec>

      <Sec rule="CA Rule 5.3 · supervising nonlawyer assistants" title="A nonlawyer service your firm supervises.">
        <p>
          Rule 5.3 is the correct hook here: a lawyer must make reasonable efforts to ensure a
          nonlawyer&apos;s conduct is compatible with the lawyer&apos;s own obligations. Intake QA is
          that nonlawyer service, under your supervision. The tool never contacts anyone
          autonomously; a person at your firm approves every send. The AI drafts — it does not decide
          who to contact or what your firm owes anyone.
        </p>
      </Sec>

      <Sec rule="CA State Bar GenAI guidance · ABA Formal Op. 512" title="The AI drafts. A human at your firm verifies and sends.">
        <p>
          The California State Bar&apos;s Practical Guidance for the Use of Generative Artificial
          Intelligence in the Practice of Law (adopted November 16, 2023; an updated version, adding
          agentic-AI coverage, was approved May 14, 2026 and is now the current guidance) and ABA
          Formal Opinion 512 (July 29, 2024) map existing duties to AI use: competence (Rule 1.1),
          confidentiality (Rule 1.6), communication (Rule 1.4), candor (Rule 3.3), supervision (Rules
          5.1/5.3), and reasonable fees (Rule 1.5). Intake QA is built for that posture: the desk
          drafts and scores, a person at your firm reviews and approves, and it makes no legal
          judgments and sends nothing on its own. (On Aug. 22, 2025 the California Supreme Court
          directed the State Bar to consider folding these principles into enforceable rules; that is
          out for public comment and not yet adopted.)
          {/* TODO(Ali): confirm the May 14, 2026 revision reference before relying on it in counsel-facing materials. */}
        </p>
      </Sec>

      <Sec rule="Penal Code §632 / §632.7 · call recording" title="You record the calls. We process the recordings you already made.">
        <p>
          California is an all-party-consent state: Penal Code §632 requires the consent of all
          parties to record a confidential communication (a fine up to $2,500 per violation), and
          §632.7 extends that to cell and cordless calls (Smith v. LoanMe, Cal. 2021). Intake QA
          processes calls your firm already recorded — we do not obtain consent for you, and your firm
          is responsible for having obtained it. A disclosure at the outset that the call is being
          recorded is the standard pattern: &ldquo;This call is being recorded for quality
          assurance.&rdquo;
          {" "}
          {/* TODO(Ali): confirm the firm's own consent/disclosure process before relying on this in onboarding. */}
        </p>
      </Sec>

      <Sec rule="TCPA / SMS (2026)" title="Texts go to your own prior callers, with opt-out, only after registration.">
        <p>
          The FCC&apos;s &ldquo;one-to-one consent&rdquo; rule was vacated by the Eleventh Circuit in
          Insurance Marketing Coalition Ltd. v. FCC (Jan. 24, 2025), which held it
          &ldquo;impermissibly conflict[ed] with the ordinary statutory meaning of &lsquo;prior
          express consent,&rsquo;&rdquo; and the FCC declined to challenge it and reinstated the prior
          rules. That heightened lead-gen consent regime is not in force, and bundled consent is again
          permissible. The TCPA still requires prior express written consent for marketing autodialed
          or prerecorded texts, and revocation must be honored — which is exactly why the same-day
          save protocol is compliance-gated and human-approved. Save-protocol texts go to your
          firm&apos;s own prior callers, include an opt-out, and send only after A2P 10DLC
          registration clears and a person at your firm approves. Your counsel should confirm your
          consent basis.
          {/* TODO(Ali): confirm current A2P 10DLC registration status/date. */}
        </p>
      </Sec>

      <Sec rule="CCPA / CPRA" title="We act as your service provider — process only, never sell.">
        <p>
          Call recordings and transcripts may contain personal information under the CCPA/CPRA.
          Intake QA acts as your service provider: it processes the data only to provide the service
          and does not sell or share it.
          {" "}
          {/* TODO(Ali): confirm the exact "service provider" contract language exists in the DPA before publishing. */}
        </p>
      </Sec>

      <Sec rule="Note for readers outside California" title="ABA Model Rule 5.4 (fee-sharing) — a secondary footnote, not our lead.">
        <p>
          Outside California, some readers reach for ABA Model Rule 5.4 (sharing legal fees with a
          nonlawyer). It isn&apos;t the right lead authority here: our fee is a flat monthly
          subscription, not a share of any fee, so there is nothing to split. For a California firm
          the governing analysis is the runner/capper framework above (§§6151–6152), not Rule 5.4.
        </p>
      </Sec>

      <div className="mt-10 rounded-card border border-hairline bg-canvas p-5 text-sm text-ink-muted">
        This is not legal advice. Intake QA gives PI firms tools to run their own compliant
        follow-up; your firm and its counsel make the final call on ethics and consent.
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
        <Link href="/security" className="inline-flex rounded-pill border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:border-accent">
          See how your data is handled
        </Link>
      </div>
    </div>
  );
}
