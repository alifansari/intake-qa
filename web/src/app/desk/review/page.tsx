// Analyst review (Stage 6). Sessions awaiting analyst review; each releases
// only after the checklist is confirmed. FOUNDER-ONLY: this is our internal
// tool and it lists sessions across firms — hiding the nav item alone is not
// access control, so the page itself bounces non-founders.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ReviewPanel } from "@/components/desk/ReviewPanel";
import { StatementQueueForm } from "@/components/desk/StatementQueueForm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Analyst review — Intake QA" };

export default async function ReviewPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
    if (!user || !founderEmail || user.email?.trim().toLowerCase() !== founderEmail) {
      redirect("/desk/queue");
    }
  }
  const store = await import("../../../../ingest/store.mjs");
  const { classifyForReview } = await import("../../../../analysis/review-router.mjs");
  type Priority = { decision: "force_review" | "auto_eligible"; reasons: string[]; priorityScore: number };
  type Row = { id: number | string; token: string; email: string | null; report_status: string; priority: Priority };
  // Firm-pipeline statement reviews (migration 0037/0045). Populated only when
  // SAMPLED_REVIEW_ENABLED is on; otherwise this list is empty and the section
  // does not render, so the page is unchanged from today.
  type StatementRow = {
    firm_id: number | string;
    period: string;
    report_status: string;
    provenance: string | null;
    auto_count: number;
    force_review_count: number;
  };
  let sessions: Row[] = [];
  let statements: StatementRow[] = [];
  let firms: Array<{ id: string | number; name: string }> = [];
  let ok = true;
  let db;
  try {
    db = await store.openPipelineDb();
    try {
      statements = (await store.listFirmStatementReviews(db)) as StatementRow[];
    } catch {
      // Table absent (migration not applied) must never break the session queue.
      statements = [];
    }
    try {
      firms = (await store.listFirms(db)).map((f: { id: string | number; name?: string }) => ({
        id: f.id,
        name: String(f.name ?? "Firm"),
      }));
    } catch {
      firms = [];
    }
    const raw = await store.listReviewableSessions(db);
    // Aggregate each session's already-persisted risk signals, classify for
    // triage, then order highest-leverage first (force_review above auto_eligible;
    // biggest dollars within each group). READ-ONLY: nothing is released here.
    const rows: Row[] = [];
    for (const s of raw) {
      let signals = { worstConfidenceTier: null, citationFailureCount: 0, maxRevenueAtRiskCents: 0 };
      try {
        signals = await store.getSessionReviewSignals(db, s.id);
      } catch {
        // Missing/unreadable signals must never hide a report — leave it forced.
      }
      rows.push({ ...s, priority: classifyForReview(signals) });
    }
    rows.sort((a, b) => b.priority.priorityScore - a.priority.priorityScore);
    sessions = rows;
  } catch {
    ok = false;
  } finally {
    if (db) await store.closePipelineDb(db);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk · analyst</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Review queue</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Every report is reviewed and signed off before it’s released. Confirm the checklist, then
          release — the sign-off stamps your name and the timestamp into the footer.
        </p>
      </div>

      {firms.length > 0 ? <StatementQueueForm firms={firms} /> : null}

      {statements.length > 0 ? (
        <div className="mb-8">
          <h2 className="font-display text-sm font-semibold text-ink">Monthly statements awaiting review</h2>
          <p className="mt-1 text-xs text-ink-muted">
            Tiered review: statements with a high-value, lower-confidence, or citation-gap flag hold here for your
            sign-off. Statements where every flag is engine-scored and evidence-verified auto-release.
          </p>
          <div className="mt-3 flex flex-col gap-3">
            {statements.map((s) => (
              <ReviewPanel
                key={`${String(s.firm_id)}:${s.period}`}
                session={{ id: s.firm_id, token: "", email: null, report_status: s.report_status }}
                statementTarget={{ firmId: s.firm_id, period: s.period }}
                label={`Statement · ${s.period}`}
                priority={{
                  decision: s.force_review_count > 0 ? "force_review" : "auto_eligible",
                  reasons:
                    s.force_review_count > 0
                      ? [`${s.force_review_count} flag${s.force_review_count === 1 ? "" : "s"} need review`]
                      : [`${s.auto_count} flag${s.auto_count === 1 ? "" : "s"} auto-eligible`],
                  priorityScore: s.force_review_count,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {!ok ? (
        <div className="rounded-card border border-hairline bg-surface p-8">
          <p className="text-sm text-ink-muted">Connect the workspace database to see the review queue.</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-card border border-hairline bg-surface p-8">
          <p className="text-sm text-ink-muted">Nothing awaiting review. New reports land here in draft.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <ReviewPanel key={String(s.id)} session={s} priority={s.priority} />
          ))}
        </div>
      )}
    </div>
  );
}
