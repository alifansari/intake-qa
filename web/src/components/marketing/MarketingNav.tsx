import Link from "next/link";

// Marketing top nav — max 5 items, emerald CTA pill. No JS: middle links hide on
// mobile, brand + CTA always visible.
const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/compliance", label: "Compliance" },
  { href: "/pricing", label: "Pricing" },
  { href: "/honesty", label: "Honesty" },
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
        <Link
          href="/audit"
          className="rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          Run your free Intake Quality Audit
        </Link>
      </div>
    </header>
  );
}
