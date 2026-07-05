// The recovery desk — a four-screen app (item 3) that replaces the prior ~7 tabs.
// Old tab routes redirect here via next.config (DESK_REDIRECTS).
import Link from "next/link";

const NAV = [
  { href: "/desk/queue", label: "Leaked-case queue" },
  { href: "/desk/documents", label: "Statements & readouts" },
  { href: "/desk/reconciliation", label: "Calls & reconciliation" },
  { href: "/desk/settings", label: "Settings" },
];

export default function DeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-5">
          <Link href="/desk/queue" className="font-display text-sm font-semibold text-ink">
            Intake QA · the desk
          </Link>
          <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Desk">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className="text-ink-muted hover:text-ink">
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-5 py-8">{children}</main>
    </div>
  );
}
