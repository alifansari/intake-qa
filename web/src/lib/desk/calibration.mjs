// Calibration by example (pure, no I/O).
//
// The say-vs-do problem: attorneys describe their intake in justice terms but
// sign on collectibility and ROI. So instead of asking them to set weights, we
// deal a short deck of representative California calls, let them mark each
// Sign / Maybe / Pass, and read their appetite off what they actually chose.
// calibrateProfile() turns those choices into the firm triage profile the
// engine already understands (posture, MIST tolerance, minimum limits, accepted
// case types, cost appetite) plus a plain-English rationale for each move.
//
// Each sample is tagged with the ONE thing it probes, so calibration needs no
// engine call: the signal is in which cards they keep.

export const CALIBRATION_SAMPLES = Object.freeze([
  {
    id: "strong_auto",
    label: "Rear-ended at a light, surgery, full coverage",
    blurb: "Clear liability, herniated disc with surgery, defendant carries $250k. The textbook file.",
    probes: { baseline: true },
    input: { case_type: "mva_standard", liability: "clear", injury: "hard", objective_findings: true, coverage: "high" },
  },
  {
    id: "mist",
    label: "Low-speed fender bender, neck strain, no imaging",
    blurb: "Minor impact, soft-tissue only, three weeks of therapy, minimal property damage.",
    probes: { mist: true },
    input: { case_type: "mva_standard", liability: "clear", injury: "soft_tissue", objective_findings: false, coverage: "minimal", minimal_impact: true },
  },
  {
    id: "low_limits_good_injury",
    label: "Broken leg, clear fault, but only $15k of coverage",
    blurb: "Real injury and clean liability, but the at-fault driver carries state minimums and no umbrella.",
    probes: { lowLimits: true },
    input: { case_type: "mva_standard", liability: "clear", injury: "hard", objective_findings: true, coverage: "minimal" },
  },
  {
    id: "uninsured",
    label: "Hit by an uninsured driver, no UM on our caller",
    blurb: "Good injury, clear fault, but nobody to collect from and the caller has no UM coverage.",
    probes: { uninsured: true },
    input: { case_type: "mva_standard", liability: "clear", injury: "hard", objective_findings: true, coverage: "none_uninsured" },
  },
  {
    id: "dog_bite",
    label: "Dog bite, homeowner coverage, stitches",
    blurb: "Strict-liability bite on a lawful visitor, homeowner policy in play, moderate wound.",
    probes: { caseType: "dog_bite" },
    input: { case_type: "dog_bite", liability: "clear", injury: "moderate", objective_findings: true, coverage: "moderate" },
  },
  {
    id: "trucking",
    label: "Commercial truck crash, catastrophic injury",
    blurb: "Big case, big coverage, but heavy litigation and cost to carry.",
    probes: { caseType: "trucking", heavy: true },
    input: { case_type: "trucking", liability: "clear", injury: "catastrophic", objective_findings: true, coverage: "commercial_deep" },
  },
  {
    id: "med_mal",
    label: "Surgical error, strong facts, six-figure workup",
    blurb: "High value, but expert-heavy and $30k to $50k advanced before it is worth anything.",
    probes: { caseType: "med_mal", capital: "heavy" },
    input: { case_type: "med_mal", liability: "clear", injury: "catastrophic", objective_findings: true, coverage: "high" },
  },
  {
    id: "premises_thin",
    label: "Slip and fall, disputed notice, soft-tissue",
    blurb: "Store denies knowing about the spill, soft-tissue only, moderate coverage.",
    probes: { thin: true },
    input: { case_type: "premises", liability: "disputed", injury: "soft_tissue", objective_findings: false, coverage: "moderate" },
  },
]);

const CHOICE_SCORE = { sign: 1, maybe: 0, pass: -1 };
const keep = (c) => c === "sign" || c === "maybe";

// answers: { [sampleId]: "sign" | "maybe" | "pass" }
// Returns { profile, rationale: string[], answered: number }.
export function calibrateProfile(answers = {}, opts = {}) {
  const base = opts.base || {};
  const allTypes = opts.allTypes || [];
  const rationale = [];
  const a = (id) => answers[id];
  const answered = CALIBRATION_SAMPLES.filter((s) => a(s.id)).length;

  // --- posture: how generous were they on the mid-tier files? -------------
  const midIds = ["dog_bite", "premises_thin", "low_limits_good_injury"];
  const generosity = midIds.reduce((n, id) => n + (a(id) ? CHOICE_SCORE[a(id)] : 0), 0);
  let posture = base.posture || "selective";
  if (a("strong_auto") === "pass") {
    posture = "selective";
    rationale.push("You passed even the textbook file, so we set a highly selective posture.");
  } else if (generosity >= 2) {
    posture = "volume";
    rationale.push("You kept most of the mid-tier files, so we set a volume posture (sign more, develop more).");
  } else if (generosity <= -2) {
    posture = "selective";
    rationale.push("You passed most of the mid-tier files, so we set a selective posture.");
  }

  // --- MIST tolerance ------------------------------------------------------
  let take_mist = base.take_mist ?? null;
  if (a("mist")) {
    take_mist = keep(a("mist"));
    rationale.push(
      take_mist
        ? "You would work the low-impact soft-tissue file, so MIST cases are turned on."
        : "You passed the low-impact soft-tissue file, so MIST cases are turned off."
    );
  }

  // --- minimum policy limits ----------------------------------------------
  let min_policy_limits = base.min_policy_limits ?? null;
  const lowLimitsPassed = a("low_limits_good_injury") === "pass";
  const uninsuredPassed = a("uninsured") === "pass";
  if (lowLimitsPassed) {
    min_policy_limits = "100k";
    rationale.push("You passed a good injury with only state-minimum coverage, so we set a $100k minimum-limits floor.");
  } else if (a("low_limits_good_injury") === "maybe") {
    min_policy_limits = "50k";
    rationale.push("You would develop the low-limits file, so we set a $50k minimum-limits floor.");
  } else if (a("low_limits_good_injury") === "sign") {
    min_policy_limits = "any";
    rationale.push("You would sign a good injury even at low limits, so no minimum-limits floor is set.");
  }
  if (uninsuredPassed && !lowLimitsPassed) {
    rationale.push("You passed the uninsured/no-UM file, consistent with collectibility as a hard gate.");
  }

  // --- accepted case types: drop specialist types they rejected -----------
  let accepted = base.accepted_case_types && base.accepted_case_types.length
    ? [...base.accepted_case_types]
    : [...allTypes];
  for (const s of CALIBRATION_SAMPLES) {
    const ct = s.probes.caseType;
    if (!ct) continue;
    if (a(s.id) === "pass" && accepted.includes(ct)) {
      accepted = accepted.filter((t) => t !== ct);
      rationale.push(`You passed the ${labelForType(ct)} file, so that case type is set to refer out.`);
    }
  }
  // nursing_home shares elder_abuse routing; keep them consistent if present.

  // --- cost appetite: read off the capital-heavy files --------------------
  let cost_fronting = base.cost_fronting || "moderate";
  const medMal = a("med_mal");
  const trucking = a("trucking");
  if (medMal === "sign" || trucking === "sign") {
    cost_fronting = "deep";
    rationale.push("You would keep a capital-heavy file in house, so cost appetite is set to deep.");
  } else if (medMal === "pass" && trucking === "pass") {
    cost_fronting = "minimal";
    rationale.push("You passed the capital-heavy files, so cost appetite is set to minimal.");
  }

  const profile = {
    ...base,
    posture,
    take_mist,
    min_policy_limits,
    accepted_case_types: accepted,
    cost_fronting,
  };
  return { profile, rationale, answered };
}

function labelForType(ct) {
  const s = CALIBRATION_SAMPLES.find((x) => x.probes.caseType === ct);
  if (ct === "med_mal") return "medical malpractice";
  if (ct === "trucking") return "trucking";
  if (ct === "dog_bite") return "dog bite";
  return s ? s.label : ct;
}
