// At-rest encryption for integration credentials. Secrets must NEVER be stored
// in plaintext, so provider API keys are AES-256-GCM encrypted with a key
// derived from the INTEGRATIONS_ENC_KEY env var (a passphrase). The stored blob
// is base64(iv | authTag | ciphertext).
//
// If no key is configured, encrypt() throws — we refuse to store secrets rather
// than store them in the clear.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const IV_LEN = 12; // GCM standard
const TAG_LEN = 16;
// A fixed, non-secret salt for scrypt: the passphrase is the secret, not the salt.
const SALT = "intakeqa.integrations.v1";

function keyFrom(passphrase) {
  const pass = passphrase ?? process.env.INTEGRATIONS_ENC_KEY;
  if (!pass) {
    throw new Error(
      "INTEGRATIONS_ENC_KEY is not set — refusing to store integration credentials unencrypted",
    );
  }
  return scryptSync(String(pass), SALT, 32);
}

// Encrypt a UTF-8 string. Returns a base64 blob. `passphrase` overridable for tests.
export function encryptSecret(plaintext, passphrase) {
  const key = keyFrom(passphrase);
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

// Decrypt a blob produced by encryptSecret. Throws on tamper (GCM auth failure).
export function decryptSecret(blob, passphrase) {
  const key = keyFrom(passphrase);
  const buf = Buffer.from(String(blob), "base64");
  const iv = buf.subarray(0, IV_LEN);
  const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const enc = buf.subarray(IV_LEN + TAG_LEN);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString("utf8");
}

// Whether encryption is available (a key is configured).
export function encryptionAvailable(env = process.env) {
  return Boolean(env.INTEGRATIONS_ENC_KEY);
}

// --- At-rest encoding for the per-firm CallRail webhook signing key -----------
//
// The signing key is a shared secret that lets a caller forge valid webhook
// signatures, so it must never sit in `firms.callrail_webhook_secret` as
// plaintext. When a key is configured (hosted deployments — INTEGRATIONS_ENC_KEY
// is in the Vercel env list) the value is AES-256-GCM encrypted and tagged with
// a version prefix. On the local SQLite pilot (no key, dev-only) it is stored
// as-is; decode transparently handles both, so legacy plaintext rows and the
// local pilot keep working. Prefix lets decode tell the two apart.
const CALLRAIL_ENC_PREFIX = "enc:v1:";

export function encodeCallRailSecret(plaintext, env = process.env) {
  if (plaintext == null) return null;
  if (encryptionAvailable(env)) {
    return CALLRAIL_ENC_PREFIX + encryptSecret(String(plaintext), env.INTEGRATIONS_ENC_KEY);
  }
  return String(plaintext); // local pilot, no key — dev-only plaintext
}

export function decodeCallRailSecret(stored, env = process.env) {
  if (stored == null) return null;
  const s = String(stored);
  if (s.startsWith(CALLRAIL_ENC_PREFIX)) {
    return decryptSecret(s.slice(CALLRAIL_ENC_PREFIX.length), env.INTEGRATIONS_ENC_KEY);
  }
  return s; // legacy plaintext / local pilot
}
