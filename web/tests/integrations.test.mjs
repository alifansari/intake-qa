// Tests for the CRM/webhook integration layer (Phase 5): at-rest credential
// encryption, HMAC webhook signing/verification/delivery, and the connector seam
// dispatching to the generic webhook and to a provider adapter (Lead Docket)
// against a mock fetch (the "local mock server").

import { test } from "node:test";
import assert from "node:assert/strict";

import { encryptSecret, decryptSecret } from "../integrations/crypto.mjs";
import { signBody, verifySignature, deliverWebhook } from "../integrations/webhooks.mjs";
import { dispatch } from "../integrations/connector.mjs";

const PASS = "test-passphrase-123";

// A mock fetch that records the last request and returns 200 OK.
function mockFetch() {
  const calls = [];
  const fn = async (url, opts) => {
    calls.push({ url, opts });
    return { ok: true, status: 200 };
  };
  fn.calls = calls;
  return fn;
}

// --- Encryption --------------------------------------------------------------

test("encryptSecret/decryptSecret round-trips and never stores plaintext", () => {
  const secret = "ld_live_key_abc123";
  const blob = encryptSecret(secret, PASS);
  assert.notEqual(blob, secret);
  assert.ok(!blob.includes(secret));
  assert.equal(decryptSecret(blob, PASS), secret);
});

test("decryptSecret fails on a tampered blob (GCM auth)", () => {
  const blob = encryptSecret("hunter2", PASS);
  const tampered = blob.slice(0, -2) + (blob.endsWith("A") ? "B" : "A") + "=";
  assert.throws(() => decryptSecret(tampered, PASS));
});

test("encryptSecret refuses without a key", () => {
  const saved = process.env.INTEGRATIONS_ENC_KEY;
  delete process.env.INTEGRATIONS_ENC_KEY;
  try {
    assert.throws(() => encryptSecret("x"), /INTEGRATIONS_ENC_KEY/);
  } finally {
    if (saved !== undefined) process.env.INTEGRATIONS_ENC_KEY = saved;
  }
});

// --- Webhooks ----------------------------------------------------------------

test("signBody is deterministic and verifySignature is correct", () => {
  const sig = signBody("secret", "body");
  assert.equal(sig, signBody("secret", "body"));
  assert.equal(verifySignature("secret", "body", sig), true);
  assert.equal(verifySignature("secret", "body", "deadbeef"), false);
  assert.equal(verifySignature("wrong", "body", sig), false);
});

test("deliverWebhook posts a signed body and skips when unconfigured", async () => {
  const f = mockFetch();
  const res = await deliverWebhook({
    url: "https://firm.example/hook",
    secret: "s3cr3t",
    event: "flag.created",
    data: { id: 1 },
    fetchImpl: f,
  });
  assert.equal(res.delivered, true);
  const { opts } = f.calls[0];
  const sig = opts.headers["x-intakeqa-signature"].replace("sha256=", "");
  assert.equal(verifySignature("s3cr3t", opts.body, sig), true);

  const skip = await deliverWebhook({ event: "flag.created", data: {}, fetchImpl: f });
  assert.equal(skip.skipped, true);
});

test("deliverWebhook rejects unknown event types", async () => {
  const res = await deliverWebhook({
    url: "https://x",
    secret: "s",
    event: "not.a.real.event",
    data: {},
    fetchImpl: mockFetch(),
  });
  assert.equal(res.skipped, true);
  assert.equal(res.reason, "unknown_event");
});

// --- Connector seam ----------------------------------------------------------

test("dispatch skips a disabled integration", async () => {
  const res = await dispatch({
    integration: { provider: "webhook", enabled: 0 },
    event: "flag.created",
    payload: {},
  });
  assert.equal(res.skipped, true);
});

test("dispatch routes provider=webhook through the signed webhook", async () => {
  const f = mockFetch();
  const res = await dispatch({
    integration: {
      provider: "webhook",
      enabled: 1,
      webhook_url: "https://firm.example/hook",
      webhook_secret: "abc",
    },
    event: "outcome.recorded",
    payload: { outcome_id: 7 },
    fetchImpl: f,
  });
  assert.equal(res.delivered, true);
  assert.equal(f.calls[0].opts.headers["x-intakeqa-event"], "outcome.recorded");
});

test("dispatch routes to the Lead Docket adapter with decrypted creds (mock server)", async () => {
  const f = mockFetch();
  const encrypted = encryptSecret("ld_key_xyz", PASS);
  const res = await dispatch({
    integration: {
      provider: "leaddocket",
      enabled: 1,
      credentials_encrypted: encrypted,
      webhook_url: "https://mock.leaddocket.local",
      field_map: JSON.stringify({ office: "LA" }),
    },
    event: "flag.created",
    payload: { call: { id: 42 }, flag: { qualification_score: 88, is_leaked_signable: 1, reason: "leaked" } },
    fetchImpl: f,
    decrypt: (blob) => decryptSecret(blob, PASS),
  });
  assert.equal(res.delivered, true);
  assert.equal(res.provider, "leaddocket");
  const { url, opts } = f.calls[0];
  assert.match(url, /mock\.leaddocket\.local\/v1\/leads\/notes/);
  assert.equal(opts.headers.authorization, "Bearer ld_key_xyz");
  const body = JSON.parse(opts.body);
  assert.equal(body.lead_ref, 42);
  assert.equal(body.office, "LA"); // field_map merged
});

test("dispatch routes to the Clio adapter with decrypted creds (mock server)", async () => {
  const f = mockFetch();
  const encrypted = encryptSecret("clio_tok_abc", PASS);
  const res = await dispatch({
    integration: {
      provider: "clio",
      enabled: 1,
      credentials_encrypted: encrypted,
      webhook_url: "https://mock.clio.local",
      field_map: JSON.stringify({ external_ref: "M-9" }),
    },
    event: "flag.created",
    payload: { call: { id: 7 }, flag: { qualification_score: 91, is_leaked_signable: 1, reason: "no ask" } },
    fetchImpl: f,
    decrypt: (blob) => decryptSecret(blob, PASS),
  });
  assert.equal(res.delivered, true);
  assert.equal(res.provider, "clio");
  const { url, opts } = f.calls[0];
  assert.match(url, /mock\.clio\.local\/api\/v4\/notes\.json/);
  assert.equal(opts.headers.authorization, "Bearer clio_tok_abc");
  const body = JSON.parse(opts.body);
  assert.equal(body.data.external_ref, "M-9"); // v4 { data } envelope + field_map merged
  assert.match(body.data.detail, /Handling score 91/);
});
