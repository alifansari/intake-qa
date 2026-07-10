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
}

// Best-effort counts — a missing table or connection never breaks the home.
async function loadAttention(): Promise<Attention | null> {
  if (!process.env.DATABASE_URL) return null;
  const out: Attention = {
    openEscalations: 0,
    unackedEscalations: 0,
    pendingProposals: 0,
    leadsThisWeek: 0,
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
    (attention?.unackedEscalations ?? 0) > 0 || (attention?.pendingProposals ?? 0) > 0;

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio" title="Today">
        <SendDigestsButton />
      </PageHeader>

      {/* What needs you right now — the operator inbox, worked to zero. */}
      {attention ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Link
            href="/studio/escalations"
            className="rounded-card border border-line bg-paper p-4 transition-colors hover:border-accent"
          >
            <div className="text-2xl font-semibold text-ink">
              {attention.unackedEscalations}
            </div>
            <div className="mt-1 text-sm font-medium text-ink">
              Urgent leads waiting for an ack
            </div>
            <div className="mt-1 text-xs text-muted">
              {attention.openEscalations} open in total. Hottest first; unacked items
              waterfall to the backstop.
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
              Everything the intake agent captured, abandoned sessions included.
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
              href: "/studio/onboard-firm",
              title: "Onboard a firm",
              desc: "Apply → account in one click: firm, sign-in, membership, welcome email composed.",
            },
            {
              href: "/studio/shops",
              title: "Mystery shops",
              desc: "Shop a firm's intake like a real caller, grade each channel, print the report. (The Mirror.)",
            },
            {
              href: "/intake-demo",
              title: "Intake agent demo",
              desc: "The consent-first chat walking the full qualification tree. Show this to firms.",
            },
            {
              href: "/studio/leads",
              title: "Leads",
              desc: "Every canonical record the agent produced — abandoned sessions included.",
            },
            {
              href: "/studio/escalations",
              title: "Urgent leads",
              desc: "Every fired trigger, hottest first. Ack, action, resolve — named. Run the sweep.",
            },
            {
              href: "/studio/ledger",
              title: "Monthly results",
              desc: "The monthly receipt — captures, catches, SLA including misses. Printable. (The Ledger.)",
            },
            {
              href: "/studio/tuning",
              title: "Tuning proposals",
              desc: "The loop's proposals with their precision math. You approve by name; nothing tunes itself.",
            },
            {
              href: "/admin",
              title: "System",
              desc: "Operator status, Leak Audit console, billing, feature flags — the safety board.",
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
        <h2 className="eyebrow mb-3">Firms</h2>
        {firms.length === 0 ? (
          <p className="text-sm text-muted">
            No firms yet. Add one above to start a spot check.
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
