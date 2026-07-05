// Filevine connector (EXPORT mode) — same shape as the Lead Docket adapter. ALL
// HTTP is isolated in `fvPost`; field names are PLACEHOLDERS the operator
// finalizes with real API docs. `ctx.fetchImpl` is injectable for mock-server
// integration tests.

const DEFAULT_BASE = "https://api.filevine.io";

async function fvPost(ctx, path, body) {
  const doFetch = ctx.fetchImpl ?? fetch;
  const res = await doFetch(`${ctx.baseUrl || DEFAULT_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ctx.creds ?? ""}`,
    },
    body: JSON.stringify(body),
  });
  return { delivered: res.ok, status: res.status, provider: "filevine" };
}

export async function pushFlag(ctx, { call, flag, evidenceUrl } = {}) {
  return fvPost(ctx, "/core/projects/notes", {
    external_ref: call?.external_call_id ?? call?.id ?? null,
    body:
      `Intake QA — handling score ${flag?.qualification_score ?? "?"}/100. ` +
      `${flag?.is_leaked_signable ? "Leaked signable case. " : ""}${flag?.reason ?? ""}`.trim(),
    link: evidenceUrl ?? null,
    ...(ctx.fieldMap ?? {}),
  });
}

export async function pushOutcomePrompt(ctx, { call } = {}) {
  return fvPost(ctx, "/core/projects/tasks", {
    external_ref: call?.external_call_id ?? call?.id ?? null,
    subject: "Confirm outcome for this Intake QA-flagged lead",
    ...(ctx.fieldMap ?? {}),
  });
}

export async function pushCaseSummary(ctx, { call, memo } = {}) {
  return fvPost(ctx, "/core/projects/notes", {
    external_ref: call?.external_call_id ?? call?.id ?? null,
    body: typeof memo === "string" ? memo : JSON.stringify(memo ?? {}),
    ...(ctx.fieldMap ?? {}),
  });
}
