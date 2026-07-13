// ============================================================================
// The Mock CRM connector — the ONLY connector implementation in this codebase.
//
// The port shape every real connector must satisfy (and the reason the AI can
// never edit a matter: THERE IS NO UPDATE METHOD — create-only by
// construction, migration 0029):
//   kind: string
//   createLead(payload)            → { ok, external_id?, error?, retryable? }
//   findPossibleDuplicates(payload)→ [{ external_id, reason }]
//   readConversions(sinceISO)      → [{ external_id, converted_at }]   (minimal Ledger read-back)
//
// Real Lead Docket / Filevine / Litify / Clio connectors are deferred and
// gated on per-integration sign-off (ROADMAP.md). This mock exists so the
// whole handoff pipeline — mapping, duplicate flagging, review postures,
// retries, idempotency, read-back — is fully exercisable without touching
// anyone’s CRM.
// ============================================================================

export function createMockCrm(opts = {}) {
  const leads = new Map(); // external_id → payload
  let seq = 0;
  let failNext = 0;

  return {
    kind: "mock",
    leads,

    // Test hook: make the next N creates fail (retryable) to exercise backoff.
    failNextCreates(n) {
      failNext = n;
    },

    async createLead(payload) {
      if (failNext > 0) {
        failNext--;
        return { ok: false, error: "mock transient failure", retryable: true };
      }
      const external_id = `MOCK-${++seq}`;
      leads.set(external_id, { ...payload, created_at: opts.now?.() ?? "2026-01-01T00:00:00Z" });
      return { ok: true, external_id };
    },

    // Duplicate = same phone on an existing lead. Real connectors search the
    // CRM; the contract is identical: FLAG, never merge.
    async findPossibleDuplicates(payload) {
      const phone = payload?.fields?.phone ?? null;
      if (!phone) return [];
      const out = [];
      for (const [external_id, existing] of leads.entries()) {
        if (existing?.fields?.phone === phone) {
          out.push({ external_id, reason: "same_phone" });
        }
      }
      return out;
    },

    // Minimal conversion read-back for the Ledger (Phase 6 firm column).
    _conversions: [],
    markConverted(external_id, atISO = "2026-01-15T00:00:00Z") {
      this._conversions.push({ external_id, converted_at: atISO });
    },
    async readConversions(sinceISO) {
      return this._conversions.filter((c) => !sinceISO || c.converted_at >= sinceISO);
    },
  };
}
