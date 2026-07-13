// Intake Leak Report — composition layer (Stage 3). Pure: turns validated leak
// data into an ordered DOCUMENT MODEL shared by the PDF and web view. Enforces the
// hard content rules in code:
//   - ONLY strong flags, non-expired, count toward page-one numbers + schedule subtotal.
//   - Expired statutes never in the headline or recoverable count; shown only in exclusions.
//   - Conservative anchor: headline low = arithmetic sum of the shown strong, non-expired rows.
//   - System-not-person lint: staff-name blame in findings FAILS generation.
//   - Mandatory SOL disclaimer (from sol.mjs) rides with every deadline.
//   - Badges standardized to CRITICAL / SOON / OK / EXPIRED (mapped from sol.mjs urgencyBand).

import { fmtMoney, fmtMoneyRange, fmtDate, readoutId, feeDerivationLine, falseAlarmFooter } from "../../pdf/doc-helpers.mjs";
import { urgencyBand, SOL_DISCLAIMER } from "../../../analysis/sol.mjs";
import { LEAK_TAGS, tagCounts, validateTags } from "../../../analysis/leak-taxonomy.mjs";
import {
  PAGE_ONE_LABELS,
  verdictSentence,
  nextActionLine,
  scopeBlock,
  FINDINGS_SUMMARY_INTRO,
  exclusionsIntro,
  COULD_NOT_DETERMINE_INTRO,
  GUARANTEE_BOX,
  methodologyAppendix,
  analystSignoff,
  coverMemo,
} from "./copy.mjs";
import { ANALYST } from "../analyst.mjs";

// Map sol.mjs urgencyBand output → the report’s standardized badge label.
export function badgeFor(leak) {
  if (leak.statuteExpired) return "EXPIRED";
  const b = urgencyBand(leak.statuteDays);
  if (b === "critical") return "CRITICAL";
  if (b === "soon") return "SOON";
  if (b === "expired") return "EXPIRED";
  return "OK";
}

// System-not-person lint. Throws if any finding text blames a named individual.
const BLAME_VERB = /\b([A-Z][a-z]{2,})\s+(failed|forgot|didn'?t|did not|missed|dropped|ignored|neglected|refused)\b/;
const NAMED_ROLE = /\b(receptionist|intake|staffer|rep|agent|assistant)\s+named\s+[A-Z][a-z]+/i;
export function lintNoStaffNames(texts) {
  for (const t of texts) {
    const s = String(t ?? "");
    if (BLAME_VERB.test(s) || NAMED_ROLE.test(s)) {
      throw new Error(`system-not-person lint: findings must be process-level, not individual blame. Offending text: "${s.slice(0, 80)}"`);
    }
  }
}

const RECOMMENDED = {
  "no-callback-commitment": "Have staff place a same-day callback and send the follow-up draft in the queue.",
  "unhandled-objection": "Have staff call back and directly address the concern the caller raised.",
  "transfer-dropped": "Have staff re-contact and complete the intake that the dropped transfer interrupted.",
  "quote-only-no-close": "Have staff call back to set a concrete next step and offer to sign.",
  "language-mismatch": "Route the callback to a bilingual staffer and send the Spanish follow-up draft.",
  "statute-urgency-missed": "Escalate immediately: the statute clock is closing; place the callback today.",
  "qualification-incomplete": "Have staff call back to finish screening the qualifying facts.",
};

// Build the ordered document model. `data` mirrors DocData from demo-fixture.
/**
 * @param {any} data
 * @param {{ now?: string, falseAlarm?: { ratePct: number | null, updatedDate: string | null } | null }} [opts]
 */
export function composeLeakReport(data, { now = "2026-07-05", falseAlarm = null } = {}) {
  const leaks = data.leaks ?? [];

  // Validate taxonomy (exactly one valid tag per leak).
  const tags = validateTags(leaks);
  if (!tags.ok) throw new Error(`taxonomy: ${tags.errors.join("; ")}`);

  // Partition.
  const strong = leaks.filter((l) => l.confidence === "strong" && !l.statuteExpired);
  const moderate = leaks.filter((l) => l.confidence === "moderate");
  const expired = leaks.filter((l) => l.statuteExpired);
  // Recoverable now = strong, non-expired, not already lapsed.
  const recoverable = strong.filter((l) => l.saveStatus !== "Statute lapsed");

  // Page-one numbers derive ONLY from strong, non-expired rows.
  const feeLow = strong.reduce((a, l) => a + l.feeLowCents, 0);
  const feeHigh = strong.reduce((a, l) => a + l.feeHighCents, 0);

  // Exhibits in severity order (most-urgent statute first among the counted rows).
  const bandRank = { CRITICAL: 0, SOON: 1, OK: 2, EXPIRED: 3 };
  const exhibits = strong
    .slice()
    .sort((a, b) => bandRank[badgeFor(a)] - bandRank[badgeFor(b)])
    .map((l, i) => ({
      n: i + 1,
      initials: l.callerInitials,
      displayId: l.callerId,
      caseType: l.caseType,
      callDate: fmtDate(l.callDate),
      channel: l.channel,
      qualifyingFacts: l.qualifyingFacts,
      excerpt: l.excerpt ?? null,
      feeRange: fmtMoneyRange(l.feeLowCents, l.feeHighCents),
      // Per-exhibit fee derivation (P0-C): shown when the case-value band is known.
      feeDerivation:
        l.caseLowCents != null && l.caseHighCents != null
          ? feeDerivationLine({
              feeLowCents: l.feeLowCents,
              feeHighCents: l.feeHighCents,
              caseLowCents: l.caseLowCents,
              caseHighCents: l.caseHighCents,
              basis: l.feeBasis ?? null,
            })
          : (l.feeDerivation ?? null),
      confidence: l.confidence, // for the grayscale-safe tier chip (P1)
      badge: badgeFor(l),
      tag: l.tag,
      tagDef: LEAK_TAGS[l.tag],
      recommendedAction: RECOMMENDED[l.tag],
      disclaimer: SOL_DISCLAIMER,
    }));

  // Most-urgent counted case → the "fastest win" next-action line.
  const mostUrgent = exhibits[0];

  // System-not-person lint over all findings content (not the copy/signoff blocks).
  lintNoStaffNames([
    data.analystNote ?? "",
    ...leaks.flatMap((l) => (l.qualifyingFacts ?? []).map((f) => f.text)),
    ...exhibits.map((e) => e.recommendedAction),
  ]);

  const reportId = readoutId(data.firmCode, data.year, data.seq);
  const { counts } = tagCounts(leaks);

  // Resolve the exact statute deadline for the most-urgent case. Prefer an explicit
  // deadlineDate carried on the leak (from sol.mjs computeSol upstream); otherwise
  // derive it from the days-remaining that already drives the urgency badge, so the
  // printed date and the "N days" figure are always consistent. Never invent one.
  // mostUrgent can be undefined when every leaked call is moderate-confidence
  // (leaks.length > 0 but strong/exhibits are empty) — page-one numbers then
  // legitimately read $0 and the cover memo/next-action are already null-guarded.
  // Guard this lookup too, or `.displayId` throws a 500 on that real-data case.
  const mostUrgentLeak = mostUrgent
    ? leaks.find((l) => l.callerId === mostUrgent.displayId)
    : null;
  const muDays = mostUrgentLeak?.statuteDays;
  const deadlineText = mostUrgentLeak?.deadlineDate
    ? fmtDate(mostUrgentLeak.deadlineDate)
    : typeof muDays === "number"
      ? fmtDate(new Date(new Date(now).getTime() + muDays * 86400000))
      : "a date your attorney must confirm";

  const coverMemoText =
    exhibits.some((e) => e.badge === "CRITICAL")
      ? coverMemo({
          date: fmtDate(now),
          firm: data.firmName,
          caseType: mostUrgent.caseType,
          deadline: deadlineText,
          days: muDays ?? "[days]",
          exhibit: mostUrgent.n,
        })
      : null;

  return {
    meta: {
      firmName: data.firmName,
      reportId,
      periodLabel: data.periodLabel,
      analystName: data.analystName ?? ANALYST.name,
      issuedDate: fmtDate(data.issuedDate),
    },
    coverMemo: coverMemoText,
    pageOne: {
      labels: PAGE_ONE_LABELS,
      count: strong.length,
      feeRange: fmtMoneyRange(feeLow, feeHigh),
      feeLowCents: feeLow,
      feeHighCents: feeHigh,
      recoverable: recoverable.length,
      // Strong/moderate split on page one (P1): moderate flags are shown for
      // completeness but excluded from the counted numbers.
      split: { strong: strong.length, moderate: moderate.length, expired: expired.length },
      // Dated "Do these 3 things this week" box (P1): case id + deadline + owner slot.
      threeActions: mostUrgent
        ? [
            `Pull ${mostUrgent.caseType} case ${mostUrgent.displayId} (Exhibit ${mostUrgent.n}) — statute deadline ${deadlineText}. Assign to: ___`,
            `Place a same-day callback on the ${recoverable.length} recoverable case${recoverable.length === 1 ? "" : "s"} and log the outcome. Assign to: ___`,
            `Confirm the statute math on every CRITICAL/SOON case with your attorney by ${fmtDate(new Date(new Date(now).getTime() + 7 * 86400000))}. Assign to: ___`,
          ]
        : [],
      verdict: verdictSentence({
        n: data.reconciliation?.processed ?? leaks.length,
        period: data.periodLabel,
        x: strong.length,
        y: recoverable.length,
        low: fmtMoney(feeLow),
        high: fmtMoney(feeHigh),
      }),
      nextAction: mostUrgent
        ? nextActionLine({ caseType: mostUrgent.caseType, page: mostUrgent.n, badge: mostUrgent.badge })
        : null,
    },
    scope: scopeBlock({
      n: data.reconciliation?.processed ?? leaks.length,
      period: data.periodLabel,
      channelsReviewed: [...new Set(leaks.map((l) => l.channel))].join(", "),
      notReviewed: "web-form and email intake, and any calls handled outside these channels",
    }),
    exhibits,
    schedule: {
      rows: strong.map((l) => ({ caseType: l.caseType, feeRange: fmtMoneyRange(l.feeLowCents, l.feeHighCents), feeLowCents: l.feeLowCents })),
      subtotalLow: feeLow,
      subtotalHigh: feeHigh,
      exclusions: [
        ...moderate.map((l) => ({ label: `${l.callerInitials} · ${l.caseType}`, reason: "moderate confidence, excluded from totals" })),
        ...expired.map((l) => ({ label: `${l.callerInitials} · ${l.caseType}`, reason: "statute expired" })),
      ],
      headlineLow: feeLow, // visibly equals the sum of the shown strong, non-expired rows
      headlineHigh: feeHigh,
      exclusionsIntro: exclusionsIntro({ total: leaks.length, strong: strong.length }),
    },
    findingsSummary: {
      intro: FINDINGS_SUMMARY_INTRO,
      counts: Object.entries(counts).map(([tag, count]) => ({ tag, def: LEAK_TAGS[tag], count })),
    },
    couldNotDetermine: {
      intro: COULD_NOT_DETERMINE_INTRO,
      items: data.couldNotDetermine ?? [],
    },
    guarantee: GUARANTEE_BOX,
    methodology: methodologyAppendix({ low: "$8,000", high: "$14,000" }),
    signoff: analystSignoff(),
    // Published false-alarm rate — rides on every deliverable (P0-D / §IV).
    falseAlarmLine: falseAlarmFooter({
      ratePct: falseAlarm?.ratePct ?? null,
      updatedDate: falseAlarm?.updatedDate ?? null,
    }),
  };
}
