import Link from "next/link";
import { Pool } from "pg";
import { PageShell, PageHeader } from "@/components/page";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { OnboardFirmForm } from "./form";

export const dynamic = "force-dynamic";

// The apply → account bridge (founder cockpit). An approved applicant becomes
// a working firm in one click: firm row + sign-in account + membership, with
// the welcome email composed and ready to paste. Waiting applications are
// listed right here — nothing emails the founder (nothing sends, period), so
// this list IS the notification.

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
    });
  }
  return _pool;
}

interface WaitingApplicant {
  id: string;
  name: string;
  email: string;
  firm_name: string;
  status: string;
  created_at: string;
}

// Best-effort — a missing table or connection never breaks the page.
async function loadWaiting(): Promise<WaitingApplicant[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const r = await pool().query(
      `select id, name, email, firm_name, status, created_at
       from beta_applicants
       where status in ('nda_pending','nda_signed')
       order by created_at asc
       limit 20`,
    );
    return r.rows as WaitingApplicant[];
  } catch {
    return [];
  }
}

export default async function OnboardFirmPage({
  searchParams,
}: {
  searchParams: Promise<{ firm?: string; email?: string }>;
}) {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake QA · Studio" title="Onboard a firm — not configured" />
      </PageShell>
    );
  }
  await requireFounderPage();
  const params = await searchParams;
  const waiting = await loadWaiting();
  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio" title="Onboard a firm">
        <Link href="/studio/firms" className="text-xs text-accent underline hover:text-accent-hover">
          All firms
        </Link>
      </PageHeader>
      <p className="mb-6 max-w-[70ch] text-sm text-muted">
        When a beta application clears the NDA, provision the firm here. One click creates
        their account, scopes the desk to their firm, and writes the welcome email for you —
        sign-in link, temporary password, and their paste-once call-feed address.
      </p>
      {waiting.length > 0 ? (
        <div className="mb-6">
          <h2 className="eyebrow mb-3">Waiting applications</h2>
          <ul className="divide-y divide-line rounded-card border border-line bg-paper">
            {waiting.map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-ink">{a.firm_name}</div>
                  <div className="text-xs text-muted">
                    {a.name} · {a.email} ·{" "}
                    {a.status === "nda_signed" ? "NDA signed — ready" : "NDA pending"} · applied{" "}
                    {new Date(a.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
                <Link
                  href={`/studio/onboard-firm?firm=${encodeURIComponent(a.firm_name)}&email=${encodeURIComponent(a.email)}`}
                  className="text-xs text-accent underline hover:text-accent-hover"
                >
                  Fill the form with this →
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {/* key forces a remount when the prefill target changes — client-side
          navigation would otherwise keep the old useState values. */}
      <OnboardFirmForm
        key={`${params.firm ?? ""}|${params.email ?? ""}`}
        initialFirmName={params.firm ?? ""}
        initialEmail={params.email ?? ""}
      />
    </PageShell>
  );
}
