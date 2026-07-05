import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { PilotCohortBanner } from "@/components/marketing/PilotCohortBanner";

export const metadata: Metadata = {
  title: "Why I built Intake QA | Plaintiff Ops",
  description:
    "Ali ran PI intake before he built Intake QA. Why the signable cases that walk are the ones worth going back for — and why the first few firms use it free.",
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
          I&apos;m Ali. I ran intake at a personal-injury firm before I built this. I watched
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
          Intake QA is the quality-control and recovery system I wanted when I had the job. It scores
          every call, catches the ones worth a callback, and drafts a follow-up your team approves
          before it sends.
        </p>
        <p>
          It&apos;s free for the first few firms because I need three to five Southern California PI
          firms to use it on real calls and tell me where it&apos;s wrong. You&apos;d get direct
          access to me and a say in what it becomes. That&apos;s the whole deal. No sales team, no
          logos to show you yet — just the work.
        </p>
        <p className="font-display text-base font-semibold text-ink">
          — Ali, Founder, Intake QA · Orange County, CA
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
          Run your free Intake Quality Audit
        </Link>
      </div>
    </div>
  );
}
