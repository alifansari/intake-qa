// The recovery desk chrome — deliberately almost nothing. The whole product is
// one screen (`/desk`), so there is no tab row to get lost in: just the wordmark
// (home), a Settings gear, and Sign out. The old tabs (Missed cases / Upload /
// Documents / Calls) became sections and quiet footer links on the home itself.
//
// Founder-only bridges (Analyst review, Studio) are the sole conditional items,
// and they live to the right so a firm user never sees operator plumbing.
// Access is gated by middleware (src/proxy.ts) — reaching here means signed in.
import Link from "next/link";
import { getCurrentUser } from "@/lib/supabase/server";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  const isFounder = Boolean(founderEmail && user?.email?.trim().toLowerCase() === founderEmail);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-hairline bg-surface">
        <div className="mx-auto flex h-14 max-w-[1120px] items-center justify-between px-5">
          <Link href="/desk" className="font-display text-sm font-semibold text-ink">
            Intake QA · your desk
          </Link>
          <div className="flex items-center gap-x-5 text-sm">
            <Link
              href="/desk/triage"
              className="rounded-lg bg-ink px-3 py-1.5 font-medium text-surface hover:opacity-90"
            >
              Live triage
            </Link>
            <Link href="/desk/calibration" className="text-ink-muted hover:text-ink">
              Our accuracy
            </Link>
            <Link href="/desk/receipts" className="text-ink-muted hover:text-ink">
              Recovered
            </Link>
            {isFounder ? (
              <>
                <Link href="/desk/review" className="text-faint hover:text-ink">
                  Analyst review
                </Link>
                <Link href="/studio" className="text-faint hover:text-ink">
                  Studio
                </Link>
              </>
            ) : null}
            <Link href="/desk/settings" className="text-ink-muted hover:text-ink">
              Settings
            </Link>
            {user?.email ? (
              <form action="/auth/signout" method="post" className="flex items-center gap-3">
                <span className="hidden text-xs text-faint sm:inline">{user.email}</span>
                <button type="submit" className="text-ink-muted hover:text-ink">
                  Sign out
                </button>
              </form>
            ) : null}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-[1120px] px-5 py-8">{children}</main>
    </div>
  );
}
