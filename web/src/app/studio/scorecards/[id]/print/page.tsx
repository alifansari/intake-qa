import { notFound } from "next/navigation";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import {
  getSpotCheck,
  getFirm,
  getRecordingForSpotCheck,
} from "@/lib/studio/data";
import { DIMENSIONS, CRITICAL_FAILS } from "@/lib/studio/rubric";
import {
  disclosures,
  pickKeyExcerpt,
  SIGNATURE_ANALYST,
} from "@/lib/studio/scorecard";
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

// The one-page "Intake Quality Audit — Spot Check" scorecard, print-ready.
// Content order follows the spec exactly. Transcript is NOT on the page; only the
// ONE cited excerpt appears (the exhibit). The four non-deletable disclosures +
// signature + date are always present.
export default async function ScorecardPrint({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isStudioConfigured()) return notFound();
  const { id } = await params;
  const { supabase } = await requireFounderPage();
  const sc = await getSpotCheck(supabase, id);
  if (!sc) return notFound();
  const firm = await getFirm(supabase, sc.firm_id);
  const rec = await getRecordingForSpotCheck(supabase, id);

  // Dynamic count of calls analyzed for this spot check (never hardcode n=1).
  const callsAnalyzed = rec ? 1 : 0;
  const disc = disclosures(callsAnalyzed);
  const excerpt = pickKeyExcerpt(rec?.scoring);
  const leak = (sc.leakage_inputs as Record<string, number | null>) ?? {};

  return (
    <div className="scorecard-wrap mx-auto max-w-[8.5in] bg-paper px-[0.75in] py-[0.6in] text-ink">
      {/* Scoped print CSS: one clean page, bank-statement margins. */}
      <style>{`
        @page { size: letter; margin: 0.5in; }
        @media print {
          .no-print { display: none !important; }
          .scorecard-wrap { padding: 0 !important; max-width: none !important; }
          html, body { background: #fff !important; }
        }
        .rule { border-bottom: 1px solid var(--color-line-strong); }
        .hair { border-bottom: 1px solid var(--color-hairline); }
      `}</style>

      <div className="no-print mb-4 flex items-center justify-between">
        {sc.status !== "final" ? (
          <span className="rounded-sm border border-amber/40 bg-amber-tint px-2 py-1 text-[11px] text-amber">
            DRAFT — not finalized. Finalize (with the narrative reviewed) before sharing the PDF.
          </span>
        ) : (
          <span />
        )}
        <PrintButton label="Save as PDF" />
      </div>
      {/* A finalized scorecard has a reviewed narrative (enforced at finalize + by
          the DB CHECK). A draft preview is watermarked so an unreviewed page is
          never mistaken for the final PDF. */}
      {sc.status !== "final" ? (
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
        <div className="eyebrow">Intake Quality Audit — Spot Check</div>
        <h1 className="font-display text-[26px] font-bold leading-tight">
          {firm?.name ?? "Firm"}
        </h1>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted tnum">
          <span>Test date: {dateStr(sc.tested_at)}</span>
          <span>
            Channels/calls analyzed: {callsAnalyzed} {callsAnalyzed === 1 ? "call" : "calls"}
          </span>
          <span>Ref: {sc.ref_code ?? "— (draft)"}</span>
          <span>Analyst of record: Ali Ansari</span>
        </div>
      </header>

      {/* Headline score/grade */}
      <section className="rule flex items-end justify-between py-3">
        <div>
          <div className="eyebrow">Spot-check grade</div>
          <div className="tnum text-4xl font-bold leading-none">
            {sc.computed_grade ?? "—"}
            <span className="ml-3 text-xl text-muted">
              {sc.computed_score ?? "—"} / 100
            </span>
          </div>
        </div>
        {sc.computed_grade === "F" ? (
          <div className="max-w-[46%] rounded-sm border border-red/40 bg-red-tint px-3 py-2 text-[11px] text-red">
            A critical fail was observed; the grade is capped at F regardless of the weighted
            score.
          </div>
        ) : null}
      </section>

      {/* 2) Scope & method honesty */}
      <section className="hair py-3 text-[12px] text-ink">
        <div className="eyebrow mb-1">Scope &amp; method</div>
        <p>{disc.scope}</p>
      </section>

      {/* 3) Observed sequence (facts, no interpretation) — the rubric read-out */}
      <section className="hair py-3">
        <div className="eyebrow mb-2">Observed sequence &amp; rubric</div>
        <table className="w-full text-[11px] tnum">
          <thead>
            <tr className="text-left text-muted">
              <th className="py-0.5 font-medium">Dimension</th>
              <th className="py-0.5 text-right font-medium">Weight</th>
              <th className="py-0.5 text-right font-medium">Observed</th>
            </tr>
          </thead>
          <tbody>
            {DIMENSIONS.map((d) => {
              const v = (sc.dimension_inputs ?? {})[d.key] ?? 0;
              return (
                <tr key={d.key} className="border-t border-hairline">
                  <td className="py-0.5">{d.label}</td>
                  <td className="py-0.5 text-right">{d.weight}</td>
                  <td className="py-0.5 text-right">
                    {v === 100 ? "Good (100)" : v === 50 ? "Partial (50)" : "Poor (0)"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {sc.critical_fails && sc.critical_fails.length > 0 ? (
          <p className="mt-2 text-[11px] text-red">
            Critical fail(s):{" "}
            {sc.critical_fails
              .map((k) => CRITICAL_FAILS.find((c) => c.key === k)?.label ?? k)
              .join("; ")}
            . Grade map: A≥90, B 80–89, C 70–79, D 60–69, F&lt;60; any critical fail caps the
            grade at F.
          </p>
        ) : (
          <p className="mt-2 text-[10px] text-faint">
            Grade map: A≥90, B 80–89, C 70–79, D 60–69, F&lt;60. Any critical fail caps the grade
            at F.
          </p>
        )}
      </section>

      {/* 4) The one expensive failure (exhibit + the ONE cited excerpt) */}
      <section className="hair py-3">
        <div className="eyebrow mb-1">The one expensive failure</div>
        <p className="text-[12px] text-ink">
          {sc.narrative_failure?.trim() || "—"}
        </p>
        {excerpt ? (
          <blockquote className="mt-2 border-l-2 border-line-strong pl-3 text-[11px] italic text-muted">
            “{excerpt}”
          </blockquote>
        ) : null}
      </section>

      {/* 5) What it likely costs (all inputs visible) */}
      <section className="hair py-3">
        <div className="eyebrow mb-1">What it likely costs</div>
        <div className="flex flex-wrap gap-x-6 gap-y-1 text-[12px] tnum">
          <span>Value of one missed signable case: {money(sc.leakage_single_case)}</span>
          <span>
            Illustrative annual: {money(sc.leakage_illustrative_annual)}{" "}
            <span className="text-faint">
              (illustrative — not measured; based on your stated numbers)
            </span>
          </span>
        </div>
        <p className="mt-1 text-[10px] text-faint">
          Inputs: average signed case fee {money(leak.average_signed_case_fee)} ×{" "}
          {leak.illustrative_monthly_recurrence ?? 1}/mo × 12.
        </p>
      </section>

      {/* 6) Recommended fix */}
      <section className="hair py-3">
        <div className="eyebrow mb-1">Recommended fix</div>
        <p className="text-[12px] text-ink">{sc.narrative_fix?.trim() || "—"}</p>
      </section>

      {/* 7) The ask (no manufactured urgency) */}
      <section className="hair py-3 text-[12px] text-ink">
        <div className="eyebrow mb-1">The ask</div>
        <p>
          Measure your real intake calls for a month. A spot check shows what one call looked
          like; a month of your actual calls shows the pattern — and what it is worth to fix it.
        </p>
      </section>

      {/* 8) Attestation / limitations footer + signature + date */}
      <footer className="rule mt-1 pt-3 text-[10px] leading-relaxed text-muted">
        <p className="mb-1">{disc.independence}</p>
        <p className="mb-1">{disc.flatFee}</p>
        <p className="mb-2">{disc.limitation}</p>
        <div className="flex items-end justify-between pt-2 text-ink">
          <div>
            <div className="font-display text-[13px]">{SIGNATURE_ANALYST}</div>
            <div className="text-[10px] text-faint">Independent intake scorer</div>
          </div>
          <div className="text-[11px] tnum">
            {dateStr(sc.finalized_at ?? sc.tested_at)}
          </div>
        </div>
      </footer>
    </div>
  );
}
