// Lead Docket connector (EXPORT mode) — pushes Intake QA findings into a firm's
// Lead Docket as lead notes/tasks. ALL HTTP is isolated in `ldPost` so the
// operator can finalize the exact API shape with real credentials; the field
// names below are PLACEHOLDERS marked as such. `ctx.fetchImpl` is injectable so
// this is integration-tested against a local mock server (no live creds needed).

const DEFAULT_BASE = "https://api.leaddocket.com";

// The single HTTP boundary. Everything else is pure payload shaping.
async function ldPost(ctx, path, body) {
  const doFetch = ctx.fetchImpl ?? fetch;
  const res = await doFetch(`${ctx.baseUrl || DEFAULT_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ctx.creds ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  return { delivered: res.ok, status: res.status, provider: "leaddocket" };
}

// On flag creation: attach a scored note to the lead, with a deep link back to
// our evidence drawer. (PLACEHOLDER field names — operator confirms with API docs.)
export async function pushFlag(ctx, { call, flag, evidenceUrl } = {}) {
  return ldPost(ctx, "/v1/leads/notes", {
    lead_ref: call?.external_call_id ?? call?.id ?? null,
    subject: "Intake QA: leaked signable case",
    note:
      `Handling score ${flag?.qualification_score ?? "?"}/100. ` +
      `${flag?.is_leaked_signable ? "Flagged as a leaked signable case. " : ""}` +
      `${flag?.reason ?? ""}`.trim(),
    evidence_url: evidenceUrl ?? null,
    ...(ctx.fieldMap ?? {}),
  });
}

// On outcome: prompt the firm to log the disposition in their system of record.
export async function pushOutcomePrompt(ctx, { call } = {}) {
  return ldPost(ctx, "/v1/leads/tasks", {
    lead_ref: call?.external_call_id ?? call?.id ?? null,
    task: "Confirm outcome for this Intake QA-flagged lead",
    ...(ctx.fieldMap ?? {}),
  });
}

// On audit completion: push the case-ready summary memo as a note.
export async function pushCaseSummary(ctx, { call, memo } = {}) {
  return ldPost(ctx, "/v1/leads/notes", {
    lead_ref: call?.external_call_id ?? call?.id ?? null,
    subject: "Intake QA: case-ready summary",
    note: typeof memo === "string" ? memo : JSON.stringify(memo ?? {}),
    ...(ctx.fieldMap ?? {}),
  });
}
