import Link from "next/link";
import { COPYRIGHT_YEAR, CTA_PRIMARY } from "@/lib/site-constants";

// Everything not in the four-link top nav lives here, one click away.
const LINKS = [
  { href: "/apply", label: "Apply for the beta" },
  { href: "/manifesto", label: "Manifesto" },
  { href: "/letter", label: "The letter" },
  { href: "/carta", label: "La carta (español)" },
  { href: "/honesty", label: "Our error rate" },
  { href: "/founder", label: "Founder" },
  { href: "/security", label: "Security" },
  { href: "/demo", label: "See a call scored" },
  { href: "/intake-demo", label: "Try the intake agent" },
  { href: "/concierge", label: "Concierge" },
  { href: "/for-callers", label: "For callers" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/msa", label: "MSA (draft)" },
  { href: "/dpa", label: "DPA (draft)" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-[1120px] px-5 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Intake&nbsp;QA</p>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              The independent recovery desk for personal-injury firms. See which signable cases
              didn&apos;t sign, and what they were worth.
            </p>
          </div>
          <Link
            href="/audit"
            className="self-start rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {CTA_PRIMARY}
          </Link>
        </div>
        <nav
          className="mt-8 flex flex-wrap gap-x-6 gap-y-2 border-t border-hairline pt-6"
          aria-label="Footer"
        >
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-sm text-ink-muted hover:text-ink">
              {l.label}
            </Link>
          ))}
        </nav>
        <p className="mt-6 max-w-[80ch] text-xs text-faint">
          Intake QA is a service of Plaintiff Ops LLC. Estimates and calibration figures are not
          legal advice; your firm and its counsel make the final call on ethics and consent. Texting
          features activate only after your A2P 10DLC registration is approved. © {COPYRIGHT_YEAR}{" "}
          Plaintiff Ops LLC.
        </p>
      </div>
    </footer>
  );
}
