import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";
import { CTA_PRIMARY, FOUNDER_ANALYST_PARAGRAPH } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Why I built Intake QA | Plaintiff Ops",
  description:
    "Ali ran PI intake before he built Intake QA. Why the signable cases that walk are the ones worth going back for, and why every firm starts with a free Leak Audit.",
  alternates: { canonical: "/founder" },
};

export default function FounderPage() {
  return (
    <div className="mx-auto max-w-[720px] px-5 py-16">
      <p className="eyebrow">Founder</p>
      <div className="mt-3 flex items-center gap-5">
        <Image
          src="/founder.jpg"
          alt="Ali, founder of Intake QA"
          width={96}
          height={96}
          priority
          className="h-24 w-24 flex-none rounded-full object-cover"
        />
        <h1 className="font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
          Why I built Intake QA
        </h1>
      </div>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-muted">
        <p>
          I’m Ali. I ran intake at a personal-injury firm before I built this. I watched
          signable cases walk out the door because a call went to voicemail, or the follow-up never
          happened, or the caller reached the next firm on Google before we called back. The
          marketing money was already spent. The case just went across the street.
        </p>
        <p>
          I studied philosophy at Stanford, but the useful part of my background is the headset: I
          know what a real intake call sounds like, in English and in Spanish, and I know which ones
          your team should have signed.
        </p>
        <p>
          Here’s what I kept coming back to: the enemy was never the intake team. It was the
          silence after the call. The voicemail nobody returned, the &ldquo;let me talk to my
          spouse&rdquo; that never got a follow-up. Firms obsess over generating the next lead and
          stay blind to the ones they already paid for and let walk. And everyone reporting on it had
          a stake in the answer. So I built the independent desk that checks: read every call, detect
          the signable ones that didn’t sign, reconcile against who actually signed, put a dollar
          figure on what walked, and hand your staff a compliant play to win it back.
        </p>
        <p>{FOUNDER_ANALYST_PARAGRAPH}</p>
        <p>
          So here’s the deal: send me up to 10 of your own recorded intake calls and I’ll run
          a free Leak Audit. I score them, walk you through the signable cases that slipped, and charge
          nothing until the number survives your scrutiny. If you continue after that, the first five
          firms join the founding beta: free while I finish building, in exchange for candid feedback,
          with preferred pricing locked in at launch. The fee, when it comes, is flat and never touches
          your outcomes. You’d get direct access to me and a say in what the desk
          becomes. No sales team, no logos to show you yet, just the work.
        </p>
        <p className="font-display text-base font-semibold text-ink">
          Ali, Founder, Intake QA · Sacramento, CA
        </p>
      </div>

      <div className="mt-10">
        <PilotCohortBanner />
      </div>
      <div className="mt-8">
        <Link
          href="/audit"
          className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          {CTA_PRIMARY}
        </Link>
      </div>
    </div>
  );
}
