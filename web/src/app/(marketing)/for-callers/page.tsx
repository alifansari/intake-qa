import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "If your call to a law firm was reviewed | Intake QA",
  description:
    "A plain-language explanation for people who called a personal-injury law firm and were told their call may be reviewed for quality.",
  alternates: { canonical: "/for-callers" },
};

export default function ForCallersPage() {
  return (
    <div className="mx-auto max-w-[680px] px-5 py-16">
      <p className="eyebrow">For callers</p>
      <h1 className="mt-3 max-w-[24ch] font-display text-4xl font-semibold tracking-tight text-ink text-balance">
        If you called a law firm and heard your call may be reviewed.
      </h1>

      <div className="mt-8 space-y-5 text-lg leading-relaxed text-ink-muted">
        <p>
          If you recently called a personal-injury law firm and were told the call may be reviewed
          for quality, this may be why. Law firms use Intake QA to make sure callers who need help
          don&apos;t get missed.
        </p>
        <p>
          We work only for the firm you called, under their instructions. We never sell your
          information, and we don&apos;t add you to marketing lists. If the firm follows up, it is so
          a person there can help. You can reply STOP to any text and we will stop immediately.
        </p>
        <p>
          Your call is treated as confidential. Recordings are deleted right after they are turned
          into text, and we hold what remains only briefly. If you have a question about your own
          call, the best people to ask are the firm you called.
        </p>
      </div>

      <div className="mt-10 border-t border-hairline pt-6 text-sm text-faint">
        <p>
          Intake QA is a service of Plaintiff Ops LLC. This page is a general explanation, not legal
          advice.
        </p>
        <p className="mt-2">
          <Link href="/privacy" className="font-semibold text-accent hover:text-accent-hover">
            Read our privacy policy
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
