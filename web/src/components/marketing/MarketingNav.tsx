import Link from "next/link";
import { CTA_PRIMARY, CTA_SECONDARY, CTA_SECONDARY_HREF } from "@/lib/site-constants";

// Marketing top nav, emerald CTA pill. No client JS: the middle links show inline
// on md+, and collapse into a native <details> disclosure menu on small screens.
// Four links, plain words. A first-time visitor's questions, in order:
// how does it work → what does it cost → is it safe → common objections.
// Manifesto and the letter stay one click away in the footer.
const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/compliance", label: "Compliance" },
  { href: "/faq", label: "FAQ" },
];

export function MarketingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-canvas/90 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-[1120px] items-center justify-between px-5">
        <Link href="/" className="font-display text-lg font-semibold tracking-tight text-ink">
          Intake&nbsp;QA
        </Link>
        <nav className="hidden items-center gap-7 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-ink-muted hover:text-ink"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {/* Secondary action for the already-convinced buyer; hidden on the
              smallest screens (it moves into the mobile disclosure below). */}
          <Link
            href={CTA_SECONDARY_HREF}
            className="hidden text-sm font-medium text-ink-muted hover:text-ink lg:inline"
          >
            {CTA_SECONDARY}
          </Link>
          <Link
            href="/audit"
            className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            {CTA_PRIMARY}
          </Link>
          {/* No-JS mobile disclosure: same links, small screens only. */}
          <details className="group relative md:hidden">
            <summary
              className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-pill border border-hairline text-ink-muted hover:text-ink [&::-webkit-details-marker]:hidden"
              aria-label="Open menu"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" fill="none">
                <path d="M2 4.5h14M2 9h14M2 13.5h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </summary>
            <nav
              className="absolute right-0 top-11 w-52 rounded-card border border-hairline bg-canvas p-2 shadow-card"
              aria-label="Primary mobile"
            >
              {LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="block rounded-base px-3 py-2 text-sm font-medium text-ink-muted hover:bg-surface hover:text-ink"
                >
                  {l.label}
                </Link>
              ))}
              <Link
                href={CTA_SECONDARY_HREF}
                className="mt-1 block rounded-base border-t border-hairline px-3 pt-3 pb-2 text-sm font-semibold text-ink hover:bg-surface"
              >
                {CTA_SECONDARY}
              </Link>
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
