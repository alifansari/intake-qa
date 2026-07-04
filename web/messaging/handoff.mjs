// E-sign / callback handoff — the step AFTER a re-engaged caller signals
// intent-to-proceed. This is operator-driven (a CLI command / approved action),
// consistent with the human-in-the-loop pilot; nothing here auto-detects intent
// and nothing here texts anyone.
//
//   * kind='esign'    — create a Dropbox Sign signature request (ALWAYS test_mode)
//                       for the firm's retainer, store a handoffs row, and set
//                       the conversation status='handed_off'. Tries an EMBEDDED
//                       request first; if embedded needs a paid tier the provider
//                       signals EMBEDDED_UNAVAILABLE and we fall back to a PLAIN
//                       (non-embedded) signature link — still test_mode, so the
//                       build/pilot is never blocked.
//   * kind='callback' — record the requested callback time, store a handoffs row
//                       (status stays 'pending' until it happens), set the
//                       conversation status='handed_off', and record a
//                       'booked_callback' outcome.
//
// The signature-request provider is INJECTABLE (default = real Dropbox Sign,
// lazy-imported) so tests use a deterministic fake — no key, no network, no cost.

import {
  getConversation,
  getFirm,
  createHandoff,
  setConversationStatus,
} from "../ingest/db.mjs";
import { recordOutcome } from "./outcome.mjs";

// Default (production) signature-request provider: real Dropbox Sign. Lazy-
// imported so the pilot and tests need no `@dropbox/sign` dependency — this path
// is only reached when tests inject nothing. Run `npm i @dropbox/sign` before
// live use. ALWAYS sends test_mode:1 (sandbox — CLAUDE.md guardrail (f)); a real
// number/retainer is never touched until A2P + TEST_MODE are cleared.
//
// Tries the requested mode; for `embedded` it uses the embedded API and returns
// the embedded sign URL. If embedded signing requires a paid tier, it throws an
// error carrying `code: 'EMBEDDED_UNAVAILABLE'` so initiateHandoff falls back to
// a plain link.
export async function defaultSignatureRequest({ firm, retainer, embedded, env = process.env }) {
  const apiKey = env.DROPBOX_SIGN_API_KEY;
  if (!apiKey) throw new Error("DROPBOX_SIGN_API_KEY is not set");

  const sdk = await import("@dropbox/sign");
  const api = new sdk.SignatureRequestApi();
  api.username = apiKey;

  const signer = {
    emailAddress: retainer?.signerEmail,
    name: retainer?.signerName,
  };
  const fileUrls = retainer?.fileUrl ? [retainer.fileUrl] : undefined;

  if (embedded) {
    const clientId = env.DROPBOX_SIGN_CLIENT_ID;
    if (!clientId) {
      const err = new Error("DROPBOX_SIGN_CLIENT_ID is required for embedded signing");
      err.code = "EMBEDDED_UNAVAILABLE";
      throw err;
    }
    try {
      const res = await api.signatureRequestCreateEmbedded({
        clientId,
        title: `${firm?.name ?? "Retainer"} — Retainer Agreement`,
        subject: "Please sign your retainer",
        signers: [signer],
        fileUrls,
        testMode: true,
      });
      const sigReq = res.body.signatureRequest;
      const signatureRequestId = sigReq.signatureRequestId;
      const signatureId = sigReq.signatures?.[0]?.signatureId;
      const embeddedRes = await api.embeddedSignUrl(signatureId);
      return {
        signature_request_id: signatureRequestId,
        sign_url: embeddedRes.body.embedded.signUrl,
        embedded: true,
      };
    } catch (err) {
      // A paid-tier / plan restriction on embedded signing -> signal fallback.
      const status = err?.statusCode ?? err?.response?.statusCode;
      if (status === 402 || status === 403) {
        const wrapped = new Error(`Embedded signing unavailable: ${err.message}`);
        wrapped.code = "EMBEDDED_UNAVAILABLE";
        throw wrapped;
      }
      throw err;
    }
  }

  // Plain (non-embedded) signature-request: a signing LINK, still test_mode.
  const res = await api.signatureRequestSend({
    title: `${firm?.name ?? "Retainer"} — Retainer Agreement`,
    subject: "Please sign your retainer",
    signers: [signer],
    fileUrls,
    testMode: true,
  });
  const sigReq = res.body.signatureRequest;
  return {
    signature_request_id: sigReq.signatureRequestId,
    sign_url: sigReq.signingUrl ?? sigReq.detailsUrl ?? null,
    embedded: false,
  };
}

// Start a handoff for a conversation. Returns a small result object describing
// what was created. `esignProvider` is injectable (tests pass a fake).
export async function initiateHandoff({
  db,
  conversationId,
  kind,
  esignProvider = defaultSignatureRequest,
  retainer = null,
  callbackAt = null,
  embedded = true,
  env = process.env,
  now = new Date(),
}) {
  const conversation = getConversation(db, conversationId);
  if (!conversation) throw new Error(`Conversation not found: ${conversationId}`);
  const firm = getFirm(db, conversation.firm_id);
  const nowIso = now.toISOString();

  if (kind === "esign") {
    let result;
    try {
      result = await esignProvider({ firm, retainer, embedded: true, env });
    } catch (err) {
      if (err?.code === "EMBEDDED_UNAVAILABLE") {
        // Paid-tier embedded -> fall back to a plain (non-embedded) link.
        result = await esignProvider({ firm, retainer, embedded: false, env });
      } else {
        throw err;
      }
    }

    const handoffId = createHandoff(db, {
      conversation_id: conversationId,
      firm_id: conversation.firm_id,
      kind: "esign",
      provider: "dropbox_sign",
      signature_request_id: result.signature_request_id,
      sign_url: result.sign_url,
      embedded: result.embedded ? 1 : 0,
      status: "pending",
    });
    setConversationStatus(db, conversationId, "handed_off", nowIso);

    return {
      handoffId,
      kind: "esign",
      signatureRequestId: result.signature_request_id,
      sign_url: result.sign_url,
      embedded: !!result.embedded,
    };
  }

  if (kind === "callback") {
    if (!callbackAt) throw new Error("callbackAt is required for a callback handoff");
    const handoffId = createHandoff(db, {
      conversation_id: conversationId,
      firm_id: conversation.firm_id,
      kind: "callback",
      callback_requested_at: callbackAt,
      status: "pending",
    });
    setConversationStatus(db, conversationId, "handed_off", nowIso);
    // Record the non-signed outcome for reconciliation (no recovery row).
    const { outcomeId } = recordOutcome({
      db,
      conversationId,
      result: "booked_callback",
      now,
    });
    return { handoffId, kind: "callback", callbackAt, outcomeId };
  }

  throw new Error(`Unknown handoff kind: ${kind}`);
}
