// /studio/beta — the founder's per-firm beta health board. One dense screen
// that answers: is each firm's pipeline alive, did the digest go out and get
// read, is anyone stuck before activation, and how are the two conversions
// that decide everything (ops/insights.md B1/B2: audit→pilot, pilot→paid).
//
// FOUNDER-ONLY (same defense-in-depth as /admin/status: middleware + this
// page's guard + RLS). Read-only except one control: the founder-set funnel
// stage per firm (pilot/paid) — there is no better source for those states yet.
//
// Every panel is best-effort: a database that predates migration 0027/0035
// renders em-dashes, never a crash (the graceful-degradation house rule).
import { revalidatePath } from "next/cache";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, requireFounderAction, isStudioConfigured } from "@/lib/studio/guard";
import {
  activationState,
  unopenedStreak,
  parseDigestRunOutcomes,
  digestOutcomeLabel,
  funnel,
} from "@/lib/beta/health.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// health.mjs carries no TS types; give the one polymorphic call site a shape
// (its defaults infer as never[] otherwise).
const streakOf = unopenedStreak as unknown as (args: {
  sends: unknown[];
  opens: unknown[];
}) => { streak: number; lastSentAt: string | null; lastOpenedAt: string | null; callTheFirm: boolean };

export const metadata = { title: "Beta health — Intake QA" };

type Store = typeof import("../../../../ingest/store.mjs");

type Activation =
  | { state: "waiting" }
  | { state: "on_clock"; hoursLeft: number }
  | { state: "activated"; hoursToActivate: number }
  | { state: "missed"; actedLate?: boolean };

type FirmHealth = {
  id: string | number;
  name: string;
  isDemo: boolean;
  stage: "pilot" | "paid" | null;
  day: { received: number; scored: number; failed: number } | null;
  week: { received: number; scored: number; failed: number } | null;
  lastCallAt: string | null;
  lastSeenAt: string | null; // last desk_view / sign_in
  digestOutcome: ReturnType<typeof digestOutcomeLabel>;
  callbacks7d: number | null;
  activation: Activation | null;
  streak: { streak: number; lastSentAt: string | null; lastOpenedAt: string | null; callTheFirm: boolean } | null;
};

async function loadBoard() {
  const store = (await import("../../../../ingest/store.mjs")) as Store;
  if (!store.pipelineDbConfigured() && process.env.NODE_ENV === "production") {
    return { connected: false as const };
  }
  let db: unknown;
  try {
    db = await store.openPipelineDb();
  } catch {
    return { connected: false as const };
  }
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 3600_000).toISOString();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 3600_000).toISOString();

    const firms = ((await store.listFirms(db).catch(() => [])) ?? []) as Array<{
      id: string | number;
      name: string;
    }>;

    // The latest digest.run ledger row (written by /api/digest/run into the
    // errors table) → per-firm outcome. Sibling-branch shape: parse defensively.
    type DigestRun = {
      at: string | null;
      byFirm: Record<string, { mode: string; reason: string | null; missCount: number | null }>;
    } | null;
    let digestRun: DigestRun = null;
    try {
      const errors = await store.getRecentErrors(db, 100);
      digestRun = parseDigestRunOutcomes(errors as never[]) as unknown as DigestRun;
    } catch {
      digestRun = null;
    }

    const rows: FirmHealth[] = [];
    for (const f of firms) {
      // Full firm row via SELECT * — works whether or not 0027/0035 is applied
      // (listFirms deliberately names columns, so it can't carry stage yet).
      let full: Record<string, unknown> = {};
      try {
        full = ((await store.getFirm(db, f.id)) ?? {}) as Record<string, unknown>;
      } catch {
        full = {};
      }
      const stage = full.stage === "pilot" || full.stage === "paid" ? full.stage : null;
      const isDemo = Boolean(full.is_demo) || String(f.name ?? "").includes("DEMO");

      const tryOr = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
        try {
          return await fn();
        } catch {
          return null;
        }
      };

      const day = await tryOr(() => store.callCountsSince(db, f.id, dayAgo));
      const week = await tryOr(() => store.callCountsSince(db, f.id, weekAgo));
      const lastCall = await tryOr(() => store.lastCallAt(db, f.id));
      const lastDeskView = await tryOr(() =>
        store.lastEventAt(db, { event: "desk_view", firm_id: f.id }),
      );
      const lastSignIn = await tryOr(() =>
        store.lastEventAt(db, { event: "sign_in", firm_id: f.id }),
      );
      const lastSeenAt =
        [lastDeskView, lastSignIn].filter(Boolean).sort().at(-1) ?? null;

      const callbacks7d = await tryOr(() =>
        store.countEvents(db, { event: "callback_marked", firm_id: f.id, sinceIso: weekAgo }),
      );

      // Activation clock: first digest OR first miss starts it; first
      // callback-shaped mark stops it (BETA_ONBOARDING.md's one metric).
      const firstDigest = await tryOr(() =>
        store.firstEventAt(db, { event: "digest_sent", firm_id: f.id }),
      );
      let firstMiss: string | null = null;
      if (!firstDigest) {
        const flags = (await tryOr(() => store.listLeakedFlags(db, f.id))) as
          | Array<{ received_at?: string; created_at?: string }>
          | null;
        firstMiss =
          (flags ?? [])
            .map((x) => x.created_at ?? x.received_at ?? null)
            .filter((x): x is string => Boolean(x))
            .sort()[0] ?? null;
      }
      const firstCallback = await tryOr(() =>
        store.firstEventAt(db, { event: "callback_marked", firm_id: f.id }),
      );
      const activation =
        day == null
          ? null
          : (activationState({
              firstDigestAt: firstDigest ?? firstMiss,
              firstCallbackAt: firstCallback,
              now,
            }) as unknown as Activation);

      // Unopened-digest streak (pixel-based → approximate by nature).
      const sends = (await tryOr(() =>
        store.listEvents(db, { event: "digest_sent", firm_id: f.id, limit: 30 }),
      )) as Array<{ created_at: string }> | null;
      const opens = (await tryOr(() =>
        store.listEvents(db, { event: "digest_opened", firm_id: f.id, limit: 60 }),
      )) as Array<{ created_at: string }> | null;
      const streak =
        sends == null ? null : streakOf({ sends: sends ?? [], opens: opens ?? [] });

      rows.push({
        id: f.id,
        name: String(f.name ?? "Firm"),
        isDemo,
        stage,
        day,
        week,
        lastCallAt: lastCall,
        lastSeenAt,
        digestOutcome: digestOutcomeLabel(digestRun?.byFirm?.[String(f.id)] ?? null),
        callbacks7d,
        activation,
        streak,
      });
    }

    // Funnels — audits from the audit_sessions ledger (source of truth), pilot
    // and paid from the founder-set stage. A paid firm passed through pilot.
    let audits = 0;
    try {
      const sessions = (await store.listRecentAuditSessions(db, 500)) as unknown[];
      audits = sessions.length;
    } catch {
      audits = 0;
    }
    const realFirms = rows.filter((r) => !r.isDemo);
    const pilots = realFirms.filter((r) => r.stage === "pilot" || r.stage === "paid").length;
    const paid = realFirms.filter((r) => r.stage === "paid").length;

    return {
      connected: true as const,
      rows,
      digestRunAt: digestRun?.at ?? null,
      funnel: funnel({ audits, pilots, paid }),
      eventsLive: rows.some((r) => r.activation != null),
    };
  } finally {
    try {
      await store.closePipelineDb(db);
    } catch {
      /* already closed */
    }
  }
}

// Founder-set funnel stage. The ONLY mutation on this board.
async function setStageAction(formData: FormData) {
  "use server";
  if (isStudioConfigured()) await requireFounderAction();
  const firmId = String(formData.get("firm_id") ?? "");
  const stageRaw = String(formData.get("stage") ?? "");
  const stage = stageRaw === "pilot" || stageRaw === "paid" ? stageRaw : null;
  if (!firmId) return;
  const store = (await import("../../../../ingest/store.mjs")) as Store;
  const db = await store.openPipelineDb();
  try {
    await store.setFirmStage(db, firmId, stage);
  } finally {
    await store.closePipelineDb(db);
  }
  revalidatePath("/studio/beta");
}

function ago(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return "just now";
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function counts(c: { received: number; scored: number; failed: number } | null): string {
  if (!c) return "—";
  return `${c.received} / ${c.scored}${c.failed ? ` / ${c.failed} failed` : " / 0 failed"}`;
}

function ActivationCell({ a }: { a: Activation | null }) {
  if (!a) return <span className="text-muted">—</span>;
  if (a.state === "waiting") return <span className="text-muted">waiting on first digest/miss</span>;
  if (a.state === "on_clock")
    return <span className="font-semibold text-amber">{a.hoursLeft}h left on the 48h clock</span>;
  if (a.state === "activated")
    return <span className="font-semibold text-green">activated in {a.hoursToActivate}h</span>;
  return (
    <span className="font-semibold text-red">
      missed the 48h window{a.actedLate ? " (acted late)" : ""} — call them
    </span>
  );
}

export default async function BetaHealthPage() {
  // Defense in depth: middleware founder-gates /studio, but no page may assume
  // the request passed middleware (same rule as every studio surface).
  if (isStudioConfigured()) await requireFounderPage();

  const board = await loadBoard();

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio" title="Beta health" />

      {!board.connected ? (
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted">
              No database connected. The board lights up once a Supabase/Postgres connection (or the
              local pilot DB) is available.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mb-6">
            <CardContent className="pt-5">
              <SectionTitle>The two conversions (insights B1/B2)</SectionTitle>
              <div className="grid gap-3 sm:grid-cols-5">
                {[
                  { label: "Leak Audits run", value: board.funnel.audits },
                  { label: "Firms in pilot (founder-set)", value: board.funnel.pilots },
                  { label: "Firms paying (founder-set)", value: board.funnel.paid },
                  {
                    label: "Audit → pilot",
                    value: board.funnel.auditToPilotPct == null ? "—" : `${board.funnel.auditToPilotPct}%`,
                  },
                  {
                    label: "Pilot → paid",
                    value: board.funnel.pilotToPaidPct == null ? "—" : `${board.funnel.pilotToPaidPct}%`,
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-sm border border-line bg-canvas p-3">
                    <p className="font-display text-xl font-bold text-ink tabular-nums">{s.value}</p>
                    <p className="mt-0.5 text-xs text-muted">{s.label}</p>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-faint">
                Pilot/paid are set by you in the Stage column below — no billing system decides them
                yet. Instrument both conversions from firm #1 (ops/insights.md B2).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <SectionTitle>Per-firm health</SectionTitle>
              {board.rows.length === 0 ? (
                <p className="text-sm text-muted">No firms onboarded yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                        <th className="py-2 pr-3">Firm</th>
                        <th className="py-2 pr-3">Calls 24h (in / scored / failed)</th>
                        <th className="py-2 pr-3">Calls 7d</th>
                        <th className="py-2 pr-3">Last call</th>
                        <th className="py-2 pr-3">Last seen</th>
                        <th className="py-2 pr-3">Last digest</th>
                        <th className="py-2 pr-3">Digests unopened</th>
                        <th className="py-2 pr-3">Callbacks 7d</th>
                        <th className="py-2 pr-3">Activation (48h)</th>
                        <th className="py-2">Stage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {board.rows.map((r) => (
                        <tr key={String(r.id)} className="border-b border-line/60 align-top">
                          <td className="py-2 pr-3 font-semibold text-ink whitespace-nowrap">
                            {r.name}
                            {r.isDemo ? <span className="ml-1 text-xs font-normal text-faint">(demo)</span> : null}
                          </td>
                          <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{counts(r.day)}</td>
                          <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{counts(r.week)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap text-muted">{ago(r.lastCallAt)}</td>
                          <td className="py-2 pr-3 whitespace-nowrap text-muted">{ago(r.lastSeenAt)}</td>
                          <td className="py-2 pr-3">{r.digestOutcome}</td>
                          <td className="py-2 pr-3 whitespace-nowrap">
                            {r.streak == null ? (
                              "—"
                            ) : r.streak.callTheFirm ? (
                              <span className="font-semibold text-red">
                                {r.streak.streak} in a row — call the firm
                              </span>
                            ) : (
                              <span className="tabular-nums">{r.streak.streak}</span>
                            )}
                          </td>
                          <td className="py-2 pr-3 tabular-nums">{r.callbacks7d ?? "—"}</td>
                          <td className="py-2 pr-3">
                            <ActivationCell a={r.activation} />
                          </td>
                          <td className="py-2">
                            <form action={setStageAction} className="flex items-center gap-1">
                              <input type="hidden" name="firm_id" value={String(r.id)} />
                              <select
                                name="stage"
                                defaultValue={r.stage ?? ""}
                                className="rounded-sm border border-line-strong bg-paper p-1 text-xs text-ink"
                              >
                                <option value="">onboarded</option>
                                <option value="pilot">pilot</option>
                                <option value="paid">paid</option>
                              </select>
                              <button
                                type="submit"
                                className="rounded-sm border border-line-strong px-2 py-1 text-xs text-ink hover:border-accent"
                              >
                                Save
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="mt-4 text-xs text-faint">
                Digest column reads the digest.run ledger{board.digestRunAt ? ` (last run ${ago(board.digestRunAt)})` : " (no run recorded yet)"}.
                Opens come from a tracking pixel — image-blocking email clients undercount, so an
                unopened streak means &ldquo;pick up the phone,&rdquo; never proof they ignored it.
                Activation = first callback marked within 48h of the first digest/miss
                (BETA_ONBOARDING.md). Alerts email {process.env.FOUNDER_EMAIL ? "the founder address" : "no one — FOUNDER_EMAIL is unset"}{" "}
                via the hourly sweep; with EMAIL_ENABLED off they render to output/ instead.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </PageShell>
  );
}
