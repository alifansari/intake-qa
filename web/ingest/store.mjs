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
