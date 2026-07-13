// Analyst review (Stage 6). Sessions awaiting analyst review; each releases
// only after the checklist is confirmed. FOUNDER-ONLY: this is our internal
// tool and it lists sessions across firms — hiding the nav item alone is not
// access control, so the page itself bounces non-founders.
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { ReviewPanel } from "@/components/desk/ReviewPanel";

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
  let sessions: { id: number | string; token: string; email: string | null; report_status: string }[] = [];
  let ok = true;
  let db;
  try {
    db = await store.openPipelineDb();
    sessions = await store.listReviewableSessions(db);
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
            <ReviewPanel key={String(s.id)} session={s} />
          ))}
        </div>
      )}
    </div>
  );
}
