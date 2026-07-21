// Lead Docket connector (EXPORT mode) — writes Intake QA findings into a firm's
// OWN Lead Docket instance as opportunity notes. CREATE/APPEND ONLY: it never
// updates, merges, or deletes a firm record (the connector seam has no update
// method by construction), so the worst it can do is add a note.
//
// VERIFIED API contract (support.leaddocket.com / docs.leaddocket.com, 2026-07):
//   * Lead Docket is PER-INSTANCE — each firm has its own host. The base URL is
//     https://{firm-subdomain}.leaddocket.com/api and the firm pastes theirs into
//     the integration's URL field (stored as firm_integrations.webhook_url ->
//     ctx.baseUrl). There is NO shared api.leaddocket.com; without the firm's base
//     URL we skip, never guess a host.
//   * Auth: the API key travels in the "api_key" REQUEST HEADER (not Bearer). The
//     firm self-generates it under Manage -> Settings -> Account Settings and it's
//     stored AES-GCM-encrypted (firm_integrations.credentials_encrypted -> ctx.creds).
//   * Notes: POST /opportunities/append-note appends a note to an opportunity
//     (companion: /opportunities/clear-note, which we deliberately never call).
// The opportunity-id and note FIELD NAMES vary slightly per instance (each firm's
// Swagger console at {sub}.leaddocket.com/api is the source of truth), so they are
// field_map-overridable; the defaults match Lead Docket's common shape.
//
// SAFETY: nothing transmits unless (a) integration.enabled, (b) a decrypted api
// key, (c) the firm's base URL, AND (d) ctx.live (INTEGRATIONS_LIVE=true — a
// deliberate go-live env flip). Absent (d) it SIMULATES: it shapes the exact
// payload and returns it without any network call, so deploying this adapter can
// never write to a real firm's Lead Docket by accident. ctx.fetchImpl is
// injectable so this is integration-tested against a mock server.

// Per-instance field-name overrides (firm_integrations.field_map). Defaults match
// Lead Docket's common opportunity-note shape; a firm can remap via its Swagger.
function fields(ctx) {
  const fm = ctx.fieldMap ?? {};
  return {
    idField: fm.opportunity_id_field || "Id",
    noteField: fm.note_field || "Note",
    extra: fm.extra && typeof fm.extra === "object" ? fm.extra : {},
  };
}

// The single HTTP boundary. api_key header auth; append-only; live-gated.
async function ldPost(ctx, path, body) {
  if (!ctx.baseUrl) return { skipped: true, reason: "no_base_url", provider: "leaddocket" };
  if (!ctx.creds) return { skipped: true, reason: "no_api_key", provider: "leaddocket" };
  const base = String(ctx.baseUrl).replace(/\/+$/, "");
  const url = `${base}${path}`;
  // Live-gate: until the firm/Ali flips INTEGRATIONS_LIVE, simulate (no network).
  if (!ctx.live) {
    return { delivered: false, simulated: true, provider: "leaddocket", url, body };
  }
  const doFetch = ctx.fetchImpl ?? fetch;
  const res = await doFetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", api_key: String(ctx.creds) },
    body: JSON.stringify(body),
  });
  return { delivered: res.ok, status: res.status, provider: "leaddocket" };
}

// Shape the note body for an opportunity (field names field_map-overridable).
function noteBody(ctx, oppReference, note) {
  const f = fields(ctx);
  return { [f.idField]: oppReference ?? null, [f.noteField]: note, ...f.extra };
}

function oppRef(call) {
  return call?.external_call_id ?? call?.id ?? null;
}

// On flag creation: append the scored note to the opportunity, carrying the
// evidence deep link and the consent basis when present (consent travels).
export async function pushFlag(ctx, { call, flag, evidenceUrl, consent } = {}) {
  const note = (
    `Intake QA — leaked signable case. ` +
    `Handling score ${flag?.qualification_score ?? "?"}/100.` +
    (flag?.is_leaked_signable ? " Flagged as a leaked signable case." : "") +
    (flag?.reason ? ` ${flag.reason}` : "") +
    (evidenceUrl ? ` Evidence: ${evidenceUrl}` : "") +
    (consent ? ` [consent basis: ${consent}]` : "")
  ).trim();
  return ldPost(ctx, "/opportunities/append-note", noteBody(ctx, oppRef(call), note));
}

// On outcome: append a prompt to confirm the disposition in the system of record.
export async function pushOutcomePrompt(ctx, { call, consent } = {}) {
  const note =
    "Intake QA — please confirm the outcome for this flagged lead in your system of record." +
    (consent ? ` [consent basis: ${consent}]` : "");
  return ldPost(ctx, "/opportunities/append-note", noteBody(ctx, oppRef(call), note));
}

// On audit completion: append the case-ready summary memo as a note.
export async function pushCaseSummary(ctx, { call, memo, consent } = {}) {
  const note =
    `Intake QA — case-ready summary. ${typeof memo === "string" ? memo : JSON.stringify(memo ?? {})}` +
    (consent ? ` [consent basis: ${consent}]` : "");
  return ldPost(ctx, "/opportunities/append-note", noteBody(ctx, oppRef(call), note));
}
