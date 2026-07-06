import type { Metadata } from "next";
import Link from "next/link";
import { CTA_PRIMARY, CATEGORY_NAME } from "@/lib/site-constants";

export const metadata: Metadata = {
  title: "The cases you lose at intake are the cheapest cases you'll ever buy back | Intake QA",
  description:
    "The manifesto for Case Acquisition Intelligence: the enemy is the silence after the call, the shift from speed-to-lead to measuring what it produced, and the new way — read every call, detect the signable ones that didn't sign, and prove what walked.",
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
      <p className="eyebrow">{CATEGORY_NAME} · Manifesto</p>
      <h1 className="mt-3 max-w-[26ch] font-display text-4xl font-semibold leading-[1.08] tracking-tight text-ink text-balance sm:text-5xl">
        The cases you lose at intake are the cheapest cases you&apos;ll ever buy back.
      </h1>

      <Movement kicker="The enemy">
        <p>
          Every injured caller who dials your firm cost you money to get there — sometimes hundreds
          of dollars a click. The enemy isn&apos;t your intake team. It&apos;s the silence after the
          call. The voicemail nobody returned. The &ldquo;let me talk to my spouse&rdquo; that never
          got a follow-up. Firms obsess over generating the next lead and stay blind to the ones they
          already paid for and let walk.
        </p>
      </Movement>

      <Movement kicker="The shift">
        <p>
          For a decade, legal tech optimized the front of the funnel — answer faster, chat sooner,
          book more. But speed only matters if you can prove what it produced. The question was never
          &ldquo;did we answer?&rdquo; It&apos;s &ldquo;of the people who called, how many were
          signable, how many signed, and where did the rest go?&rdquo; Nobody was measuring that. So
          we built the category that does.
        </p>
      </Movement>

      <Movement kicker="The new way">
        <p>
          {CATEGORY_NAME}. Read every call. Detect the signable ones that didn&apos;t convert. Put a
          dollar figure on what walked. Hand your staff a compliant, human-reviewed play to win it
          back. Report it like a financial statement, every month.
        </p>
      </Movement>

      <Movement kicker="The stakes">
        <p>
          A firm doesn&apos;t lose because it can&apos;t generate leads. It loses because it can&apos;t
          see which paid-for cases it&apos;s leaving on the table — and its competitor across the
          street can. The firms that install a measurement layer on case acquisition will compound;
          the firms that keep guessing will keep paying to generate cases they can&apos;t hold onto.
        </p>
      </Movement>

      <div className="mt-10 flex flex-wrap gap-4 border-t border-hairline pt-10">
        <Link href="/audit" className="inline-flex rounded-pill bg-accent px-6 py-3 text-sm font-semibold text-white hover:bg-accent-hover">
          {CTA_PRIMARY}
        </Link>
        <Link href="/what-is-case-acquisition-intelligence" className="inline-flex rounded-pill border border-hairline px-6 py-3 text-sm font-semibold text-ink hover:border-accent">
          What is Case Acquisition Intelligence?
        </Link>
      </div>
    </div>
  );
}
