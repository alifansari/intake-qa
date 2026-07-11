// The real Dropbox Sign client for the beta NDA — the injectable `dropboxSign`
// that beta/nda.mjs sendNdaRequest() expects. Mirrors messaging/handoff.mjs:
// the @dropbox/sign SDK is LAZY-imported so the pilot and tests need no
// dependency (run `npm i @dropbox/sign` before live use), and the request stays
// in SANDBOX (test_mode:1) until DROPBOX_SIGN_LIVE=true is explicitly set — so
// Ali can walk the whole flow end-to-end without sending a legally-binding NDA
// before Yang has approved the template (compliance-invariants §VII).
//
// Wire-up: the /api/beta/apply route constructs this and passes it to
// sendNdaRequest() only when DROPBOX_SIGN_API_KEY + DROPBOX_SIGN_NDA_TEMPLATE_ID
// are set and TEST_MODE is off; otherwise the send is simulated as before.

export function defaultNdaClient({ env = process.env } = {}) {
  return {
    // Returns { signatureRequestId }. Throws on config/API errors (the caller
    // in apply/route.ts .catch()s and logs, so a bad send never breaks apply).
    async sendNda({ templateId, signerEmail, signerName }) {
      const apiKey = env.DROPBOX_SIGN_API_KEY;
      if (!apiKey) throw new Error("DROPBOX_SIGN_API_KEY is not set");
      if (!templateId) throw new Error("DROPBOX_SIGN_NDA_TEMPLATE_ID is not set");

      const sdk = await import("@dropbox/sign");
      const api = new sdk.SignatureRequestApi();
      api.username = apiKey;

      // Sandbox unless explicitly flipped live. The template is legal content;
      // do NOT send a binding NDA until it is reviewed and DROPBOX_SIGN_LIVE=true.
      const live = env.DROPBOX_SIGN_LIVE === "true";

      const res = await api.signatureRequestSendWithTemplate({
        templateIds: [templateId],
        subject: "Intake QA — Mutual NDA (founding beta)",
        message:
          "This is the mutual NDA for the Intake QA founding beta. Your calls and " +
          "our beta stay confidential in both directions. Sign here to continue.",
        signers: [
          {
            // The template's signer role. "Firm" matches the drafted NDA's signer
            // block; if your Dropbox Sign template names the role differently, set
            // DROPBOX_SIGN_NDA_SIGNER_ROLE to that exact role name.
            role: env.DROPBOX_SIGN_NDA_SIGNER_ROLE || "Firm",
            emailAddress: signerEmail,
            name: signerName,
          },
        ],
        testMode: !live,
      });

      const sigReq = res?.body?.signatureRequest;
      const signatureRequestId = sigReq?.signatureRequestId;
      if (!signatureRequestId) throw new Error("Dropbox Sign returned no signature_request_id");
      return { signatureRequestId };
    },
  };
}
