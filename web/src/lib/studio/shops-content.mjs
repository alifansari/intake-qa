// ============================================================================
// "The Mirror" — mystery-shop audit content + math. DETERMINISTIC.
//
// This module is the single source of truth for everything computed on the
// multi-channel shop report: the channel/grade vocabularies, the headline
// counts, the anonymized peer-benchmark ranking, the disclosures, and the
// deterministic (no-LLM) narrative draft. NO LLM is involved in any number or
// rank here — the AI may only rewrite prose elsewhere, behind the human-review
// gate (same compliance stance as rubric.mjs).
//
// Authored as .mjs so the node --test runner and the Next runtime both import
// it with zero build step (the repo's established pattern); shops.ts re-exports
// with types.
// ============================================================================

// --- The four shopped channels ----------------------------------------------
export const SHOP_CHANNELS = [
  { key: "after_hours_call", label: "After-hours call", kind: "call" },
  { key: "weekend_call", label: "Weekend call", kind: "call" },
  { key: "web_form", label: "Web form", kind: "web" },
  { key: "website_chat", label: "Website chat", kind: "web" },
];

// --- The three grades (founder-entered structured fact; never LLM output) ----
// CAPTURED — a human (or a compliant system) responded, gathered contact +
//            incident basics, and secured a concrete next step.
// FUMBLED  — someone responded, but failed to capture contact info / secure a
//            next step, or responded too slowly to realistically win the lead.
// LOST     — no meaningful response: unanswered, voicemail dead-end, or a
//            form/chat that nobody ever answered.
export const SHOP_GRADES = [
  { key: "captured", label: "Captured" },
  { key: "fumbled", label: "Fumbled" },
  { key: "lost", label: "Lost" },
];

export const ANSWERED_BY = [
  { key: "human", label: "Human" },
  { key: "machine", label: "Machine" },
  { key: "none", label: "No answer" },
];

const CHANNEL_KEYS = new Set(SHOP_CHANNELS.map((c) => c.key));
const GRADE_KEYS = new Set(SHOP_GRADES.map((g) => g.key));

export function isShopChannelKey(k) {
  return CHANNEL_KEYS.has(k);
}
export function isShopGradeKey(k) {
  return GRADE_KEYS.has(k);
}
export function channelLabel(key) {
  return SHOP_CHANNELS.find((c) => c.key === key)?.label ?? key;
}

// --- CIPA-safe fieldwork attestation (compliance-invariants §II) -------------
// The founder must affirmatively attest this BEFORE a shop report can be
// finalized (DB CHECK studio_shops_final_requires_protocol backs it up).
// Mystery-shop fieldwork never records the firm's staff without a consent
// basis, runs only a fixed approved scenario, and the scenario is signed off
// before any dialing.
export const SHOP_PROTOCOL_TEXT_VERSION = "shop-protocol-v1-2026-07";
export const SHOP_PROTOCOL_TEXT =
  "I attest this mystery shop followed the approved CIPA-safe protocol: a fixed, " +
  "pre-approved scenario; contemporaneous written field notes only — no call was " +
  "recorded without a lawful consent basis; and the scenario was signed off by the " +
  "named compliance reviewer before any fieldwork began.";

// --- Headline counts ---------------------------------------------------------
// A channel with grade null is "not graded yet" and EXCLUDED from every count
// (never counted as a failure by default — same honesty stance as the rubric's
// "Not assessed").
/**
 * @param {Array<{channel?: string, grade?: string|null}>} channels
 * @returns {{ shopped:number, graded:number, captured:number, fumbled:number,
 *             lost:number, notCaptured:number }}
 */
export function computeShopSummary(channels = []) {
  const rows = Array.isArray(channels) ? channels : [];
  const graded = rows.filter((r) => GRADE_KEYS.has(r?.grade));
  const count = (g) => graded.filter((r) => r.grade === g).length;
  const captured = count("captured");
  const fumbled = count("fumbled");
  const lost = count("lost");
  return {
    shopped: rows.length,
    graded: graded.length,
    captured,
    fumbled,
    lost,
    notCaptured: fumbled + lost,
  };
}

// --- Peer benchmark ranking --------------------------------------------------
// Rank the shopped firm against the anonymized peer cohort for ONE channel.
// Ordering (best → worst): grade first (captured > fumbled > lost), then
// response latency (lower is better; null latency sorts worst within a grade),
// then ring count (lower is better). Standard competition ranking ("1224"):
// the firm's rank is 1 + the number of peers strictly better than it, so exact
// ties share the better rank.
//
// A ranked comparative line is a CLAIM (compliance-invariants §IV/§V), so:
//   * below MIN_BENCHMARK_COHORT peers we return null — no rank is shown at all;
//   * if ANY contributing peer row is seed data, isSeed=true and the caller
//     MUST label the line as illustrative.
export const MIN_BENCHMARK_COHORT = 3;

const GRADE_ORDER = { captured: 0, fumbled: 1, lost: 2 };

// Comparable tuple: smaller is better. Null grade is treated as worst (but the
// firm's own channel must be graded for a rank to exist at all).
function rankKey(row) {
  const g = GRADE_ORDER[row?.grade] ?? 3;
  const latency =
    typeof row?.response_latency_seconds === "number" && row.response_latency_seconds >= 0
      ? row.response_latency_seconds
      : Number.POSITIVE_INFINITY;
  const rings =
    typeof row?.ring_count === "number" && row.ring_count >= 0
      ? row.ring_count
      : Number.POSITIVE_INFINITY;
  return [g, latency, rings];
}

function keyCompare(a, b) {
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return a[i] < b[i] ? -1 : 1;
  }
  return 0;
}

export function ordinal(n) {
  const v = Math.abs(Math.trunc(n));
  const mod100 = v % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (v % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

/**
 * @param {{channel:string, grade?:string|null, response_latency_seconds?:number|null, ring_count?:number|null}} firmChannel
 * @param {Array<{channel:string, grade?:string|null, response_latency_seconds?:number|null, ring_count?:number|null, is_seed?:boolean}>} peerRows
 * @returns {{ rank:number, cohortSize:number, isSeed:boolean, label:string } | null}
 */
export function computeBenchmarkRank(firmChannel, peerRows = []) {
  if (!firmChannel || !GRADE_KEYS.has(firmChannel.grade)) return null; // ungraded → no claim
  const peers = (Array.isArray(peerRows) ? peerRows : []).filter(
    (p) => p && p.channel === firmChannel.channel,
  );
  if (peers.length < MIN_BENCHMARK_COHORT) return null; // cohort too small → no claim

  const mine = rankKey(firmChannel);
  const strictlyBetter = peers.filter((p) => keyCompare(rankKey(p), mine) < 0).length;
  const rank = 1 + strictlyBetter;
  const cohortSize = peers.length + 1; // peers + the shopped firm
  const isSeed = peers.some((p) => p.is_seed === true);
  const label =
    `${ordinal(rank)} of ${cohortSize} firms shopped in this area for ` +
    `${channelLabel(firmChannel.channel).toLowerCase()} response`;
  return { rank, cohortSize, isSeed, label };
}

// --- Disclosures (non-deletable; printed on every report) --------------------
// Mirrors scorecard-content.mjs: scope is DYNAMIC on what was actually shopped;
// the benchmark disclosure appears whenever a ranked line is shown, with the
// seed/illustrative sentence REQUIRED while any contributing row is seed data.
export function shopDisclosures({ channelsShopped = 0, benchmarkShown = false, benchmarkIsSeed = false } = {}) {
  const n = Math.max(0, Math.floor(Number(channelsShopped) || 0));
  const chWord = n === 1 ? "channel" : "channels";
  const d = {
    scope:
      `Scope & method: This is a mystery-shop audit of ${n} intake ${chWord} ` +
      "(a single structured attempt per channel during the stated window). A shop of this " +
      "size is not a representative, firm-wide measurement of intake performance; it is an " +
      "illustrative sample of what a new client experienced on those attempts.",
    methodology:
      "Fieldwork: Each attempt followed a fixed, pre-approved scenario with contemporaneous " +
      "written field notes. No call was recorded without a lawful consent basis (California " +
      "is an all-party-consent state).",
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
  if (benchmarkShown) {
    d.benchmark = benchmarkIsSeed
      ? "Peer benchmark: The peer comparison shown is ILLUSTRATIVE SEED DATA, not measured " +
        "results from firms in your area. It demonstrates the format of the benchmark; it is " +
        "not a factual ranking claim."
      : "Peer benchmark: Peer firms were shopped with the same fixed scenario during the same " +
        "window and are reported anonymously. Rankings reflect only these shop attempts.";
  }
  return d;
}

// ref_code: MS-YYYYMMDD-XXXX (Mystery Shop; same shape as the scorecard's SC- code).
export function generateShopRefCode(now = new Date()) {
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const rand = Math.floor(Math.random() * 36 ** 4)
    .toString(36)
    .toUpperCase()
    .padStart(4, "0");
  return `MS-${y}${m}${d}-${rand}`;
}

// --- Worst channel + deterministic narrative draft ---------------------------
// The report leads with the firm's own lost leads. The "one expensive failure"
// is the worst-graded channel (lost > fumbled; tie-break: slowest response).
// Returns null when nothing graded is worse than captured — we never invent a
// failure (no citation, no claim).
export function pickWorstChannel(channels = []) {
  const graded = (Array.isArray(channels) ? channels : []).filter((r) =>
    GRADE_KEYS.has(r?.grade),
  );
  const bad = graded.filter((r) => r.grade !== "captured");
  if (bad.length === 0) return null;
  return bad.slice().sort((a, b) => keyCompare(rankKey(b), rankKey(a)))[0];
}

function describeChannelFacts(row) {
  const parts = [];
  if (typeof row.ring_count === "number") parts.push(`${row.ring_count} rings`);
  if (typeof row.response_latency_seconds === "number") {
    parts.push(`${formatLatency(row.response_latency_seconds)} to a response`);
  }
  if (row.answered_by === "none") parts.push("no one ever answered");
  else if (row.answered_by === "machine") parts.push("answered by a machine, not a person");
  else if (row.answered_by === "human") parts.push("answered by a person");
  return parts.join(", ");
}

export function formatLatency(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.round(s / 60)}m`;
  if (s < 86400) {
    const h = s / 3600;
    return `${h % 1 === 0 ? h : h.toFixed(1)}h`;
  }
  const d = s / 86400;
  return `${d % 1 === 0 ? d : d.toFixed(1)}d`;
}

// Deterministic, grounded draft of the two narrative fields — NO LLM. Built
// only from the founder's structured channel facts + field notes, so every
// sentence traces to entered evidence. Used to pre-fill the report (the AI
// rewrite route can replace it, always re-opening the review gate).
const CHANNEL_FIX = {
  after_hours_call:
    "Route after-hours calls to a live answering point with a hard capture script " +
    "(name, callback number, incident basics) and a same-morning callback commitment.",
  weekend_call:
    "Give weekend calls the same live coverage as weekdays — a rotating on-call " +
    "answer point with the capture script, not voicemail.",
  web_form:
    "Acknowledge web-form submissions immediately and put a human response in front " +
    "of the prospect the same business day, with a phone attempt — not just an email reply.",
  website_chat:
    "Staff or properly configure the website chat so a visitor gets a real response " +
    "that captures contact details and books a next step, or remove the widget — a dead " +
    "chat reads as a dead firm.",
};

/**
 * @param {Array<object>} channels
 * @returns {{ narrative_failure: string, narrative_fix: string } | null}
 */
export function draftShopNarrative(channels = []) {
  const worst = pickWorstChannel(channels);
  if (!worst) return null;
  const label = channelLabel(worst.channel);
  const facts = describeChannelFacts(worst);
  const gradeWord = worst.grade === "lost" ? "lost outright" : "fumbled";
  const noteSentence = typeof worst.notes === "string" && worst.notes.trim()
    ? ` Field note from the attempt: ${worst.notes.trim()}`
    : "";
  const narrative_failure =
    `The ${label.toLowerCase()} attempt was ${gradeWord}` +
    (facts ? ` — ${facts}.` : ".") +
    ` A prospective client making this exact attempt would have moved on to the next firm.` +
    noteSentence;
  const narrative_fix =
    CHANNEL_FIX[worst.channel] ??
    "Assign a named owner for this channel and re-shop it after the fix.";
  return { narrative_failure, narrative_fix };
}
