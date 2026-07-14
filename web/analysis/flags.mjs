// Feature flags (server-side). Canonical, pure, node-testable (.mjs so both the
// .mjs engine modules and the .ts/.tsx app can import ONE source of truth).
//
// SAMPLED_REVIEW_ENABLED — gates the "tiered / sampled review" model. DEFAULT OFF.
// When OFF, every user-visible string, the attestation text, and all behavior are
// BYTE-IDENTICAL to today (this is the safety property). When ON, the tiered model
// applies: a narrowed attestation, firm-facing provenance badges, and (where the
// underlying risk signals actually persist) an auto-release path for auto_eligible
// findings. The flag is read server-side; a bare env read is intentional so it is
// a deploy-time switch, not a per-request one.
//
// COMPLIANCE: flipping this flag alters what the signed attestation attests to
// (compliance-invariants §IV/§V) — it is a novel regulated change. It must not be
// turned on without Ali's decision and Yang's review. This module only READS it.

// Truthy env values: "true" | "1" (trimmed, case-insensitive). Anything else = OFF.
export function isSampledReviewEnabled(env = process.env) {
  const raw = (env?.SAMPLED_REVIEW_ENABLED ?? "").toString().trim().toLowerCase();
  return raw === "true" || raw === "1";
}
