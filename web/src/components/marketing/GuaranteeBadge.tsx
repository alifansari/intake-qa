// The $50,000 Find-It Guarantee seal. Gold is used ONLY here. Conditions are
// stated in full (no buried terms — FTC Guides, avoid the "illusory guarantee").

import Link from "next/link";
import { GUARANTEE_THRESHOLD } from "@/lib/site-constants";

export function GuaranteeBadge({ className = "" }: { className?: string }) {
  return (
    <div
      className={`flex items-start gap-4 rounded-card border border-gold/40 bg-gold-tint/60 p-5 ${className}`}
    >
      <div
        className="flex h-12 w-12 flex-none items-center justify-center rounded-full border-2 border-gold text-gold"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.4 7.2 17l.9-5.4L4.2 7.7l5.4-.8z" />
        </svg>
      </div>
      <div>
        <p className="font-display text-base font-semibold text-ink">
          {GUARANTEE_THRESHOLD} Find-It Guarantee
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          If your Leak Audit doesn&apos;t identify at least{" "}
          <span className="tnum font-semibold text-ink">{GUARANTEE_THRESHOLD}</span> in estimated
          missed signable-case value in your firm&apos;s own recent intake calls, we refund your $500
          audit fee in full. The guarantee is on what the audit finds — not on any revenue you
          recover.{" "}
          <Link href="/honesty" className="font-semibold text-accent hover:text-accent-hover">
            See how we calculate it →
          </Link>
        </p>
      </div>
    </div>
  );
}
