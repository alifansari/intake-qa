// SOL Guardian — a SEPARATE analysis pass, wholly independent of the frozen
// scoring engine (scoring/ is never touched). Two layers:
//
//   1. A tiny LLM extraction pass (analysis/sol-guardian.md) that reads the
//      transcript and reports only FACTS: incident date, case type, whether a
//      government entity is involved, whether the plaintiff is a minor. The
//      extractor is INJECTABLE so tests run with a deterministic fake — no key,
//      no network, no cost. The default lazily calls Claude.
//
//   2. Pure, deterministic date math (computeSol) that turns those facts into an
//      ESTIMATED California deadline. This never calls a model, so it is exactly
//      testable and cannot hallucinate a date.
//
// HARD RULE: this is an estimate, not legal advice. Every result carries a
// disclaimer and the UI must show it. An attorney must verify every deadline.

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url)); // web/analysis
const REPO_ROOT = join(HERE, "..", "..");
const PROMPT_PATH = join(REPO_ROOT, "analysis", "sol-guardian.md");

export const SOL_DISCLAIMER =
  "Estimated deadline only — not legal advice. An attorney must independently verify " +
  "every statute of limitations and government-claim date before relying on it.";

// California limitation periods used for the ESTIMATE. These are the common PI
// rules; edge cases (delayed discovery, tolling variants, specific MICRA minor
// rules) are exactly why the disclaimer + attorney verification are mandatory.
const RULES = {
  government_claim: {
    statute: "Cal. Gov. Code §911.2",
    label: "Government tort claim",
    months: 6,
  },
  medical_malpractice: {
    statute: "Cal. Code Civ. Proc. §340.5 (MICRA)",
    label: "Medical malpractice (MICRA)",
    years: 1,
  },
  general_pi: {
    statute: "Cal. Code Civ. Proc. §335.1",
    label: "General personal injury",
    years: 2,
  },
};

// --- date helpers (UTC, calendar-correct month/year addition) ----------------
function addMonths(iso, months) {
  const d = new Date(`${iso}T00:00:00Z`);
  const target = new Date(d);
  target.setUTCMonth(target.getUTCMonth() + months);
  // Guard month overflow (e.g. Aug 31 + 6mo): clamp to end of the target month.
  if (target.getUTCDate() !== d.getUTCDate()) target.setUTCDate(0);
  return target;
}
function addYears(iso, years) {
  return addMonths(iso, years * 12);
}
function isoDate(d) {
  return d.toISOString().slice(0, 10);
}
function daysBetween(fromIso, toDate) {
  const from = new Date(`${fromIso}T00:00:00Z`).getTime();
  return Math.round((toDate.getTime() - from) / 86_400_000);
}

// Which rule applies. Government claim wins — it is by far the shortest and most
// often missed. Then MICRA. Otherwise the general 2-year PI statute.
export function selectRule({ caseType, governmentDefendant }) {
  if (governmentDefendant) return "government_claim";
  if (caseType === "medical_malpractice") return "medical_malpractice";
  return "general_pi";
}

export function urgencyBand(daysRemaining) {
  if (daysRemaining == null) return "unknown";
  if (daysRemaining < 0) return "expired";
  if (daysRemaining <= 30) return "critical";
  if (daysRemaining <= 90) return "soon";
  return "ok";
}

// Pure: compute the estimated deadline from extracted facts. `now` defaults to
// today; `today` is the reference date for "days remaining".
export function computeSol({
  incidentDate,
  caseType = "unknown",
  governmentDefendant = false,
  minor = false,
  now = new Date(),
} = {}) {
  const notes = [];
  if (minor) {
    notes.push(
      governmentDefendant
        ? "Plaintiff is a minor, but the 6-month government-claim deadline is generally NOT tolled for minors — treat as urgent."
        : "Plaintiff is a minor — tolling under CCP §352 likely extends this deadline (often until age 18). Do not assume it is expired; verify the date of birth."
    );
  }

  if (!incidentDate) {
    return {
      applicable: null,
      statute: null,
      periodLabel: null,
      incidentDate: null,
      deadlineDate: null,
      daysRemaining: null,
      urgency: "unknown",
      minorTollingMayApply: Boolean(minor),
      notes: ["No incident date detected — an attorney must establish it before any deadline can be computed.", ...notes],
      disclaimer: SOL_DISCLAIMER,
    };
  }

  const key = selectRule({ caseType, governmentDefendant });
  const rule = RULES[key];
  const deadline =
    rule.months != null ? addMonths(incidentDate, rule.months) : addYears(incidentDate, rule.years);
  const daysRemaining = daysBetween(isoDate(new Date(now)), deadline);
  // Minor tolling can push a NON-government deadline out; never report "expired"
  // for a tolled minor — flag it for verification instead.
  let urgency = urgencyBand(daysRemaining);
  if (minor && !governmentDefendant && urgency === "expired") urgency = "critical";

  const periodLabel = rule.months != null ? `${rule.months} months` : `${rule.years} year${rule.years > 1 ? "s" : ""}`;

  return {
    applicable: key,
    statute: rule.statute,
    ruleLabel: rule.label,
    periodLabel,
    incidentDate,
    deadlineDate: isoDate(deadline),
    daysRemaining,
    urgency,
    minorTollingMayApply: Boolean(minor && !governmentDefendant),
    notes,
    disclaimer: SOL_DISCLAIMER,
  };
}

// --- default (production) extractor: Claude via analysis/sol-guardian.md ------
// Lazy-imports the Anthropic SDK so the pilot/tests need no dependency and no
// key; only reached when the real default runs on the server.
async function defaultExtractor({ transcript, now = new Date() }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing");
  // Computed specifier so Turbopack doesn't bundle the SDK into a Next route.
  const sdk = "@anthropic-ai/sdk";
  const { default: Anthropic } = await import(sdk);
  const client = new Anthropic({ apiKey });
  const system = readFileSync(PROMPT_PATH, "utf8");
  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    temperature: 0,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [
      {
        role: "user",
        content: `Call date (for resolving relative dates): ${isoDate(new Date(now))}\n\nTRANSCRIPT:\n\n${transcript}`,
      },
    ],
  });
  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("SOL extractor returned no JSON");
  return JSON.parse(text.slice(start, end + 1));
}

// Orchestrate: extract facts (injectable) then compute the estimate (pure).
export async function runSolGuardian({ transcript, extractor = defaultExtractor, now = new Date() } = {}) {
  const facts = await extractor({ transcript, now });
  const result = computeSol({
    incidentDate: facts?.incident_date ?? null,
    caseType: facts?.case_type ?? "unknown",
    governmentDefendant: facts?.government_defendant === true,
    minor: facts?.plaintiff_is_minor === true,
    now,
  });
  return { ...result, facts };
}
