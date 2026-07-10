"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { isMarketingRoute } from "@/lib/marketing-routes";
import { DemoToggle } from "./demo-mode";

// The old seven dashboard tabs all 308-redirect into the desk now, so this
// nav (shown only on the few non-desk product pages like /demo, /login,
// /welcome) points straight at the desk's real screens with matching labels.
const LINKS = [
  { href: "/desk/queue", label: "Missed cases" },
  { href: "/desk/documents", label: "Documents" },
  { href: "/desk/reconciliation", label: "Calls" },
  { href: "/desk/settings", label: "Settings" },
];

export function Nav() {
  const pathname = usePathname();
  // Marketing pages carry their own nav/footer/sticky CTA via the (marketing)
  // shell, and the four-screen desk carries its own chrome, so the product nav
  // stands down on both. The Leak Audit report (/audit/*) is a
  // client-facing, shareable, printable artifact with its own masthead, so the
  // internal dashboard nav stands down there too.
  if (
    isMarketingRoute(pathname) ||
    pathname.startsWith("/desk") ||
    pathname.startsWith("/audit") ||
    pathname.startsWith("/letter") ||
    pathname.startsWith("/carta") ||
    // The intake-agent demo is a firm-facing showcase with its own header;
    // the internal dashboard nav would break the illusion.
    pathname.startsWith("/intake-demo")
  ) {
    return null;
  }
  return (
    <header className="no-print sticky top-0 z-30 bg-navy-deep text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/desk/queue" className="font-display text-base font-semibold leading-none">
            Intake QA
            <span className="ml-2 font-sans text-xs font-normal text-white/60">the desk</span>
          </Link>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto">
          <nav className="flex items-center gap-0.5">
            {LINKS.map((l) => {
              const active =
                l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
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
          <div className="ml-2 hidden sm:block">
            <DemoToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
