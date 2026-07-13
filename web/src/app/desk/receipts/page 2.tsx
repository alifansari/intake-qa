// /desk/receipts — the rolling "Recovered Receipts". The proof-of-value screen:
// the signable cases IntakeQA flagged that your intake had let slip, and how
// many you won back — denominated in your own case-type fee bands (a low–high
// estimate, never a point figure or guarantee, §IV). Misses stay on the receipt.
//
// Rolling and self-serve — no waiting a month, no one emailing it to you. Reads
// the same leaked-flag + fee-band data as the desk home, composed by
// src/lib/desk/receipts.mjs.
import { resolveDeskFirm } from "@/lib/desk/firm";
import {
  composeReceipts,
  receiptHeadline,
  RECEIPTS_METHODOLOGY,
} from "@/lib/desk/receipts.mjs";
import { summarizeMoney, ON_THE_TABLE_STATUSES, fmtBigRange } from "@/lib/desk/money.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Recovered — Intake QA" };

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <section className="rounded-card border border-hairline bg-surface p-6">
      <p className="eyebrow text-accent">The independent audit</p>
      <h1 className="mt-1 font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 max-w-[62ch] text-sm text-ink-muted">{body}</p>
    </section>
  );
}

export default async function ReceiptsPage() {
  const store = await import("../../../../ingest/store.mjs");
  let db;
  try {
    db = await store.openPipelineDb();
  } catch {
    return (
      <EmptyPanel
        title="Recovered"
        body="Your recovered-cases receipt appears here once your desk is connected. It shows the signable cases we flagged that your intake had let slip, and how many you won back."
      />
    );
  }
  try {
    const firm = await resolveDeskFirm(db, store.listFirms);
    if (!firm) {
      return <EmptyPanel title="Recovered" body="Your recovered-cases receipt appears here once your desk is connected." />;
    }

    let flags: Record<string, unknown>[] = [];
    try {
      flags = (await store.listLeakedFlags(db, firm.id)) as Record<string, unknown>[];
    } catch {
      // tables not migrated yet — show the empty state rather than error.
    }

    // Build the money tally and the outcome counts from the same source the desk
    // home uses, so the receipt can never disagree with the queue.
    const moneyLeaks: { status: string; feeLowCents: number; feeHighCents: number }[] = [];
    const recovered: { id: unknown }[] = [];
    let stillOpen = 0;
    let lostAnyway = 0;
    for (const f of flags) {
      const range = f.case_type
        ? await store.getFeeValueRange(db, f.case_type as string, firm.id)
        : null;
      const lowCents = Number((range as { low_cents?: number } | null)?.low_cents ?? 0) || 0;
      const highCents = Number((range as { high_cents?: number } | null)?.high_cents ?? 0) || 0;
      const status = (f.save_status as string) ?? "needs_callback";
      moneyLeaks.push({ status, feeLowCents: lowCents, feeHighCents: highCents });
      if (status === "signed") recovered.push({ id: f.id });
      else if (status === "didnt_sign") lostAnyway += 1;
      else if (ON_THE_TABLE_STATUSES.has(status)) stillOpen += 1;
    }
    const money = summarizeMoney(moneyLeaks);

    const now = new Date();
    const period = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const receipt = composeReceipts({
      period,
      flagged: flags.length,
      recovered,
      stillOpen,
      lostAnyway,
      recoveredRange: { lowCents: money.wonBack.lowCents, highCents: money.wonBack.highCents },
    });

    if (flags.length === 0) {
      return (
        <EmptyPanel
          title="Recovered"
          body="Nothing to show yet. As your intake calls flow in and we flag the signable ones your team let slip, this receipt fills in with the cases you win back — with the tape and the estimated fee behind each one."
        />
      );
    }

    const headline = receiptHeadline(receipt);
    const wonRange =
      money.wonBack.lowCents > 0 || money.wonBack.highCents > 0
        ? fmtBigRange(money.wonBack.lowCents, money.wonBack.highCents)
        : null;

    return (
      <div className="flex flex-col gap-6">
        <header>
          <p className="eyebrow text-accent">The independent audit</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Recovered</h1>
          <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
            The signable cases we flagged that your intake had let slip, and the ones your team won
            back. Yours to forward. This updates on its own — no waiting a month, no one has to send it.
          </p>
        </header>

        <section className="rounded-card border border-hairline bg-surface p-6">
          <p className="eyebrow text-ink-muted">This is what we recovered together</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink">{headline}</p>
          <p className="mt-1 text-xs text-ink-muted">
            {receipt.dollars
              ? receipt.dollars.inputs_note
              : "Set your case-type fee bands to see the dollars behind these cases."}
          </p>
        </section>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Won back" value={String(receipt.recovered.count)} tone="good" sub={wonRange ?? "cases you signed"} />
          <StatCard label="Still on the table" value={String(receipt.still_open)} tone="warn" sub="flagged, being worked" />
          <StatCard label="Lost anyway" value={String(receipt.lost_anyway)} tone="bad" sub="flagged, but signed elsewhere" />
        </div>

        <footer className="rounded-card border border-hairline bg-canvas p-5">
          <p className="eyebrow text-ink-muted">How we count</p>
          <p className="mt-2 max-w-[75ch] text-xs text-ink-muted">
            {RECEIPTS_METHODOLOGY.recovered} {RECEIPTS_METHODOLOGY.dollars} {RECEIPTS_METHODOLOGY.misses}
          </p>
        </footer>
      </div>
    );
  } finally {
    await store.closePipelineDb(db);
  }
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "good" | "warn" | "bad";
}) {
  const toneClass =
    tone === "good" ? "text-accent" : tone === "warn" ? "text-amber" : "text-red";
  return (
    <div className="rounded-card border border-hairline bg-surface p-5">
      <p className="eyebrow text-ink-muted">{label}</p>
      <p className={`mt-2 font-display text-3xl font-bold tnum ${toneClass}`}>{value}</p>
      <p className="mt-1 text-xs text-ink-muted">{sub}</p>
    </div>
  );
}
