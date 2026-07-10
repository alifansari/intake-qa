import Link from "next/link";
import { Pool } from "pg";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { plainTrigger, TIER_LABELS, BUCKET_LABELS } from "@/lib/intake/plain-labels";
import { EscalationRowActions, SweepButton, DispositionControl } from "./actions";

export const dynamic = "force-dynamic";

// The escalation console (founder cockpit for Phases 3–4). Lists every
// escalation with its lifecycle state; Ack / Actioned / Resolve are named
// actions; the sweep button runs one ack-timeout pass. All alerting behind
// this remains mock-only.
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

interface Row {
  id: string;
  trigger_key: string;
  trigger_family: string;
  tier: string;
  status: string;
  fired_at: string;
  ack_deadline_at: string | null;
  acked_by: string | null;
  first_name: string | null;
  phone: string | null;
  bucket: string | null;
  disposition: string | null;
  disposed_by: string | null;
}

const TIER_TONE: Record<string, string> = {
  hot: "border-red/40 bg-red-tint text-red",
  warm: "border-amber/40 bg-amber-tint text-amber",
  flagged: "border-line-strong bg-paper text-muted",
};

const DISPOSITION_LABELS: Record<string, string> = {
  true_positive: "Real case",
  false_positive: "False alarm",
  right_call_bad_outcome: "Right call, bad outcome",
};

export default async function EscalationsPage() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake QA · Studio" title="Urgent leads — not configured" />
      </PageShell>
    );
  }
  await requireFounderPage();

  let rows: Row[] = [];
  if (process.env.DATABASE_URL) {
    const r = await pool().query(
      `select e.id, e.trigger_key, e.trigger_family, e.tier, e.status, e.fired_at,
              e.ack_deadline_at, e.acked_by,
              l.contact->>'first_name' as first_name, l.contact->>'phone' as phone, l.bucket,
              d.disposition, d.noted_by as disposed_by
       from escalations e
       left join intake_leads l on l.id = e.lead_id
       left join escalation_dispositions d on d.escalation_id = e.id
       order by case e.tier when 'hot' then 0 when 'warm' then 1 else 2 end,
                e.fired_at desc
       limit 100`,
    );
    rows = r.rows as Row[];
  }

  const open = rows.filter((r) => !["resolved"].includes(r.status));
  const resolved = rows.filter((r) => r.status === "resolved");

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio" title="Urgent leads">
        <div className="flex items-center gap-3">
          <SweepButton />
          <Link href="/studio" className="text-xs text-accent underline hover:text-accent-hover">
            Studio home
          </Link>
        </div>
      </PageHeader>

      <p className="mb-4 max-w-[70ch] text-sm text-muted">
        Every urgent lead the intake agent flagged, hottest first. Claim it with your name,
        handle it, then mark how it ended. If nobody claims one in time, the system books a
        callback for the caller and raises an alarm here — nothing is silently dropped.
      </p>

      {open.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            No open escalations. Run the intake demo to generate some.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-paper">
          {open.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${TIER_TONE[e.tier]}`}
                    title={TIER_LABELS[e.tier] ?? e.tier}
                  >
                    {e.tier}
                  </span>
                  <span className="text-sm font-medium text-ink" title={e.trigger_key}>
                    {plainTrigger(e.trigger_key)}
                  </span>
                  <span className="text-xs text-faint" title={e.trigger_family}>
                    {plainTrigger(e.trigger_family)}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted tnum">
                  {e.first_name ?? "—"} · {e.phone ?? "no phone"} · flagged{" "}
                  {new Date(e.fired_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {e.bucket ? (
                    <span title={e.bucket}> · {BUCKET_LABELS[e.bucket] ?? e.bucket}</span>
                  ) : null}
                  {e.status === "acked" && e.acked_by ? ` · claimed by ${e.acked_by}` : ""}
                  {e.status === "unclaimed"
                    ? " · Nobody claimed this in time — a callback was booked automatically"
                    : ""}
                </div>
              </div>
              <EscalationRowActions id={e.id} status={e.status} />
            </li>
          ))}
        </ul>
      )}

      {resolved.length > 0 ? (
        <div className="mt-6">
          <h2 className="eyebrow mb-2">Resolved</h2>
          <ul className="divide-y divide-line rounded-card border border-line bg-paper">
            {resolved.map((e) => (
              <li
                key={e.id}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-muted tnum"
              >
                <span>
                  <span title={e.trigger_key}>{plainTrigger(e.trigger_key)}</span> ·{" "}
                  <span title={e.tier}>{TIER_LABELS[e.tier] ?? e.tier}</span> · resolved
                  {e.disposition ? (
                    <span title={e.disposition}>
                      {" "}
                      · {DISPOSITION_LABELS[e.disposition] ?? e.disposition.replace(/_/g, " ")} (
                      {e.disposed_by})
                    </span>
                  ) : null}
                </span>
                {!e.disposition ? <DispositionControl id={e.id} /> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageShell>
  );
}
