import { notFound } from "next/navigation";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { getFirm } from "@/lib/studio/data";
import {
  getShop,
  listShopChannels,
  listPeerBenchmarks,
  type PeerBenchmarkRow,
} from "@/lib/studio/shops-data";
import {
  SHOP_CHANNELS,
  channelLabel,
  computeShopSummary,
  computeBenchmarkRank,
  pickWorstChannel,
  formatLatency,
  shopDisclosures,
  type BenchmarkRank,
} from "@/lib/studio/shops";
import { SIGNATURE_ANALYST } from "@/lib/studio/scorecard";
import { PrintButton } from "@/components/print-button";

export const dynamic = "force-dynamic";

function money(n: number | null | undefined): string {
  return n == null ? "—" : `$${Number(n).toLocaleString("en-US")}`;
}
function dateStr(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
function gradeWord(g: string | null): string {
  if (g === "captured") return "CAPTURED";
  if (g === "fumbled") return "FUMBLED";
  if (g === "lost") return "LOST";
  return "Not graded";
}

// The one-page "Intake Coverage Audit — Mystery Shop" report, print-ready.
// Leads with the firm's own lost leads (never with any product or AI). Every
// number is deterministic; the peer benchmark is labeled ILLUSTRATIVE whenever
// any contributing row is seed data; the non-deletable disclosures + signature
// + date are always present (same conventions as the Spot Check scorecard).
export default async function ShopReport({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isStudioConfigured()) return notFound();
  const { id } = await params;
  const { supabase } = await requireFounderPage();
  const shop = await getShop(supabase, id);
  if (!shop) return notFound();
  const [firm, channels] = await Promise.all([
    getFirm(supabase, shop.firm_id),
    listShopChannels(supabase, id),
  ]);

  let peers: PeerBenchmarkRow[] = [];
  if (shop.market) {
    peers = await listPeerBenchmarks(supabase, shop.market).catch(() => []);
  }

  const summary = computeShopSummary(channels);
  const worst = pickWorstChannel(channels);
  const leak = (shop.leakage_inputs as Record<string, number | null>) ?? {};

  // Ranked lines per graded channel; below the minimum cohort no line appears
  // at all (a comparative rank is a claim — no citation, no claim).
  const ranks = new Map<string, BenchmarkRank>();
  for (const c of channels) {
    const r = computeBenchmarkRank(c, peers);
    if (r) ranks.set(c.channel, r);
  }
  const benchmarkShown = ranks.size > 0;
  const benchmarkIsSeed = [...ranks.values()].some((r) => r.isSeed);
  const disc = shopDisclosures({
    channelsShopped: summary.shopped,
    benchmarkShown,
    benchmarkIsSeed,
  });

  const orderedChannels = SHOP_CHANNELS.map((def) =>
    channels.find((c) => c.channel === def.key),
  ).filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div className="report-wrap mx-auto max-w-[8.5in] bg-paper px-[0.75in] py-[0.6in] text-ink">
      {/* Scoped print CSS: one clean page, bank-statement margins. */}
      <style>{`
        @page { size: letter; margin: 0.5in; }
        @media print {
          .no-print { display: none !important; }
          .report-wrap { padding: 0 !important; max-width: none !important; }
          html, body { background: #fff !important; }
        }
        .rule { border-bottom: 1px solid var(--color-line-strong); }
        .hair { border-bottom: 1px solid var(--color-hairline); }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        {shop.status !== "final" ? (
          <span className="rounded-sm border border-amber/40 bg-amber-tint px-2 py-1 text-[11px] text-amber">
            DRAFT — not finalized. Finalize (protocol attested + narrative reviewed) before
            sharing the PDF.
          </span>
        ) : (
          <span />
        )}
        <PrintButton label="Save as PDF" />
      </div>
      {shop.status !== "final" ? (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 flex items-center justify-center"
          style={{ zIndex: 0 }}
        >
          <span className="rotate-[-30deg] text-[120px] font-bold text-hairline opacity-40 select-none">
            DRAFT
          </span>
        </div>
      ) : null}

      {/* 1) Header / engagement block */}
      <header className="rule pb-3">
        <div className="eyebrow">Intake Coverage Audit — Mystery Shop</div>
        <h1 className="font-display text-[26px] font-bold leading-tight">
          {firm?.name ?? "Firm"}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted tnum">
          <span>
            Shop window: {dateStr(shop.shopped_from)} – {dateStr(shop.shopped_to)}
          </span>
          <span>
            Channels shopped: {summary.shopped}{" "}
            {summary.shopped === 1 ? "channel" : "channels"}
          </span>
          <span>Ref: {shop.ref_code ?? "— (draft)"}</span>
          <span>Analyst of record: Ali Ansari</span>
        </div>
      </header>

      {/* Headline — the firm's own lost leads, front and center */}
      <section className="rule flex items-end justify-between py-3">
        <div>
          <div className="eyebrow">What a new client experienced</div>
          <div className="tnum text-4xl font-bold leading-none">
            {summary.notCaptured}
            <span className="ml-3 text-xl text-muted">
              of {summary.graded} graded {summary.graded === 1 ? "attempt" : "attempts"} lost
              or fumbled
            </span>
          </div>
          <div className="mt-1 text-[11px] text-muted tnum">
            Captured {summary.captured} · Fumbled {summary.fumbled} · Lost {summary.lost}
          </div>
        </div>
      </section>

      {/* 2) Scope & method honesty */}
      <section className="hair py-3 text-[12px] text-ink">
        <div className="eyebrow mb-1">Scope &amp; method</div>
        <p>{disc.scope}</p>
        <p className="mt-1 text-[11px] text-muted">{disc.methodology}</p>
      </section>

      {/* 3) The per-channel read-out (facts, no interpretation) */}
      <section className="hair py-3">
        <div className="eyebrow mb-2">What happened, channel by channel</div>
        <table className="w-full text-[11px] tnum">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-0.5 font-medium">Channel</th>
              <th className="py-0.5 text-right font-medium">Rings</th>
              <th className="py-0.5 text-right font-medium">Response</th>
              <th className="py-0.5 text-right font-medium">Answered by</th>
              <th className="py-0.5 text-right font-medium">Result</th>
            </tr>
          </thead>
          <tbody>
            {orderedChannels.map((c) => (
              <tr key={c.channel} className="border-t border-hairline">
                <td className="py-0.5">{channelLabel(c.channel)}</td>
                <td className="py-0.5 text-right">{c.ring_count ?? "—"}</td>
                <td className="py-0.5 text-right">
                  {c.response_latency_seconds != null
                    ? formatLatency(c.response_latency_seconds)
                    : "never"}
                </td>
                <td className="py-0.5 text-right">
                  {c.answered_by === "human"
                    ? "Human"
                    : c.answered_by === "machine"
                      ? "Machine"
                      : c.answered_by === "none"
                        ? "No answer"
                        : "—"}
                </td>
                <td
                  className={`py-0.5 text-right font-medium ${
                    c.grade === "captured" ? "text-ink" : "text-red"
                  }`}
                >
                  {gradeWord(c.grade)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-[10px] text-faint">
          Captured: a person (or working system) responded, gathered contact and incident
          basics, and secured a next step. Fumbled: a response that failed to capture the lead
          or came too slowly to win it. Lost: no meaningful response at all.
        </p>
      </section>

      {/* 4) Peer benchmark — only when a big-enough cohort exists; ALWAYS labeled
             illustrative while seeded */}
      {benchmarkShown ? (
        <section className="hair py-3">
          <div className="eyebrow mb-1">
            Peer comparison{benchmarkIsSeed ? " — ILLUSTRATIVE (seed data)" : ""}
          </div>
          <ul className="text-[12px] text-ink">
            {[...ranks.entries()].map(([channel, r]) => (
              <li key={channel} className="tnum">
                {r.label}
                {r.isSeed ? (
                  <span className="ml-2 text-[10px] text-faint">(illustrative seed data)</span>
                ) : null}
              </li>
            ))}
          </ul>
          {disc.benchmark ? (
            <p className="mt-1 text-[10px] text-faint">{disc.benchmark}</p>
          ) : null}
        </section>
      ) : null}

      {/* 5) The one expensive failure (narrative + the field-note evidence) */}
      <section className="hair py-3">
        <div className="eyebrow mb-1">The one expensive failure</div>
        <p className="text-[12px] text-ink">{shop.narrative_failure?.trim() || "—"}</p>
        {worst?.notes?.trim() ? (
          <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-[11px] italic text-muted">
            Field note — {channelLabel(worst.channel ?? "")}: “{worst.notes.trim()}”
          </blockquote>
        ) : null}
      </section>

      {/* 6) What it likely costs (all inputs visible; blank if no attorney fee) */}
      <section className="hair py-3">
        <div className="eyebrow mb-1">What it likely costs</div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] tnum">
          <span>Value of one missed signable case: {money(shop.leakage_single_case)}</span>
          <span>
            Illustrative annual: {money(shop.leakage_illustrative_annual)}{" "}
            <span className="text-faint">
              (illustrative — not measured; based on your stated numbers)
            </span>
          </span>
        </div>
        <p className="mt-1 text-[10px] text-faint">
          Inputs: average signed case fee {money(leak.average_signed_case_fee)} ×{" "}
          {leak.illustrative_monthly_recurrence ?? 1}/mo × 12. This shop found{" "}
          {summary.notCaptured} of {summary.graded} graded attempts lost or fumbled.
        </p>
      </section>

      {/* 7) Recommended fix */}
      <section className="hair py-3">
        <div className="eyebrow mb-1">Recommended fix</div>
        <p className="text-[12px] text-ink">{shop.narrative_fix?.trim() || "—"}</p>
      </section>

      {/* 8) The ask (no manufactured urgency) */}
      <section className="hair py-3 text-[12px] text-ink">
        <div className="eyebrow mb-1">The ask</div>
        <p>
          Re-shop these channels after the fix. This audit shows what a new client experienced
          on these attempts; a follow-up shop shows whether the front door actually closed the
          gap.
        </p>
      </section>

      {/* 9) Attestation / limitations footer + signature + date */}
      <footer className="rule mt-1 pt-3 text-[10px] leading-relaxed text-muted">
        <p className="mb-1">{disc.independence}</p>
        <p className="mb-1">{disc.flatFee}</p>
        <p className="mb-2">{disc.limitation}</p>
        <div className="flex items-end justify-between pt-2 text-ink">
          <div>
            <div className="font-display text-[13px]">{SIGNATURE_ANALYST}</div>
            <div className="text-[10px] text-faint">Independent intake scorer</div>
          </div>
          <div className="text-[11px] tnum">{dateStr(shop.finalized_at ?? shop.created_at)}</div>
        </div>
      </footer>
    </div>
  );
}
