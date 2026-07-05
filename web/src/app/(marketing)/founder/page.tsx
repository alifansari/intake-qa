import type { Metadata } from "next";
import Link from "next/link";
import { FounderNote } from "@/components/marketing/FounderNote";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";

export const metadata: Metadata = {
  title: "Why I built Intake QA | Plaintiff Ops",
  description:
    "From ex-PI intake paralegal to founder: why the signable cases that walk are the ones worth going back for.",
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
        I started as a personal-injury intake paralegal — on the phones, doing the follow-up,
        watching the numbers. Every single day I saw the same thing: signable cases walking out the
        door. Injured people who called ready to hire, then slipped away because a call went to
        voicemail or the follow-up never happened. (The Stanford philosophy degree came first; the
        education that mattered here happened at the intake desk.)
      </p>
      <div className="mt-8">
        <FounderNote full />
      </div>
      <div className="mt-10">
        <PilotCohortBanner />
      </div>
      <div className="mt-8">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          Run your free Intake Quality Audit
        </Link>
      </div>
    </div>
  );
}
