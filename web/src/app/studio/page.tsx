import Link from "next/link";
import { Pool } from "pg";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { listFirms, type StudioFirm } from "@/lib/studio/data";
import { NewLeakAudit } from "./new-leak-audit";
import { SendDigestsButton } from "./digest-button";

export const dynamic = "force-dynamic";

// The studio home — "Today". One screen that answers "what needs me right
// now?" (urgent leads waiting for an ack, tuning proposals waiting for a
// decision), then puts the primary work action (upload calls for a Leak Audit)
// front-and-center, then everything else one hop away. Founder-only (guarded
// here AND in middleware AND by RLS).

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

interface Attention {
  openEscalations: number;
  unackedEscalations: number;
  pendingProposals: number;
  leadsThisWeek: number;
  newApplications: number;
}

// Best-effort counts — a missing table or connection never breaks the home.
async function loadAttention(): Promise<Attention | null> {
  if (!process.env.DATABASE_URL) return null;
  const out: Attention = {
    openEscalations: 0,
    unackedEscalations: 0,
    pendingProposals: 0,
    leadsThisWeek: 0,
    newApplications: 0,
  };
  try {
    const r = await pool().query(
      `select count(*)::int as open,
              count(*) filter (where acked_by is null)::int as unacked
       from escalations where status <> 'resolved'`,
    );
    out.openEscalations = r.rows[0]?.open ?? 0;
    out.unackedEscalations = r.rows[0]?.unacked ?? 0;
  } catch {
    /* table missing or unreachable — show nothing rather than plumbing */
  }
  try {
    const r = await pool().query(
      `select count(*)::int as n from tuning_proposals where status = 'proposed'`,
    );
    out.pendingProposals = r.rows[0]?.n ?? 0;
  } catch {
    /* same */
  }
  try {
    const r = await pool().query(
      `select count(*)::int as n from intake_leads
       where created_at > now() - interval '7 days'`,
    );
    out.leadsThisWeek = r.rows[0]?.n ?? 0;
  } catch {
    /* same */
  }
  try {
    // Beta applications land silently otherwise — nothing emails the founder
    // (nothing sends, period), so the inbox tile IS the notification.
    const r = await pool().query(
      `select count(*)::int as n from beta_applicants
       where status in ('nda_pending','nda_signed')`,
    );
    out.newApplications = r.rows[0]?.n ?? 0;
  } catch {
    /* same */
  }
  return out;
}

export default async function StudioHome() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake QA · Studio" title="Not configured" />
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted">
              The Studio needs a connected Supabase project and a FOUNDER_EMAIL. Set the
              environment variables to enable it.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const { supabase } = await requireFounderPage();
  let firms: StudioFirm[] = [];
  try {
    firms = await listFirms(supabase);
  } catch {
    firms = [];
  }
  const attention = await loadAttention();
  const needsYou =
    (attention?.unackedEscalations ?? 0) > 0 ||
    (attention?.pendingProposals ?? 0) > 0 ||
    (attention?.newApplications ?? 0) > 0;

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio" title="Today">
        <SendDigestsButton />
      </PageHeader>

      {/* What needs you right now — the operator inbox, worked to zero. */}
      {attention ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/studio/escalations"
            className="rounded-card border border-line bg-paper p-4 transition-colors hover:border-accent"
          >
            <div className="text-2xl font-semibold text-ink">
              {attention.unackedEscalations}
            </div>
            <div className="mt-1 text-sm font-medium text-ink">
              Urgent leads waiting to be claimed
            </div>
            <div className="mt-1 text-xs text-muted">
              {attention.openEscalations} open in total, hottest first. If nobody claims one
              in time, a callback is booked automatically and it lands here as a miss.
            </div>
          </Link>
          <Link
            href="/studio/onboard-firm"
            className="rounded-card border border-line bg-paper p-4 transition-colors hover:border-accent"
          >
            <div className="text-2xl font-semibold text-ink">{attention.newApplications}</div>
            <div className="mt-1 text-sm font-medium text-ink">
              Applications waiting on you
            </div>
            <div className="mt-1 text-xs text-muted">
              New firms that applied for the beta. Nothing emails you — this tile is the
              notification. Onboard them here.
            </div>
          </Link>
          <Link
            href="/studio/tuning"
            className="rounded-card border border-line bg-paper p-4 transition-colors hover:border-accent"
          >
            <div className="text-2xl font-semibold text-ink">{attention.pendingProposals}</div>
            <div className="mt-1 text-sm font-medium text-ink">
              Tuning proposals waiting on you
            </div>
            <div className="mt-1 text-xs text-muted">
              Nothing tunes itself — each needs your named decision.
            </div>
          </Link>
          <Link
            href="/studio/leads"
            className="rounded-card border border-line bg-paper p-4 transition-colors hover:border-accent"
          >
            <div className="text-2xl font-semibold text-ink">{attention.leadsThisWeek}</div>
            <div className="mt-1 text-sm font-medium text-ink">New leads this week</div>
            <div className="mt-1 text-xs text-muted">
              Everyone the intake agent captured — including chats they abandoned.
            </div>
          </Link>
        </div>
      ) : null}
      {attention && !needsYou ? (
        <p className="mt-3 text-sm text-muted">
          Nothing is waiting on you right now. The queues below are clear.
        </p>
      ) : null}

      {/* PRIMARY action: upload a firm's calls. Front-and-center by design. */}
      <div className="mt-8">
        <h2 className="eyebrow mb-3">Run a Leak Audit</h2>
        <NewLeakAudit firms={firms} />
      </div>

      {/* Everything else, one hop away, in plain words. */}
      <div className="mt-8">
        <h2 className="eyebrow mb-3">Everything else</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/studio/firms",
              title: "Firms",
              desc: "Every firm with an account — recordings, shops, and scorecards live under each one.",
            },
            {
              href: "/studio/onboard-firm",
              title: "Onboard a firm",
              desc: "Turn an application into an account in one step — sign-in, membership, welcome email ready to copy.",
            },
            {
              href: "/studio/shops",
              title: "Mystery shops",
              desc: "Call a firm's intake like a real client would, grade what happened, print the firm-branded report.",
            },
            {
              href: "/intake-demo",
              title: "Intake agent demo",
              desc: "The consent-first chat you show firms — it qualifies a visitor without ever giving advice.",
            },
            {
              href: "/studio/leads",
              title: "Leads",
              desc: "Everyone the intake agent captured — including chats they abandoned.",
            },
            {
              href: "/studio/escalations",
              title: "Urgent leads",
              desc: "Flags that need a human now. Claim one with your name, handle it, mark how it ended.",
            },
            {
              href: "/studio/ledger",
              title: "Monthly results",
              desc: "The printable monthly receipt — what was caught and what was missed, in the firm's own numbers.",
            },
            {
              href: "/studio/tuning",
              title: "Tuning proposals",
              desc: "Once a month the system proposes changes to its own triggers. Nothing changes unless you approve it by name.",
            },
            {
              href: "/admin",
              title: "System",
              desc: "Status, Leak Audit sessions, billing, and feature switches — the back office.",
            },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-card border border-line bg-paper p-4 transition-colors hover:border-accent"
            >
              <div className="text-sm font-semibold text-ink">{c.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="eyebrow">Firms</h2>
          <Link href="/studio/firms" className="text-xs text-accent underline hover:text-accent-hover">
            All firms →
          </Link>
        </div>
        {firms.length === 0 ? (
          <p className="text-sm text-muted">
            No firms yet. Onboard one from an application, or add one on the fly by uploading
            a call above.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line bg-paper">
            {firms.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-ink">{f.name}</div>
                  {f.website ? (
                    <div className="text-xs text-faint">{f.website}</div>
                  ) : null}
                </div>
                <Link
                  href={`/studio/firms/${f.id}`}
                  className="text-xs text-accent underline hover:text-accent-hover"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
