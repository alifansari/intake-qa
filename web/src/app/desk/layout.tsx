// The recovery desk chrome — deliberately almost nothing. The whole product is
// one screen (`/desk`), so there is no tab row to get lost in: just the wordmark
// (home), a Settings gear, and Sign out. The old tabs (Missed cases / Upload /
// Documents / Calls) became sections and quiet footer links on the home itself.
//
// Founder-only bridges (Analyst review, Studio) are the sole conditional items,
// and they live to the right so a firm user never sees operator plumbing.
// Access is gated by middleware (src/proxy.ts) — reaching here means signed in.
//
// ROLE GATING (migration 0044/0036): a plain `agent` works the callback queue +
// their own calls, so the team dashboard (scorecard) and firm Settings are
// hidden for them. Managers/admins see the full chrome. Role resolution is
// crash-proof and defaults to admin for existing single-user firms, so this
// never removes access from anyone who has it today.
import Link from "next/link";
import { resolveCurrentRole, isManagerRole } from "@/lib/desk/roles";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const { role, email } = await resolveCurrentRole();
  const user = email ? { email } : null;
  const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  const isFounder = Boolean(founderEmail && email?.trim().toLowerCase() === founderEmail);
  const canSeeTeam = isManagerRole(role);

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
            {canSeeTeam ? (
              <>
                <Link href="/desk/scorecard" className="text-ink-muted hover:text-ink">
                  Scorecard
                </Link>
                <Link href="/desk/team" className="text-ink-muted hover:text-ink">
                  Team
                </Link>
              </>
            ) : null}
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
            {canSeeTeam ? (
              <Link href="/desk/settings" className="text-ink-muted hover:text-ink">
                Settings
              </Link>
            ) : null}
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
