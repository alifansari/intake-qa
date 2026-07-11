// NDA gate (module 0b) — the HARD gate in front of all data access.
//
// No applicant may connect/upload calls or view any audit until their NDA is
// signed (invariant f). assertBetaDataAccess() is the single chokepoint every
// beta-facing route calls before touching call data — the same "one door"
// pattern as messaging/send.mjs for sends.
//
// Execution uses the EXISTING Dropbox Sign integration (same account/webhook as
// the retainer handoff). The SDK is lazy-loaded and injectable, mirroring
// messaging/handoff.mjs, and in TEST_MODE the request is simulated so the whole
// beta funnel is testable offline.

import {
  createNdaRecord,
  getLatestNdaForApplicant,
  findNdaBySignatureRequest,
  setNdaStatus,
  getBetaApplicant,
  setBetaApplicantStatus,
} from "./store.mjs";

// Send the NDA for signature. In TEST_MODE (or when no API key is configured)
// the Dropbox Sign call is simulated with a deterministic request id so tests
// and local onboarding walk the full state machine without network.
//
// The real Dropbox Sign send lives in beta/dropbox-sign-nda.mjs (defaultNdaClient),
// injected by the /api/beta/apply route as `dropboxSign` when configured. The
// template is legal content: route to Ali/Yang before first live send (§VII).
/**
 * @param {{ db?: unknown, applicantId?: string, env?: Record<string, string|undefined>,
 *   dropboxSign?: { sendNda: (...args: any[]) => Promise<{ signatureRequestId: string }> } | null,
 *   now?: Date }} opts
 */
export async function sendNdaRequest({ db, applicantId, env = process.env, dropboxSign = null, now = new Date() }) {
  const applicant = await getBetaApplicant(db, applicantId);
  if (!applicant) throw new Error(`unknown applicant: ${applicantId}`);
  if (applicant.status !== "nda_pending") {
    throw new Error(`NDA can only be sent in nda_pending (applicant is ${applicant.status})`);
  }

  const testMode = env.TEST_MODE !== "false" || !env.DROPBOX_SIGN_API_KEY;
  let signatureRequestId;
  if (testMode || !dropboxSign) {
    signatureRequestId = `nda-sim-${applicantId}-${now.getTime()}`;
  } else {
    // Injected client keeps the SDK out of this module's graph (Twilio pattern).
    const res = await dropboxSign.sendNda({
      templateId: env.DROPBOX_SIGN_NDA_TEMPLATE_ID,
      signerEmail: applicant.email,
      signerName: applicant.name,
    });
    signatureRequestId = res.signatureRequestId;
  }

  const ndaId = await createNdaRecord(db, {
    applicant_id: applicantId,
    signature_request_id: signatureRequestId,
    status: "sent",
  });
  return { ndaId, signatureRequestId, simulated: testMode || !dropboxSign };
}

// Webhook completion path. Correlates a Dropbox Sign signature_request_id back
// to an NDA record; no-ops with { handled: false } when the id belongs to some
// other signature flow (e.g. a retainer handoff), so it can safely share the
// /webhooks/dropbox-sign route.
export async function completeNdaSignature({ db, signatureRequestId, documentRef = null, now = new Date() }) {
  const nda = await findNdaBySignatureRequest(db, signatureRequestId);
  if (!nda) return { handled: false, reason: "unknown_signature_request" };
  if (nda.status === "signed") return { handled: true, alreadySigned: true, ndaId: nda.id };

  await setNdaStatus(db, nda.id, "signed", {
    signedAt: now.toISOString(),
    documentRef,
  });
  // Advance the applicant: nda_pending -> nda_signed (legal edge by definition).
  const applicant = await getBetaApplicant(db, nda.applicant_id);
  if (applicant && applicant.status === "nda_pending") {
    await setBetaApplicantStatus(db, nda.applicant_id, "nda_signed", now);
  }
  return { handled: true, ndaId: nda.id, applicantId: nda.applicant_id };
}

// True only when the applicant's latest NDA is signed.
export async function hasSignedNda(db, applicantId) {
  const nda = await getLatestNdaForApplicant(db, applicantId);
  return Boolean(nda && nda.status === "signed");
}

// THE data-access chokepoint (invariant f). Every beta route that would expose
// call data, audits, packets, or the ledger calls this first and lets the throw
// propagate to a 403. Access requires BOTH a signed NDA and a post-NDA status.
const POST_NDA_STATUSES = new Set(["nda_signed", "onboarding", "active_tester", "completed"]);

export async function assertBetaDataAccess(db, applicantId) {
  const applicant = await getBetaApplicant(db, applicantId);
  if (!applicant) throw new Error("beta_access_denied: unknown applicant");
  if (!POST_NDA_STATUSES.has(applicant.status)) {
    throw new Error(`beta_access_denied: status ${applicant.status} precedes NDA`);
  }
  const signed = await hasSignedNda(db, applicantId);
  if (!signed) throw new Error("beta_access_denied: NDA not signed");
  return applicant;
}
