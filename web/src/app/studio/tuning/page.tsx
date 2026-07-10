import Link from "next/link";
import { Pool } from "pg";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { ProposalActions, RunTuningButton } from "./actions";

export const dynamic = "force-dynamic";

// The tuning console (Phase 5): proposals the loop generated, each carrying
// its precision rationale. Approve/reject are NAMED actions; approval is the
// only path that changes escalation config, and protected loosenings carry
// their recorded friction phrase.
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

interface Proposal {
  id: string;
  trigger_key: string;
  current_tier: string;
  proposed_action: string;
  proposed_tier: string | null;
  rationale: Record<string, unknown>;
  sample_size: number;
  requires_friction: boolean;
  status: string;
  decided_by: string | null;
}

const ACTION_LABEL: Record<string, string> = {
  tier_downgrade: "Downgrade tier",
  suppress: "Suppress (last resort)",
  tier_restore: "Restore tier (hysteresis)",
  loosen_protected: "Loosen PROTECTED trigger",
};

export default async function TuningPage() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake System" title="Tuning — not configured" />
      </PageShell>
    );
  }
  await requireFounderPage();

  let proposals: Proposal[] = [];
  if (process.env.DATABASE_URL) {
    const r = await pool().query(
      `select id, trigger_key, current_tier, proposed_action, proposed_tier,
              rationale, sample_size, requires_friction, status, decided_by
       from tuning_proposals order by created_at desc limit 100`,
    );
    proposals = r.rows as Proposal[];
  }
  const open = proposals.filter((p) => p.status === "proposed");
  const decided = proposals.filter((p) => p.status !== "proposed");

  return (
    <PageShell>
      <PageHeader kicker="Intake System" title="Tuning proposals">
        <div className="flex items-center gap-3">
          <RunTuningButton />
          <Link href="/studio" className="text-xs text-accent underline hover:text-accent-hover">
            Studio home
          </Link>
        </div>
      </PageHeader>

      <p className="mb-4 max-w-[70ch] text-sm text-muted">
        The loop proposes; a person decides. Each proposal shows the precision math behind
        it. Approving writes the change into escalation config under your name — nothing
        tunes itself. Protected triggers never appear here unless someone typed the full
        friction phrase.
      </p>

      {open.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            No open proposals. Record dispositions on resolved escalations, then run the
            loop — below the sample-size gate it stays silent by design.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-paper">
          {open.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-ink">{p.trigger_key}</span>
                  <span
                    className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${
                      p.requires_friction
                        ? "border-red/40 bg-red-tint text-red"
                        : "border-line-strong bg-paper text-muted"
                    }`}
                  >
                    {ACTION_LABEL[p.proposed_action] ?? p.proposed_action}
                  </span>
                </div>
                <div className="mt-0.5 text-xs text-muted tnum">
                  {p.current_tier}
                  {p.proposed_tier ? ` → ${p.proposed_tier}` : " → off"} · sample{" "}
                  {p.sample_size}
                  {typeof p.rationale?.precision === "number"
                    ? ` · precision ${Math.round((p.rationale.precision as number) * 100)}%`
                    : ""}
                </div>
              </div>
              <ProposalActions id={p.id} />
            </li>
          ))}
        </ul>
      )}

      {decided.length > 0 ? (
        <div className="mt-6">
          <h2 className="eyebrow mb-2">Decided</h2>
          <ul className="divide-y divide-line rounded-card border border-line bg-paper">
            {decided.map((p) => (
              <li key={p.id} className="px-4 py-2 text-xs text-muted tnum">
                {p.trigger_key} · {ACTION_LABEL[p.proposed_action] ?? p.proposed_action} ·{" "}
                {p.status}
                {p.decided_by ? ` by ${p.decided_by}` : ""}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageShell>
  );
}
