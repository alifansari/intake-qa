import Link from "next/link";
import { Pool } from "pg";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/lib/format";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { listFirms, type StudioFirm } from "@/lib/studio/data";
import { loadValueSurfaced, type ValueSurfaced } from "@/lib/studio/value";
import { NewLeakAudit } from "./new-leak-audit";
import { SendDigestsButton } from "./digest-button";

export const dynamic = "force-dynamic";

// The studio home — the founder’s command center. One screen, top to bottom,
// answering the only three questions that matter day to day:
//
//   1. THE MONEY     — how much value have we produced, and how do I show a firm?
//   2. NEEDS YOU NOW — what is waiting on me right now? (worked to zero)
//   3. THE ACTION    — the one thing I do to create value: run a Leak Audit.
//
// Everything rarer than daily is tucked inside a collapsed "Everything else"
// disclosure, not spread across a ten-item nav. This layout is deliberate and
// evidence-backed (NN/g): a dominant value figure where the eye lands first
// (F-pattern), recognition over recall (attention is shown, not hidden behind
// menus), and progressive disclosure (the essentials up front, the rest one
// click away). Founder-only, guarded here AND in middleware AND by RLS.

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

// One attention tile. Zero is shown quietly (muted), non-zero shouts (accent
// ring + emphasized count) — the screen announces what needs a human rather
// than making the founder open each queue to find out.
function AttentionTile({
  href,
  count,
  title,
  detail,
}: {
  href: string;
  count: number;
  title: string;
  detail: string;
}) {
  const active = count > 0;
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-card border-2 border-accent bg-accent-tint p-4 transition-colors"
          : "rounded-card border border-line bg-paper p-4 transition-colors hover:border-accent"
      }
    >
      <div className={active ? "text-2xl font-semibold text-accent tnum" : "text-2xl font-semibold text-faint tnum"}>
        {count}
      </div>
      <div className="mt-1 text-sm font-medium text-ink">{title}</div>
      <div className="mt-1 text-xs text-muted">{detail}</div>
    </Link>
  );
}

export default async function StudioHome() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake QA · Home" title="Not configured" />
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
  let value: ValueSurfaced;
  try {
    value = await loadValueSurfaced();
  } catch {
    value = { connected: false, totalFeeAtRisk: 0, auditCount: 0, callsReviewed: 0, latestToken: null };
  }
  const needsYou =
    (attention?.unackedEscalations ?? 0) > 0 ||
    (attention?.pendingProposals ?? 0) > 0 ||
    (attention?.newApplications ?? 0) > 0;
  const hasValue = value.connected && value.auditCount > 0;

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Home" title="Home">
        <SendDigestsButton />
      </PageHeader>

      {/* First-time pointer — answers "what do I even do here?" in one click. */}
      <p className="-mt-3 mb-6 text-sm text-muted">
        First time, or need a refresher?{" "}
        <Link href="/studio/guide" className="font-medium text-accent underline hover:text-accent-hover">
          Read the 2-minute Guide
        </Link>{" "}
        — what this does, your daily routine, and how to demo it.
      </p>

      {/* ---------------------------------------------------------------- */}
      {/* ZONE 1 — THE MONEY. The dominant figure, where the eye lands.    */}
      {/* ---------------------------------------------------------------- */}
      <section className="rounded-card border border-accent/40 bg-accent-tint p-6 sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow text-accent">Signable fees surfaced so far</div>
            {hasValue ? (
              <>
                <div className="mt-1 font-display text-5xl font-bold leading-none text-ink tnum sm:text-6xl">
                  {money(value.totalFeeAtRisk)}
                </div>
                <p className="mt-3 max-w-prose text-sm text-muted">
                  Estimated across {value.auditCount} Leak Audit
                  {value.auditCount === 1 ? "" : "s"} · {value.callsReviewed} call
                  {value.callsReviewed === 1 ? "" : "s"} read. Every figure is an estimate
                  backed by a real transcript quote in its report — never a guarantee.
                </p>
              </>
            ) : (
              <>
                <div className="mt-1 font-display text-4xl font-bold leading-tight text-ink sm:text-5xl">
                  Show a firm the money they&rsquo;re missing
                </div>
                <p className="mt-3 max-w-prose text-sm text-muted">
                  This is the whole pitch: we read a firm&rsquo;s intake calls and show the
                  signable cases that walked, in dollars. No audits of your own yet? Open the
                  sample report below — it demonstrates the value in about 60 seconds, no data
                  needed.
                </p>
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <a
              href="/audit/sample"
              target="_blank"
              rel="noopener noreferrer"
              className="whitespace-nowrap rounded-pill bg-accent px-6 py-3 text-center text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
            >
              Show a firm the value →
            </a>
            {hasValue && value.latestToken ? (
              <a
                href={`/audit/${value.latestToken}`}
                target="_blank"
                rel="noopener noreferrer"
                className="whitespace-nowrap rounded-pill border border-accent bg-paper px-6 py-3 text-center text-sm font-semibold text-accent transition-colors hover:bg-accent-tint"
              >
                See your latest report →
              </a>
            ) : (
              <a
                href="#run-audit"
                className="whitespace-nowrap rounded-pill border border-line-strong bg-paper px-6 py-3 text-center text-sm font-semibold text-ink transition-colors hover:border-accent"
              >
                Run a real audit ↓
              </a>
            )}
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* ZONE 2 — NEEDS YOU NOW. The inbox, worked to zero.               */}
      {/* ---------------------------------------------------------------- */}
      <div className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="eyebrow">Needs you now</h2>
          {attention && !needsYou ? (
            <span className="text-xs text-accent">You&rsquo;re all clear ✓</span>
          ) : null}
        </div>
        {attention ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <AttentionTile
              href="/studio/escalations"
              count={attention.unackedEscalations}
              title="Urgent leads to claim"
              detail={`${attention.openEscalations} open, hottest first. Unclaimed too long books a callback automatically and lands as a miss.`}
            />
            <AttentionTile
              href="/studio/onboard-firm"
              count={attention.newApplications}
              title="Applications waiting on you"
              detail="New firms that applied for the beta. Onboard them here; they clear once done."
            />
            <AttentionTile
              href="/studio/tuning"
              count={attention.pendingProposals}
              title="Tuning proposals to decide"
              detail="Nothing tunes itself — each change needs your named decision."
            />
            <AttentionTile
              href="/studio/leads"
              count={attention.leadsThisWeek}
              title="New leads this week"
              detail="Everyone the intake agent captured, including chats they abandoned."
            />
          </div>
        ) : (
          <Card>
            <CardContent className="py-5">
              <p className="text-sm text-muted">
                No database connected yet, so there&rsquo;s nothing to show here. Once the
                pipeline is live, anything waiting on you appears in this row.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ZONE 3 — THE ACTION. The one thing you do to create value.       */}
      {/* ---------------------------------------------------------------- */}
      <div id="run-audit" className="mt-10 scroll-mt-20">
        <h2 className="eyebrow mb-1">Create value for a firm</h2>
        <p className="mb-3 max-w-prose text-sm text-muted">
          Upload a firm&rsquo;s intake calls. We read them, find the signable cases that
          walked, and turn it into the dollar report above — the thing you put in front of
          them. This is the core loop; everything else supports it.
        </p>
        <NewLeakAudit firms={firms} />
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ZONE 4 — EVERYTHING ELSE. Progressive disclosure: collapsed.     */}
      {/* ---------------------------------------------------------------- */}
      <details className="group mt-10 rounded-card border border-line bg-paper">
        <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-ink">
          <span>Everything else</span>
          <span className="text-right text-xs font-normal text-muted">
            Firms, results, shops, rescues, tuning, and the rest — click to open
          </span>
        </summary>
        <div className="grid grid-cols-1 gap-3 border-t border-line p-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              href: "/studio/firms",
              title: "Firms",
              desc: "Every firm with an account — recordings, shops, and scorecards live under each one.",
            },
            {
              href: "/studio/ledger",
              title: "Monthly results",
              desc: "The printable monthly receipt for a firm: what was caught and what was missed.",
            },
            {
              href: "/studio/shops",
              title: "Mystery shops",
              desc: "Call a firm’s intake like a real client would, grade it, print the firm-branded report.",
            },
            {
              href: "/studio/rescue",
              title: "Rescues",
              desc: "Upload a firm’s dead CRM leads, re-triage for merit, and get a daily callback packet.",
            },
            {
              href: "/studio/escalations",
              title: "Urgent leads",
              desc: "Flags that need a human now. Claim one with your name, handle it, mark how it ended.",
            },
            {
              href: "/studio/leads",
              title: "Leads",
              desc: "Everyone the intake agent captured — including chats they abandoned.",
            },
            {
              href: "/studio/tuning",
              title: "Tuning proposals",
              desc: "Once a month the system proposes changes to its own triggers. Nothing changes unless you approve it by name.",
            },
            {
              href: "/studio/beta",
              title: "Beta health",
              desc: "Per-firm activation clock and the audit → pilot → paid funnel.",
            },
            {
              href: "/desk/review",
              title: "Analyst review",
              desc: "Your internal sign-off queue — approve what the engine scored before it reaches a firm.",
            },
            {
              href: "/studio/onboard-firm",
              title: "Onboard a firm",
              desc: "Turn an application into an account in one step — sign-in, membership, welcome email.",
            },
            {
              href: "/admin",
              title: "System",
              desc: "Status, Leak Audit sessions, billing, and feature switches — the back office.",
            },
            {
              href: "/studio/guide",
              title: "Guide",
              desc: "Plain-English walkthrough: what this does, your daily routine, how to demo it.",
            },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-card border border-line bg-canvas p-4 transition-colors hover:border-accent"
            >
              <div className="text-sm font-semibold text-ink">{c.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{c.desc}</div>
            </Link>
          ))}
        </div>
      </details>
    </PageShell>
  );
}
