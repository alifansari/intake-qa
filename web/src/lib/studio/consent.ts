// The consent attestation shown before ANY audio upload in the Spot Check Studio.
// California is an all-party-consent state (CIPA / Penal Code §632); this tool
// only ever processes the firm’s OWN, lawfully recorded intake calls. The
// attestation text is versioned so the exact wording the founder agreed to is
// stored immutably alongside each recording (compliance-invariants §II).
//
// If this text ever changes, BUMP the version — never edit in place. Old
// recordings must keep pointing at the version that was actually attested.
export const CONSENT_TEXT_VERSION = "v1-2026-07";

export const CONSENT_ATTESTATION_TEXT =
  "I confirm this recording was lawfully obtained by the firm with all-party consent.";
