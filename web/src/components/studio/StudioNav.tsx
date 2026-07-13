"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// ONE nav for the whole operator side, four plain words. This is a deliberate
// cut from ten items to four, on evidence: NN/g menu design ("no made-up words,
// no internal jargon") + Hick’s Law (fewer choices decide faster) + progressive
// disclosure (everything rarer than daily lives one hop inside Home, not up
// here). The invented names — "The Mirror", "The Ledger", "Mystery shops",
// "Rescues" — are gone from navigation; they survive only as section labels on
// the pages that own them.
//
//   Home    — the command center: the money, what needs you, the daily action
//   Firms   — every firm and everything under it (shops, recordings, scorecards)
//   Guide   — plain-English "what do I do, and where’s the value" (start here)
//   System  — the back office (status, audits, billing, feature switches)
//
// "Firm view" and "Sign out" sit quietly on the right, not in the main run.
const LINKS = [
  { href: "/studio", label: "Home", exact: true },
  { href: "/studio/firms", label: "Firms" },
  { href: "/studio/guide", label: "Guide" },
  { href: "/admin", label: "System" },
];

export function StudioNav() {
  const pathname = usePathname();
  // The sign-in page and the printable artifacts (mystery-shop report,
  // scorecard print view) carry their own masthead — the nav stands down.
  if (
    pathname === "/studio/login" ||
    pathname.endsWith("/report") ||
    pathname.endsWith("/print")
  ) {
    return null;
  }
  return (
    <header className="no-print border-b border-hairline bg-surface">
      <div className="mx-auto flex h-14 max-w-[1120px] flex-wrap items-center justify-between gap-x-4 px-5">
        <Link href="/studio" className="font-display text-sm font-semibold text-ink">
          Intake QA
        </Link>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Studio">
          {LINKS.map((l) => {
            const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
            return (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "whitespace-nowrap",
                  active ? "font-semibold text-ink" : "text-ink-muted hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/desk/queue" className="text-sm text-ink-muted hover:text-ink">
            Firm view
          </Link>
          <form action="/auth/signout" method="post">
            <button type="submit" className="text-sm text-ink-muted hover:text-ink">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
