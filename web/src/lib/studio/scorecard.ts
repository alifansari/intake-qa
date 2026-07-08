import { computeSpotCheck, computeLeakage } from "./rubric";

// ---------------------------------------------------------------------------
// Scorecard helpers shared by the editor, the AI-narrative route, and the print
// route: recompute the deterministic fields from inputs, the four NON-DELETABLE
// disclosures (dynamic call count), the signature block, and ref_code generation.
// ---------------------------------------------------------------------------

// Recompute the deterministic score/grade/leakage from the founder's inputs. This
// is what gets persisted to computed_* / leakage_* — always from the rubric, never
// from the LLM.
export function recomputeDeterministic(input: {
  dimensionInputs?: Record<string, number>;
  criticalFails?: string[];
  averageSignedCaseFee?: number | null;
  illustrativeMonthlyRecurrence?: number | null;
}) {
  const spot = computeSpotCheck({
    dimensionInputs: input.dimensionInputs,
    criticalFails: input.criticalFails,
  });
  const leak = computeLeakage({
    averageSignedCaseFee: input.averageSignedCaseFee,
    illustrativeMonthlyRecurrence: input.illustrativeMonthlyRecurrence,
  });
  return { spot, leak };
}

// The four NON-DELETABLE disclosures. The scope/method statement is DYNAMIC on the
// actual number of calls analyzed — never hardcode "n=1". (compliance §V / HARD
// CONSTRAINT #5.) These strings appear verbatim on every scorecard.
export function disclosures(callsAnalyzed: number): {
  scope: string;
  independence: string;
  flatFee: string;
  limitation: string;
} {
  const n = Math.max(0, Math.floor(callsAnalyzed));
  const callWord = n === 1 ? "call" : "calls";
  const scope =
    n === 1
      ? "Scope & method: This is a spot check based on a single recorded intake " +
        "call the firm supplied. One call is not a representative, firm-wide " +
        "measurement of intake performance; it is an illustrative sample."
      : `Scope & method: This is a spot check based on ${n} recorded intake ${callWord} ` +
        "the firm supplied. A spot check of this size is not a representative, " +
        "firm-wide measurement of intake performance; it is an illustrative sample.";

  return {
    scope,
    independence:
      "Independence: This analysis was prepared by an independent scorer. Intake QA " +
      "is not a participant in the firm's fees and has no stake in any case outcome.",
    flatFee:
      "Fee: Intake QA is engaged on a flat monthly fee. Nothing here is priced as a " +
      "percentage of recovery, per case, or tied to any case outcome.",
    limitation:
      "Limitation: I was not engaged to and did not conduct a comprehensive examination; " +
      "had additional procedures been performed, other matters might have come to my attention.",
  };
}

export const SIGNATURE_ANALYST = "Ali Ansari, Analyst of Record";

// ref_code: short, human-readable, unique-enough for a one-off spot check.
// Format: SC-YYYYMMDD-XXXX (XXXX = base36 from a random seed).
export function generateRefCode(now: Date = new Date()): string {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `SC-${y}${m}${d}-${rand}`;
}
