// The recovery desk — the firm-facing app that replaced the prior ~7 tabs.
// Old tab routes redirect here via next.config (DESK_REDIRECTS). Access is gated by
// middleware (src/proxy.ts) — reaching here means there's a signed-in session.
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";
import { isLiveCoachEntitled } from "@/lib/coach-entitlement";
import { DESK_LINKS } from "@/lib/desk-nav";

const BASE_NAV = [...DESK_LINKS];

// The analyst review queue is OUR tool, not the firm's — showing it to intake
// staff invites "what am I supposed to do here?" It appears only for the founder.
const ANALYST_NAV = { href: "/desk/review", label: "Analyst review" };
// The founder's bridge back to the operator side; firms never see it.
const STUDIO_NAV = { href: "/studio", label: "Studio" };

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  const isFounder = Boolean(
    founderEmail && user?.email?.trim().toLowerCase() === founderEmail,
  );
  // P0-2: only surface the Live Coach nav item when the firm is entitled (Pro).
  const { entitled: coachEntitled } = await isLiveCoachEntitled();
  let NAV = coachEntitled
    ? [{ href: "/desk/coach", label: "Live coach" }, ...BASE_NAV]
    : BASE_NAV;
  if (isFounder) NAV = [...NAV.slice(0, -1), ANALYST_NAV, NAV.at(-1)!, STUDIO_NAV];
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
          {user?.email ? (
            <form action="/auth/signout" method="post" className="flex items-center gap-3 pl-4">
              <span className="hidden text-xs text-faint sm:inline">{user.email}</span>
              <button type="submit" className="text-sm text-ink-muted hover:text-ink">
                Sign out
              </button>
            </form>
          ) : null}
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-5 py-8">{children}</main>
    </div>
  );
}
