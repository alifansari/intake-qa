import type { Metadata } from "next";
import Link from "next/link";
import { CTA_PRIMARY, CATEGORY_BOUNDARY_LINE } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "Why intake is where PI firms bleed | Intake QA",
  description:
    "A point of view: personal-injury firms spend fortunes to make the phone ring, then lose signable cases after it’s answered, and nobody independent is checking. The case for closing the loop.",
  alternates: { canonical: "/manifesto" },
};

function Movement({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-hairline py-10">
      <p className="eyebrow">{kicker}</p>
      <div className="mt-4 max-w-[68ch] space-y-5 text-lg leading-relaxed text-ink-muted">{children}</div>
    </section>
  );
}

export default function ManifestoPage() {
  return (
    <div className="mx-auto max-w-[1120px] px-5 py-16">
      <p className="eyebrow">A point of view</p>
      <h1 className="mt-3 max-w-[26ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink text-balance sm:text-5xl">
        Why intake is where personal injury firms bleed.
      </h1>
      <p className="mt-5 max-w-[68ch] text-lg text-ink-muted">
        This is an argument, not a category proclamation. Here’s how we see the problem, and why
        we built the desk the way we did. Disagree with any part of it and tell us. We’re early
        and we’d rather be right than loud.
      </p>

      <Movement kicker="The money is already spent">
        <p>
          Every injured caller who dials your firm cost money to get there: a click, a billboard, a
          referral. By the time the phone rings, the acquisition cost is sunk. What happens in the
          next ninety seconds decides whether that spend turns into a fee agreement or evaporates. A
          call lands during a lunch rush. A voicemail doesn’t get returned. A &ldquo;let me talk
          to my spouse&rdquo; never gets a follow-up. The case was signable. It just left.
        </p>
      </Movement>

      <Movement kicker="Everyone grades their own homework">
        <p>
          Here’s the part that should bother you: every report you get on your intake comes from
          someone with a stake in the answer. The AI receptionist reports on the calls it answered.
          The agency reports on the leads it sold you. Your own staff report on their own follow-up.
          None of them are lying, but none of them are independent, and none of them reconcile what
          happened at the call against who actually signed a fee agreement weeks later. The one
          question nobody answers: of the people who called, how many were signable, how many signed,
          and where did the rest go?
        </p>
      </Movement>

      <Movement kicker="Close the loop">
        <p>
          The fix isn’t answering faster. Plenty of tools already do that well. The fix is a
          closed loop: read every call across every channel, flag the signable ones that didn’t
          convert, reconcile them against the fee agreements that actually got signed, put a dollar
          figure on what walked, and hand the firm a compliant, human-reviewed way to win the
          recoverable ones back. Done by someone with no stake in the grade. That’s the desk.
        </p>
        <p>{CATEGORY_BOUNDARY_LINE}</p>
      </Movement>

      <Movement kicker="Why it compounds">
        <p>
          A firm doesn’t lose because it can’t generate leads. It loses because it
          can’t see which paid-for cases it’s leaving on the table. The firm across the
          street that installs a measurement layer on its intake will keep getting a little better
          every month while the one that guesses keeps paying to generate cases it can’t hold
          onto. Intake is the cheapest place a PI firm can find growth, because the money to get there
          is already spent.
        </p>
      </Movement>

      <div className="mt-10 flex flex-wrap gap-4 border-t border-hairline pt-10">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
        <Link href="/how-it-works" className="inline-flex rounded-pill border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:border-accent">
          See how the desk works
        </Link>
      </div>
    </div>
  );
}
