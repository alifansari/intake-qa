"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { DemoToggle } from "./demo-mode";

const LINKS = [
  { href: "/", label: "Executive Summary" },
  { href: "/calibration", label: "Calibration & Honesty" },
  { href: "/funnel", label: "Recovery Funnel" },
  { href: "/triage", label: "Triage Queue" },
  { href: "/statement", label: "Statement" },
  { href: "/queue", label: "Approval Queue" },
];

export function Nav() {
  const pathname = usePathname();
  return (
    <header className="no-print sticky top-0 z-30 bg-navy-deep text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-display text-base font-semibold leading-none">
            Intake QA
            <span className="ml-2 font-sans text-xs font-normal text-white/60">
              Outcome Reconciliation
            </span>
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
