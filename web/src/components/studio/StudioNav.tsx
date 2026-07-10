"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

// One persistent nav for every founder surface (/studio/* and /admin/*), so the
// operator side works like one product instead of URLs you have to remember.
// Labels are plain and descriptive on purpose — the invented names ("The
// Mirror", "The Ledger") live on as subtitles on their own pages.
const LINKS = [
  { href: "/studio", label: "Today", exact: true },
  { href: "/studio/firms", label: "Firms" },
  { href: "/studio/shops", label: "Mystery shops" },
  { href: "/studio/leads", label: "Leads" },
  { href: "/studio/escalations", label: "Urgent leads" },
  { href: "/studio/ledger", label: "Monthly results" },
  { href: "/studio/tuning", label: "Tuning" },
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
          Intake QA · studio
        </Link>
        <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm" aria-label="Studio">
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
            Firm desk
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
