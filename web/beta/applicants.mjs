// Beta applicant intake + qualification (module 0a).
//
// The beta is the front door to every product module: nothing downstream is
// reachable until an applicant passes the ICP gate here AND signs the NDA
// (web/beta/nda.mjs). Split: pure qualification + state machine (no I/O,
// testable), thin persistence wrappers over web/beta/store.mjs.

import {
  createBetaApplicant,
  getBetaApplicant,
  setBetaApplicantStatus,
  createWaitlistEntry,
} from "./store.mjs";

// ICP: small-to-mid CALIFORNIA plaintiff-side PI firms. Everyone else goes to a
// tagged waitlist (by requested practice area) — they are NOT admitted.
export const ICP = Object.freeze({
  state: "CA",
  practiceArea: "personal_injury",
  // "small-to-mid" proxy: monthly intake-call volume band. Outside the band we
  // still admit (volume is self-reported and noisy) but record the reason so
  // the founder can override; only state/practice-area are hard gates.
  monthlyCallVolume: { min: 20, max: 2000 },
});

export const APPLICANT_STATUSES = Object.freeze([
  "applied",
  "nda_pending",
  "nda_signed",
  "onboarding",
  "active_tester",
  "completed",
  "waitlisted",
  "rejected",
]);

// Legal state-machine transitions. The NDA is the hard gate: there is no edge
// from applied/nda_pending to onboarding that skips nda_signed (invariant f).
const ALLOWED_TRANSITIONS = Object.freeze({
  applied: ["nda_pending", "waitlisted", "rejected"],
  nda_pending: ["nda_signed", "rejected"],
  nda_signed: ["onboarding", "rejected"],
  onboarding: ["active_tester", "rejected"],
  active_tester: ["completed"],
  completed: [],
  waitlisted: ["applied"], // founder can pull someone off the waitlist to re-qualify
  rejected: [],
});

export function canTransition(from, to) {
  return (ALLOWED_TRANSITIONS[from] ?? []).includes(to);
}

// Pure qualification gate. Returns { qualified, reasons, waitlist_tag }.
// Hard gates: California + plaintiff-side personal injury + records (or will
// record) intake calls. Soft signals land in reasons but do not disqualify.
export function qualify(application) {
  const reasons = [];
  const state = String(application.state ?? "").trim().toUpperCase();
  const practiceArea = String(application.practice_area ?? "").trim().toLowerCase();

  if (state !== ICP.state) {
    reasons.push(`outside_california:${state || "unknown"}`);
  }
  if (practiceArea !== ICP.practiceArea) {
    reasons.push(`non_pi_practice_area:${practiceArea || "unknown"}`);
  }

  const vol = application.monthly_call_volume;
  if (vol != null) {
    if (vol < ICP.monthlyCallVolume.min) reasons.push("volume_below_band");
    if (vol > ICP.monthlyCallVolume.max) reasons.push("volume_above_band");
  }
  if (!application.records_calls) {
    // Not disqualifying: the onboarding recording-readiness checklist exists
    // exactly for firms that don't record yet. Flag it for setup friction.
    reasons.push("not_recording_yet");
  }

  const hardFails = reasons.filter(
    (r) => r.startsWith("outside_california") || r.startsWith("non_pi_practice_area")
  );
  const qualified = hardFails.length === 0;
  return {
    qualified,
    reasons,
    waitlist_tag: qualified ? null : practiceArea || "unknown",
  };
}

// Validate the raw application body. Returns { ok, errors } — plain-object
// validation (this module is shared with the CLI/tests, so no framework deps).
export function validateApplication(body) {
  const errors = [];
  const required = ["email", "name", "firm_name", "practice_area", "state"];
  for (const field of required) {
    if (!body?.[field] || String(body[field]).trim().length === 0) {
      errors.push(`missing:${field}`);
    }
  }
  if (body?.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(body.email))) {
    errors.push("invalid:email");
  }
  if (body?.monthly_call_volume != null && Number.isNaN(Number(body.monthly_call_volume))) {
    errors.push("invalid:monthly_call_volume");
  }
  if (
    body?.spanish_call_pct != null &&
    !(Number(body.spanish_call_pct) >= 0 && Number(body.spanish_call_pct) <= 100)
  ) {
    errors.push("invalid:spanish_call_pct");
  }
  return { ok: errors.length === 0, errors };
}

// Apply: validate -> qualify -> persist. Qualified applicants land in
// 'nda_pending' (the NDA request is created by the caller via web/beta/nda.mjs);
// non-ICP applicants are persisted as 'waitlisted' with a tagged waitlist row.
// Returns { applicantId, status, qualification } or { errors }.
export async function applyToBeta({ db, application }) {
  const check = validateApplication(application);
  if (!check.ok) return { errors: check.errors };

  const qualification = qualify(application);
  const status = qualification.qualified ? "nda_pending" : "waitlisted";

  const applicantId = await createBetaApplicant(db, {
    ...application,
    monthly_call_volume:
      application.monthly_call_volume != null ? Number(application.monthly_call_volume) : null,
    spanish_call_pct:
      application.spanish_call_pct != null ? Number(application.spanish_call_pct) : null,
    status,
    qualification,
  });

  if (!qualification.qualified) {
    await createWaitlistEntry(db, {
      applicant_id: applicantId,
      practice_area: qualification.waitlist_tag,
      state: application.state ?? null,
      reason: qualification.reasons.join(", "),
    });
  }

  return { applicantId, status, qualification };
}

// Guarded status transition (throws on an illegal edge, so no code path can
// route around the NDA step by fiat).
export async function advanceApplicant({ db, applicantId, to, now = new Date() }) {
  const applicant = await getBetaApplicant(db, applicantId);
  if (!applicant) throw new Error(`unknown applicant: ${applicantId}`);
  if (!canTransition(applicant.status, to)) {
    throw new Error(`illegal transition: ${applicant.status} -> ${to}`);
  }
  await setBetaApplicantStatus(db, applicantId, to, now);
  return { from: applicant.status, to };
}
