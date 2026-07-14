// Scoring worker: turn un-scored `calls` rows into `flags` rows by running the
// EXISTING calibrated Claude scoring engine (root lib/score-call.js). The
// scoring prompt is NOT touched — we import scoreCall and feed it a transcript.
// For each newly flagged leaked-signable lead it also DRAFTS a compliant first
// SMS (via lib messaging/draft.mjs) and stores it as a pending-approval
// conversation with a `drafted` message. NOTHING sends here.
//
// The scorer and the drafter are injectable so tests can supply deterministic
// fakes (the synthetic seed transcripts can't be scored by real Claude, and live
// API calls cost money / need a key). Production uses the real defaults.

import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { engineRoot } from "../engine-root.mjs";
import { ensureTranscript } from "./transcribe.mjs";
import {
  getUnscoredCalls,
  insertFlag,
  getFirm,
  createConversation,
  createDraftMessage,
  setCallStatus,
  logError,
  insertTranscriptCitation,
  setFlagConfidence,
  recordEvent,
  upsertCallAnalysis,
  insertTriageCase,
  findTriageByCall,
} from "./store.mjs";
import { evaluateFlag } from "../messaging/flag-logic.mjs";
import {
  candidateQuotes,
  confidenceTier,
  rubricVersion,
} from "../messaging/flag-confidence.mjs";
import { guardAndLog } from "../analysis/citation-guard.mjs";
import { draftFirstMessage } from "../messaging/draft.mjs";
import { getTemplate } from "../messaging/templates.mjs";

// The root engine (lib/score-call.js) lives outside web/ locally and is vendored
// into web/.engine for the serverless bundle. Load it as a NATIVE runtime import
// (webpackIgnore) exactly like ingest/demo.mjs, so the bundler never tries to
// resolve the repo-root path at build time. See ../engine-root.mjs.
function importEngine(fileName) {
  const href = pathToFileURL(join(engineRoot(), "lib", fileName)).href;
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href);
}

// SHADOW: import the Engine V2 harness from the vendored engine root.
function importV2() {
  const href = pathToFileURL(join(engineRoot(), "scoring-v2", "score-v2.js")).href;
  return import(/* webpackIgnore: true */ /* turbopackIgnore: true */ href);
}

// Run Engine V2 dark on the same transcript and return the adapted verdict
// (no dollars; full v2 verdict under `.v2`). Failure-isolated — never throws
// into the firm-visible v1 scoring path.
async function runV2Shadow({ transcript, callId }) {
  try {
    const [{ scoreV2 }, { v2VerdictToScoredCall }] = await Promise.all([
      importV2(),
      import("../src/lib/studio/v2-adapter.mjs"),
    ]);
    const verdict = await scoreV2({
      transcript,
      callId: String(callId),
      pkgRoot: join(engineRoot(), "scoring-v2"),
    });
    return v2VerdictToScoredCall(verdict);
  } catch (err) {
    return { shadow_error: String((err && err.message) || err), engine: "scoring-v2" };
  }
}

// Firm config used to assemble the scoring prompt (config/test-firm.md, resolved
// from the same engine root as the engine .js files).
const DEFAULT_FIRM_CONFIG = join(engineRoot(), "config", "test-firm.md");

// Consent basis for pilot re-engagement: the caller's own inbound inquiry
// (established business relationship). REQUIRED by the conversations schema.
const CONSENT_BASIS = "inbound_call_inquiry_EBR";

// Default (production) scorer: the real calibrated engine. Writes its JSON to a
// temp file per call (scoreCall requires an outPath) and returns the parsed obj.
async function defaultScorer({ transcript, callId, firmConfigPath }) {
  const outDir = mkdtempSync(join(tmpdir(), "intakeqa-score-"));
  const { scoreCall } = await importEngine("score-call.js");
  const scoring = await scoreCall({
    transcript,
    callId,
    firmConfigPath,
    outPath: join(outDir, `${callId}.score.json`),
    rawOutPath: join(outDir, `${callId}.raw.txt`),
  });
  // SHADOW: Engine V2 rides along under an internal key (never rendered,
  // failure-isolated). Accrues the v1-vs-v2 corpus on real ingested calls.
  scoring._v2_shadow = await runV2Shadow({ transcript, callId });
  return scoring;
}

// Flatten the engine's full ScoredCall + the mapped flag into the durable
// call_analyses row shape (migration 0032). Pure + defensive: every field is
// optional in the loose ScoredCall schema, so read through null-safe accessors.
// The full blob is stored as score_json (minus the internal v2 shadow) so the
// readout is never limited by which fields we happened to break out into columns.
export function extractAnalysis({ score, mapped, call }) {
  const s = score ?? {};
  const cats = s.scores?.categories ?? {};
  const catScore = (k) => {
    const v = cats?.[k];
    const n = typeof v === "number" ? v : v?.score;
    return typeof n === "number" ? Math.round(n) : null;
  };
  const overall = s.scores?.overall;
  const usd = s.alerts?.revenue_at_risk?.amount_usd;
  const conv = s.conversion ?? {};
  // Store the blob without the internal shadow key (never firm-visible).
  const { _v2_shadow, ...blob } = s;
  return {
    call_id: call.id,
    firm_id: call.firm_id,
    overall_score: typeof overall === "number" ? Math.round(overall) : null,
    band: s.scores?.band ?? null,
    case_signability: s.case_signability ?? null,
    lost_signable: Boolean(mapped?.is_leaked_signable),
    revenue_at_risk_cents: typeof usd === "number" ? Math.round(usd * 100) : null,
    case_type: mapped?.case_type ?? null,
    retainer_asked: typeof conv.retainer_asked === "boolean" ? conv.retainer_asked : null,
    next_step_specificity: conv.next_step_specificity ?? null,
    contact_info_captured: conv.contact_info_captured ?? null,
    cat_qualification: catScore("qualification"),
    cat_conversion: catScore("conversion"),
    cat_connection: catScore("connection"),
    cat_risk_compliance: catScore("risk_compliance"),
    cat_process: catScore("process"),
    summary: s.summary ?? null,
    coaching_json: s.coaching ? JSON.stringify(s.coaching) : null,
    score_json: JSON.stringify(blob),
    rep: call.rep ?? null,
    source: call.source ?? null,
    model_version: typeof s.model === "string" ? s.model : null,
  };
}

// Score every un-scored call for a firm (or all firms) and create a flag row
// for each. Newly flagged leaked-signable leads also get a pending-approval
// conversation + a `drafted` first message. Returns created flag summaries.
export async function scoreUnscored({
  db,
  firmConfigPath = DEFAULT_FIRM_CONFIG,
  scorer = defaultScorer,
  drafter, // injectable; undefined => draftFirstMessage uses the real Claude default
  firmId = null,
  thresholdScore = 60,
  templateId = null, // null => first template in config/message-templates.md
  now = new Date(),
} = {}) {
  const calls = await getUnscoredCalls(db, firmId);
  const results = [];

  for (const call of calls) {
    // P1(a): one poison call (bad transcript, scorer throw, draft failure) must
    // never abort the whole batch. Isolate each iteration: on failure, mark the
    // call failed with a reason, log it, and continue with the next call.
    try {
    const firm = await getFirm(db, call.firm_id);
    const windowHours = firm?.reengage_window_hours ?? 72;

    const transcript = await ensureTranscript({ db, call });
    const score = await scorer({
      transcript,
      callId: String(call.id),
      firmConfigPath,
    });

    const mapped = evaluateFlag({
      score,
      thresholdScore,
      windowHours,
      receivedAt: call.received_at,
      now,
    });

    const flagId = await insertFlag(db, {
      call_id: call.id,
      firm_id: call.firm_id,
      qualification_score: mapped.qualification_score,
      is_leaked_signable: mapped.is_leaked_signable,
      reason: mapped.reason,
      case_type: mapped.case_type,
    });

    // Mark the call terminal-succeeded. The whole schema keys "done" off
    // status = 'analyzed' (v_call_reconciliation's `processed` bucket, the
    // desk's "N calls processing" count, getUnprocessedCalls, monthly scored
    // counts) — but the pipeline previously only ever wrote 'failed_scoring',
    // never 'analyzed', so a clean-scored call (flag row, no leak) stayed
    // status=NULL and read as "still processing" forever, and the desk's
    // all-clear panel could never render. Setting it here closes that gap.
    // (Session 9 red-team.)
    await setCallStatus(db, call.id, "analyzed").catch(() => {});

    // Durably persist the ENGINE'S FULL READOUT for this call (migration 0032).
    // The pipeline used to discard everything but the four flag scalars, so a
    // firm could never see how a call went and a clean-scored call vanished into
    // a counter. This sibling row (keyed by call_id, frozen flags untouched)
    // powers the per-call readout and the team scorecard. Best-effort — a
    // persistence failure must never fail the flag or abort the batch.
    await upsertCallAnalysis(db, extractAnalysis({ score, mapped, call })).catch(() => {});

    // AUTO-TRIAGE FROM THE RECORDING: the v2 engine already produced a triage
    // verdict on this transcript (score._v2_shadow). Persist it as a triage case
    // so the "call these first" queue fills itself, instead of an intake
    // specialist re-keying a 15-field form for a call we just read. Deduped by
    // the source call so a re-score never doubles it. Best-effort and
    // failure-isolated — it can never fail the flag or abort the batch.
    await (async () => {
      const { triageFromCall } = await import("../src/lib/desk/triage-from-call.mjs");
      const t = triageFromCall({ score, call });
      if (!t || !t.source_call_id) return;
      const existing = await findTriageByCall(db, call.firm_id, t.source_call_id);
      if (!existing) await insertTriageCase(db, t);
    })().catch(() => {});

    // First-party product event: a call finished scoring. Feeds the founder
    // activity digest ("N calls scored for firm X, K flagged") and the
    // /studio/beta board. IDs/counts only, never transcript text or caller PII.
    // Best-effort — a log failure must never fail the flag or abort the batch.
    await recordEvent(db, {
      event: "score_completed",
      firm_id: call.firm_id ?? null,
      actor: "system",
      context: {
        call_id: String(call.id),
        leaked: Boolean(mapped.is_leaked_signable),
        score: mapped.qualification_score ?? null,
      },
    }).catch(() => {});

    // Populate the desk card's evidence + confidence tier for leaked flags.
    // Without this the card read "Unrated" with no verbatim quote on every REAL
    // call (the producing pipeline never wrote flag_confidence /
    // transcript_citations). COMPLIANCE §IV ("no citation, no claim"): the
    // engine's evidence quotes are only CANDIDATES — the existing citation guard
    // validates each against THIS transcript, drops (and logs for audit) anything
    // that doesn't match, and only the survivors are stored as shown ('passed').
    // The tier is evidence-tied: "strong" needs a passing citation. Best-effort —
    // an enrichment failure must never fail the flag or abort the batch (scoring
    // already succeeded above).
    if (mapped.is_leaked_signable) {
      try {
        const candidates = candidateQuotes(score).map((snippet) => ({
          fact_kind: "qualifying_fact",
          start_ms: 0, // evidence_quotes carry no offsets; 0 = unknown-but-present
          end_ms: 0,
          verbatim_snippet: snippet,
        }));
        // Guard drops fabricated/paraphrased quotes and logs them to the review
        // queue; `passed` are the transcript-confirmed lines we may display.
        const { passed } = await guardAndLog({
          db,
          flagId,
          citations: candidates,
          transcript,
        });
        for (const c of passed) {
          await insertTranscriptCitation(db, {
            flag_id: flagId,
            fact_kind: c.fact_kind,
            start_ms: c.start_ms,
            end_ms: c.end_ms,
            verbatim_snippet: c.verbatim_snippet,
            validation_score: c.score,
            status: "passed", // confirmed against the transcript → showable
          });
        }
        await setFlagConfidence(db, {
          flag_id: flagId,
          confidence_tier: confidenceTier({
            score,
            hasValidatedCitation: passed.length > 0,
          }),
          rubric_version: rubricVersion(score),
        });
      } catch (err) {
        await logError(db, {
          source: "score-worker.enrichFlag",
          message: `flag ${flagId} confidence/citation enrich failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
          firm_id: call.firm_id ?? null,
        }).catch(() => {});
      }
    }

    let conversationId = null;
    let messageId = null;

    // Leaked-signable => draft a first re-engagement SMS (drafted only).
    if (mapped.is_leaked_signable) {
      const template = getTemplate(templateId);
      const draft = await draftFirstMessage({
        transcriptSummary: score?.summary,
        template,
        firmName: firm?.name,
        callerName: call.caller_name,
        ...(drafter ? { drafter } : {}),
      });

      conversationId = await createConversation(db, {
        flag_id: flagId,
        firm_id: call.firm_id,
        caller_phone: call.caller_phone,
        status: "pending_approval",
        consent_basis: CONSENT_BASIS,
      });
      messageId = await createDraftMessage(db, {
        conversation_id: conversationId,
        body: draft,
      });
    }

    results.push({
      flag_id: flagId,
      call_id: call.id,
      caller_name: call.caller_name,
      qualification_score: mapped.qualification_score,
      signability_score: mapped.signability_score,
      is_leaked_signable: mapped.is_leaked_signable,
      reason: mapped.reason,
      conversation_id: conversationId,
      message_id: messageId,
    });
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      // Bounded retry (2 attempts total). A transient blip (AssemblyAI/Anthropic
      // momentary outage, a flaky transcript) should self-heal on the next sweep
      // instead of dying permanently. First failure -> a non-'failed'
      // "retry_scoring" status, which getUnscoredCalls re-selects (it excludes
      // only 'failed%'/'excluded%'); the retry runs quietly, no founder alert.
      // Second failure -> terminal 'failed_scoring' + the error row/alert, as
      // before. Capped at one retry, so the Session-9 anti-infinite-retry rule
      // still holds (a permanently-bad call goes terminal on attempt two).
      const alreadyRetried = String(call.status ?? "").startsWith("retry_scoring");
      if (alreadyRetried) {
        await setCallStatus(db, call.id, "failed_scoring", reason).catch(() => {});
        await logError(db, {
          source: "score-worker.scoreUnscored",
          message: `call ${call.id} failed to score (2 attempts): ${reason}`,
          firm_id: call.firm_id ?? null,
        }).catch(() => {});
        results.push({ call_id: call.id, error: reason, failed: true });
      } else {
        await setCallStatus(db, call.id, "retry_scoring", reason).catch(() => {});
        results.push({ call_id: call.id, error: reason, retry: true });
      }
      // continue with the next call — never abort the batch.
    }
  }
  return results;
}
