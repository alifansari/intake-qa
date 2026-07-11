// Backend-selecting data-access facade for the pipeline.
//
// Exposes the SAME function names as db.mjs / db-postgres.mjs, but ASYNC, and
// dispatches per call to the right backend based on the db handle:
//   * a node:sqlite DatabaseSync handle (has `.prepare`) -> ingest/db.mjs (sync,
//     wrapped in a resolved promise so `await` is a no-op) — used by tests + CLI.
//   * anything else (a `pg` Pool/Client) -> ingest/db-postgres.mjs (async) —
//     used by the hosted product when DATABASE_URL is set.
//
// Pipeline stages import from HERE and `await` every data call, so the exact
// same stage logic runs unchanged against local SQLite or Supabase Postgres.

import * as sqlite from "./db.mjs";
import * as pg from "./db-postgres.mjs";

// A node:sqlite handle exposes `.prepare`; a pg Pool/Client does not.
function impl(db) {
  return db && typeof db.prepare === "function" ? sqlite : pg;
}

// Build an async wrapper that forwards to whichever backend the handle implies.
function wrap(name) {
  return async (db, ...args) => impl(db)[name](db, ...args);
}

export const upsertCall = wrap("upsertCall");
export const setTranscript = wrap("setTranscript");
export const getUnscoredCalls = wrap("getUnscoredCalls");
export const insertFlag = wrap("insertFlag");
export const getFirm = wrap("getFirm");
export const createConversation = wrap("createConversation");
export const createDraftMessage = wrap("createDraftMessage");
export const getMessage = wrap("getMessage");
export const getDraftedMessages = wrap("getDraftedMessages");
export const getApprovedMessages = wrap("getApprovedMessages");
export const approveMessage = wrap("approveMessage");
export const rejectMessage = wrap("rejectMessage");
export const editDraftMessage = wrap("editDraftMessage");
export const markMessageSent = wrap("markMessageSent");
export const markMessageFailed = wrap("markMessageFailed");
export const getConversation = wrap("getConversation");
export const findConversationByPhone = wrap("findConversationByPhone");
export const getConversationMessages = wrap("getConversationMessages");
export const getCallerNameForConversation = wrap("getCallerNameForConversation");
export const setConversationOptedOut = wrap("setConversationOptedOut");
export const addInboundMessage = wrap("addInboundMessage");
export const setFirmKillSwitch = wrap("setFirmKillSwitch");
export const setConversationStatus = wrap("setConversationStatus");
export const createHandoff = wrap("createHandoff");
export const getHandoff = wrap("getHandoff");
export const findHandoffBySignatureRequest = wrap("findHandoffBySignatureRequest");
export const setHandoffStatus = wrap("setHandoffStatus");
export const createOutcome = wrap("createOutcome");
export const createRecovery = wrap("createRecovery");
export const getOutcomesForConversation = wrap("getOutcomesForConversation");
export const getRecoveriesForConversation = wrap("getRecoveriesForConversation");
export const countFlaggedInWeek = wrap("countFlaggedInWeek");
export const countConversationsInWeek = wrap("countConversationsInWeek");
export const countRepliedInWeek = wrap("countRepliedInWeek");
export const getSignedRecoveries = wrap("getSignedRecoveries");
export const sumRecoveredMonthToDate = wrap("sumRecoveredMonthToDate");

// Demo Mode (public, no-auth, hard-isolated).
export const createDemoCall = wrap("createDemoCall");
export const getDemoCall = wrap("getDemoCall");
export const getDemoCallByToken = wrap("getDemoCallByToken");
export const setDemoCallStatus = wrap("setDemoCallStatus");
export const setDemoCallTranscript = wrap("setDemoCallTranscript");
export const setDemoCallResult = wrap("setDemoCallResult");
export const setDemoCallError = wrap("setDemoCallError");
export const markDemoAudioDeleted = wrap("markDemoAudioDeleted");
export const countRecentDemoUploadsByIp = wrap("countRecentDemoUploadsByIp");
export const countActiveDemoUploadsByIp = wrap("countActiveDemoUploadsByIp");
export const purgeExpiredDemoCalls = wrap("purgeExpiredDemoCalls");
export const createDemoLead = wrap("createDemoLead");

// Firm onboarding (wizard).
export const createFirm = wrap("createFirm");
export const saveTemplateVersion = wrap("saveTemplateVersion");
export const getLatestTemplateVersion = wrap("getLatestTemplateVersion");
export const listTemplateVersions = wrap("listTemplateVersions");
export const listFirms = wrap("listFirms");

// Operator error log + status page.
export const logError = wrap("logError");
export const getRecentErrors = wrap("getRecentErrors");
export const countRecentErrors = wrap("countRecentErrors");
export const markErrorsAlerted = wrap("markErrorsAlerted");
export const getUnalertedErrors = wrap("getUnalertedErrors");

// Per-firm feature flags (migration 0008). Default OFF when a row is absent.
export const getFirmFeatures = wrap("getFirmFeatures");
export const isFeatureEnabled = wrap("isFeatureEnabled");
export const setFirmFeature = wrap("setFirmFeature");

// Leak Audit sessions (migration 0009). Demo-isolated; nothing here can send.
export const createAuditSession = wrap("createAuditSession");
export const getAuditSessionByToken = wrap("getAuditSessionByToken");
export const updateAuditSession = wrap("updateAuditSession");
export const attachDemoCallToSession = wrap("attachDemoCallToSession");
export const getAuditSessionCalls = wrap("getAuditSessionCalls");
export const countAuditSessionCalls = wrap("countAuditSessionCalls");
export const countRecentAuditSessionsByFingerprint = wrap("countRecentAuditSessionsByFingerprint");
export const getRecentAuditSessionByFingerprint = wrap("getRecentAuditSessionByFingerprint");
export const listRecentAuditSessions = wrap("listRecentAuditSessions");
export const purgeExpiredAuditSessions = wrap("purgeExpiredAuditSessions");

// Retention on REAL firm data (P0-3 / CLAUDE.md §(h)). Nulls call transcripts +
// recording_url and message bodies older than a cutoff. Wired into retentionPurge.
export const purgeExpiredCalls = wrap("purgeExpiredCalls");

// Consent log (P0-2 / CLAUDE.md §II). Write before any mic/recording workflow.
export const createConsentEvent = wrap("createConsentEvent");

// Stripe webhook idempotency (P0-4a). true => first time seen; false => replay.
export const recordStripeEventProcessed = wrap("recordStripeEventProcessed");

// Per-recovered-case billing (migration 0010). FLAT fee per case; the recovered
// fee is NEVER read by any of these — see billing/invoice.mjs.
export const listBillingPlans = wrap("listBillingPlans");
export const getBillingPlan = wrap("getBillingPlan");
export const getBillingPlanByName = wrap("getBillingPlanByName");
export const getFirmBilling = wrap("getFirmBilling");
export const upsertFirmBilling = wrap("upsertFirmBilling");
export const setFirmBillingStatus = wrap("setFirmBillingStatus");
export const getFirmBillingBySubscription = wrap("getFirmBillingBySubscription");
export const getFirmByName = wrap("getFirmByName");
export const accrueBillableEvent = wrap("accrueBillableEvent");
export const getBillableEvents = wrap("getBillableEvents");
export const getAccruedBillableEvents = wrap("getAccruedBillableEvents");
export const countCallsInPeriod = wrap("countCallsInPeriod");

// Recovery-desk additive layer (migration 0014).
export const setCallStatus = wrap("setCallStatus");
export const getCallReconciliation = wrap("getCallReconciliation");
export const getCallbackWins = wrap("getCallbackWins");
export const insertTranscriptCitation = wrap("insertTranscriptCitation");
export const getTranscriptCitations = wrap("getTranscriptCitations");
export const setFlagConfidence = wrap("setFlagConfidence");
export const getFlagConfidence = wrap("getFlagConfidence");
export const insertAnalysisVersion = wrap("insertAnalysisVersion");
export const logArtifactAccess = wrap("logArtifactAccess");
export const insertCitationFailure = wrap("insertCitationFailure");
export const getFeeValueRange = wrap("getFeeValueRange");
export const listLeakedFlags = wrap("listLeakedFlags");
export const setFlagStatus = wrap("setFlagStatus");
export const listNonAnalyzedCalls = wrap("listNonAnalyzedCalls");
export const getReportStatus = wrap("getReportStatus");
export const setReportStatus = wrap("setReportStatus");
export const listReviewableSessions = wrap("listReviewableSessions");
export const logReportAccess = wrap("logReportAccess");
export const countReportAccess = wrap("countReportAccess");
export const setBillableEventStatus = wrap("setBillableEventStatus");
export const markBillableEventsInvoiced = wrap("markBillableEventsInvoiced");
export const createInvoice = wrap("createInvoice");
export const addInvoiceLine = wrap("addInvoiceLine");
export const setInvoiceTotal = wrap("setInvoiceTotal");
export const voidInvoice = wrap("voidInvoice");
export const getInvoice = wrap("getInvoice");
export const getInvoiceLines = wrap("getInvoiceLines");
export const listInvoices = wrap("listInvoices");
export const getInvoiceByFirmPeriod = wrap("getInvoiceByFirmPeriod");
export const appendStripeSimLog = wrap("appendStripeSimLog");
export const listStripeSimLog = wrap("listStripeSimLog");
export const countStripeSimLog = wrap("countStripeSimLog");
export const countLeakedFlags = wrap("countLeakedFlags");

// Peer benchmarking (migration 0011). Snapshots hold only aggregates; the
// k-anonymity gate lives in analytics/benchmarks.mjs.
export const setBenchmarkConsent = wrap("setBenchmarkConsent");
export const countConsentingFirms = wrap("countConsentingFirms");
export const getConsentingFirmIds = wrap("getConsentingFirmIds");
export const getBenchmarkRows = wrap("getBenchmarkRows");
export const insertBenchmarkSnapshot = wrap("insertBenchmarkSnapshot");
export const getLatestBenchmarkSnapshot = wrap("getLatestBenchmarkSnapshot");

// CRM / webhook integrations (migration 0012). Credentials stored encrypted.
export const upsertFirmIntegration = wrap("upsertFirmIntegration");
export const getFirmIntegration = wrap("getFirmIntegration");
export const listFirmIntegrations = wrap("listFirmIntegrations");

// --- Connection selection for the hosted pipeline ----------------------------

// True when a Postgres connection is configured (hosted product).
export function pipelineDbConfigured(env = process.env) {
  return Boolean(env.DATABASE_URL);
}

// Open the pipeline's database: Postgres when DATABASE_URL is set, else local
// SQLite (migrated). Returns a handle usable with the wrappers above.
export async function openPipelineDb(env = process.env) {
  if (env.DATABASE_URL) {
    const { default: pgLib } = await import("pg");
    return new pgLib.Pool({ connectionString: env.DATABASE_URL, max: 3 });
  }
  const { openMigratedDb } = await import("../db/connection.mjs");
  return openMigratedDb();
}

// Close a handle opened by openPipelineDb (sqlite .close() vs pg .end()).
export async function closePipelineDb(db) {
  if (!db) return;
  if (typeof db.prepare === "function") db.close();
  else if (typeof db.end === "function") await db.end();
}
