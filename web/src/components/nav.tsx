"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

import { DESK_LINKS } from "@/lib/desk-nav";

// Every surface carries its own chrome: marketing pages have MarketingNav, the
// desk and studio have their own headers, and public artifacts (/audit, /letter,
// /demo, /intake-demo, /digest) are deliberately chromeless. This bar exists ONLY
// for the two signed-in pages that have no shell of their own — so it renders on
// an allowlist, never by default. Adding a page? It gets no chrome unless you
// put it here on purpose.
const SHOW_ON = ["/billing", "/settings"];

// This bar has no role context (client component), so it renders only the
// public desk links — never the manager/founder-gated ones. The full,
// role-aware nav lives in src/app/desk/layout.tsx.
const LINKS = DESK_LINKS.filter((l) => !l.visibility);

export function Nav() {
  const pathname = usePathname();
  if (!SHOW_ON.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }
  return (
    <header className="no-print sticky top-0 z-30 bg-navy-deep text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/desk" className="font-display text-base font-semibold leading-none">
            Intake QA
            <span className="ml-2 font-sans text-xs font-normal text-white/60">the desk</span>
          </Link>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <nav className="flex items-center gap-0.5">
            {LINKS.map((l) => {
              const active = pathname.startsWith(l.href);
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={cn(
                    "whitespace-nowrap rounded-sm px-2.5 py-1.5 text-xs font-medium transition-colors",
                    active
                      ? "bg-white/15 text-white"
                      : "text-white/70 hover:text-white hover:bg-white/10",
                  )}
                >
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
