import type { Metadata } from "next";
import Link from "next/link";
import { FounderNote } from "@/components/marketing/FounderNote";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";

export const metadata: Metadata = {
  title: "Why I built Intake QA",
  description:
    "A Stanford-educated founder who handled intake himself, watched firms leak signable cases daily, and built the QA and recovery system he wished existed.",
  alternates: { canonical: "/founder" },
};

export default function FounderPage() {
  return (
    <div className="mx-auto max-w-[820px] px-5 py-16">
      <p className="eyebrow">Founder</p>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink text-balance sm:text-5xl">
        Why I built Intake QA.
      </h1>
      <p className="mt-5 max-w-[68ch] text-lg text-ink-muted">
        I&apos;m a Stanford-educated founder who spent real time inside personal-injury intake — on
        the phones, in the follow-up, watching the numbers. What I saw, every single day, was firms
        leaking signable cases: injured people who called ready to hire, then slipped away because a
        call went to voicemail or the follow-up never happened.
      </p>
      <div className="mt-8">
        <FounderNote full />
      </div>
      <div className="mt-10">
        <PilotCohortBanner />
      </div>
      <div className="mt-8">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run my free Leak Audit
        </Link>
      </div>
    </div>
  );
}
