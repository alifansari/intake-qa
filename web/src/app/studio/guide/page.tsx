import Link from "next/link";
import { PageShell, PageHeader } from "@/components/page";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Guide — Intake QA" };

// The founder's plain-English "start here". Not marketing, not docs — the four
// things Ali actually needs: what this is, where the money is, the daily
// routine, and the 60-second demo. Written to be read once and remembered.
// Every claim stays inside compliance-invariants: fees are ESTIMATES backed by
// transcript evidence, a human approves every text, we never promise an outcome.

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-4">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-accent text-sm font-semibold text-white tnum">
        {n}
      </span>
      <div className="pt-1">
        <div className="font-medium text-ink">{title}</div>
        <div className="mt-1 text-sm leading-relaxed text-muted">{children}</div>
      </div>
    </li>
  );
}

function Block({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <div className="eyebrow text-accent">{eyebrow}</div>
      <h2 className="mt-1 font-display text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default async function GuidePage() {
  if (isStudioConfigured()) await requireFounderPage();

  return (
    <PageShell className="max-w-3xl">
      <PageHeader kicker="Intake QA · Guide" title="Start here" />

      <p className="max-w-prose text-base leading-relaxed text-ink">
        The whole product in one sentence:{" "}
        <strong className="font-semibold">
          we read a law firm&rsquo;s intake calls, show them the signable cases that walked
          away in real dollars, and help win those cases back
        </strong>{" "}
        — with a human approving every message that ever goes out. This page is everything you
        need to run it and to sell it. Two minutes.
      </p>

      {/* WHERE THE VALUE IS */}
      <Block eyebrow="Where the value is" title="The money is one screen">
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          There is exactly one thing you put in front of a firm, and it is the{" "}
          <strong className="font-semibold text-ink">Leak Audit report</strong>. Its headline
          is a dollar figure — &ldquo;an estimated $X in signable fees walked in these N
          calls&rdquo; — and under it, each dollar is backed by a real quote from that call.
          That report is the value. Everything else in this app exists to produce it or to act
          on it.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/audit/sample"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Open the sample report →
          </a>
          <Link
            href="/studio"
            className="rounded-pill border border-line-strong px-5 py-2.5 text-sm font-semibold text-ink hover:border-accent"
          >
            Back to Home
          </Link>
        </div>
        <p className="mt-3 text-xs text-faint">
          The sample uses made-up numbers so you can demo with zero setup. A real audit uses the
          firm&rsquo;s own calls.
        </p>
      </Block>

      {/* THE 60-SECOND DEMO */}
      <Block eyebrow="How to sell it" title="The 60-second demo">
        <ol className="space-y-4">
          <Step n={1} title="Open the sample report">
            From Home, press <em>&ldquo;Show a firm the value&rdquo;</em> (or the button above).
            It opens in a new tab so you never lose your place.
          </Step>
          <Step n={2} title="Point at the big number">
            &ldquo;This is what walked out the door — signable cases your team didn&rsquo;t
            close, in dollars.&rdquo; Let the number land. Do not explain the software.
          </Step>
          <Step n={3} title="Scroll to one call and read the quote">
            &ldquo;Here&rsquo;s the actual moment it happened.&rdquo; The transcript quote is
            what makes the number believable — it&rsquo;s not a guess, it&rsquo;s evidence.
          </Step>
          <Step n={4} title="Make the offer">
            &ldquo;We&rsquo;ll run this on your real calls, free. If it&rsquo;s useful, we keep
            going for a flat monthly fee — never a cut of your cases.&rdquo; Then collect a
            handful of their recordings and run a real audit from Home.
          </Step>
        </ol>
        <p className="mt-4 max-w-prose text-xs text-faint">
          Keep it honest: the dollar figures are estimates with stated assumptions, not
          promises. That&rsquo;s a feature — it&rsquo;s why a careful buyer trusts it.
        </p>
      </Block>

      {/* YOUR DAILY ROUTINE */}
      <Block eyebrow="What you do every day" title="Your 5-minute routine">
        <ol className="space-y-4">
          <Step n={1} title="Open Home">
            The only screen you need. The green banner at top is the value story; the row below
            it is your inbox.
          </Step>
          <Step n={2} title="Clear “Needs you now”">
            Any tile with a number and a green ring wants a decision: an urgent lead to claim, a
            new firm application, a tuning change to approve. Work them to zero. When it says
            &ldquo;You&rsquo;re all clear,&rdquo; you&rsquo;re done for the day.
          </Step>
          <Step n={3} title="When you get calls, run an audit">
            Scroll to <em>&ldquo;Create value for a firm,&rdquo;</em> drop in the recordings,
            and the report builds itself. That&rsquo;s the whole job.
          </Step>
        </ol>
        <p className="mt-4 text-sm text-muted">
          That&rsquo;s it. If a tile is at zero and no new calls came in, there is nothing you
          need to touch.
        </p>
      </Block>

      {/* THE WHOLE LOOP */}
      <Block eyebrow="How it works end to end" title="The whole thing in four steps">
        <ol className="space-y-4">
          <Step n={1} title="Calls come in">
            The firm&rsquo;s phone system forwards recordings automatically, or you upload them.
            Their team changes nothing about how they answer the phone.
          </Step>
          <Step n={2} title="We read and score every call">
            Each call is transcribed and scored against a calibrated rubric to find the
            signable cases that were mishandled or dropped.
          </Step>
          <Step n={3} title="The dollar report">
            The signable-fees-that-walked figure, with a transcript quote behind each one. This
            is the Leak Audit report — the value.
          </Step>
          <Step n={4} title="Win the case back">
            For a leaked case, we draft a compliant follow-up text from an approved template —
            and <strong className="font-semibold text-ink">a human approves every message
            before it sends</strong>. No exceptions, ever.
          </Step>
        </ol>
      </Block>

      {/* WHERE THINGS LIVE */}
      <Block eyebrow="Where everything lives now" title="Four words at the top">
        <p className="max-w-prose text-sm leading-relaxed text-muted">
          The old ten-tab menu is gone. There are four places, and that&rsquo;s the whole map:
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          <li>
            <Link href="/studio" className="font-semibold text-ink underline hover:text-accent">
              Home
            </Link>{" "}
            <span className="text-muted">
              — the money, your inbox, and the audit uploader. Where you live.
            </span>
          </li>
          <li>
            <Link href="/studio/firms" className="font-semibold text-ink underline hover:text-accent">
              Firms
            </Link>{" "}
            <span className="text-muted">
              — each firm and everything under it: recordings, mystery shops, scorecards.
            </span>
          </li>
          <li>
            <Link href="/studio/guide" className="font-semibold text-ink underline hover:text-accent">
              Guide
            </Link>{" "}
            <span className="text-muted">— this page.</span>
          </li>
          <li>
            <Link href="/admin" className="font-semibold text-ink underline hover:text-accent">
              System
            </Link>{" "}
            <span className="text-muted">
              — the back office: status, all Leak Audits, billing, feature switches.
            </span>
          </li>
        </ul>
        <p className="mt-4 max-w-prose text-sm text-muted">
          Everything you used to hunt for in the menu — Monthly results, Rescues, Urgent leads,
          Tuning, Beta health, Analyst review — is now inside{" "}
          <Link href="/studio" className="text-accent underline hover:text-accent-hover">
            Home
          </Link>{" "}
          under &ldquo;Everything else.&rdquo; One click, always in the same spot.
        </p>
      </Block>
    </PageShell>
  );
}
