import Link from "next/link";
import { COPYRIGHT_YEAR, CTA_PRIMARY } from "@/lib/site-constants";

const LINKS = [
  { href: "/security", label: "Security" },
  { href: "/founder", label: "Founder" },
  { href: "/faq", label: "FAQ" },
  { href: "/demo", label: "Demo" },
  { href: "/concierge", label: "Concierge" },
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
];

export function Footer() {
  return (
    <footer className="mt-24 border-t border-hairline bg-canvas">
      <div className="mx-auto max-w-[1120px] px-5 py-12">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-display text-lg font-semibold text-ink">Intake&nbsp;QA</p>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              Case Acquisition Intelligence for personal-injury firms. See which signable cases
              didn&apos;t sign — and what they were worth.
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
          This is not legal advice. Intake QA gives PI firms tools to run their own compliant
          follow-up; your firm and its counsel make the final call on ethics and consent. © {COPYRIGHT_YEAR} Intake QA.
        </p>
      </div>
    </footer>
  );
}
