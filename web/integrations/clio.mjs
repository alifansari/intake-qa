// Clio Manage connector (EXPORT mode) — pushes Intake QA findings into a firm's
// Clio as Notes/Tasks against the matching contact or matter. Mirrors the Lead
// Docket / Filevine adapters: ALL HTTP is isolated in `clioPost`, field names are
// PLACEHOLDERS the operator finalizes with real API docs + credentials, and
// `ctx.fetchImpl` is injectable so this is integration-tested against a local mock
// server (no live creds needed).
//
// Clio Manage API v4 uses an OAuth2 bearer access token. Getting credentials:
// register an app in the Clio Developer Portal, complete the OAuth flow for the
// firm, and store the resulting access token (encrypted) as the integration creds.

const DEFAULT_BASE = "https://app.clio.com";

// The single HTTP boundary. Everything else is pure payload shaping.
async function clioPost(ctx, path, data) {
  const doFetch = ctx.fetchImpl ?? fetch;
  const res = await doFetch(`${ctx.baseUrl || DEFAULT_BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ctx.creds ?? ""}`,
    },
    // Clio v4 wraps writes in a { data: {...} } envelope.
    body: JSON.stringify({ data }),
  });
  return { delivered: res.ok, status: res.status, provider: "clio" };
}

// On flag creation: attach a scored Note to the contact/matter, with a deep link
// back to our evidence drawer. (PLACEHOLDER field names — operator confirms w/ API.)
export async function pushFlag(ctx, { call, flag, evidenceUrl } = {}) {
  return clioPost(ctx, "/api/v4/notes.json", {
    subject: "Intake QA: leaked signable case",
    detail:
      `Handling score ${flag?.qualification_score ?? "?"}/100. ` +
      `${flag?.is_leaked_signable ? "Flagged as a leaked signable case. " : ""}` +
      `${flag?.reason ?? ""}`.trim() +
      (evidenceUrl ? `\nEvidence: ${evidenceUrl}` : ""),
    external_ref: call?.external_call_id ?? call?.id ?? null,
    ...(ctx.fieldMap ?? {}),
  });
}

// On outcome: create a Task prompting the firm to log the disposition in Clio.
export async function pushOutcomePrompt(ctx, { call } = {}) {
  return clioPost(ctx, "/api/v4/tasks.json", {
    name: "Confirm outcome for this Intake QA-flagged lead",
    external_ref: call?.external_call_id ?? call?.id ?? null,
    ...(ctx.fieldMap ?? {}),
  });
}

// On daily rescue packet: one Task per packet item so staff work callbacks from
// Clio directly (zero-login delivery, module 4/10). PLACEHOLDER field names.
export async function pushRescuePacket(ctx, { packet_date, items } = {}) {
  const results = [];
  for (const item of items ?? []) {
    results.push(
      await clioPost(ctx, "/api/v4/tasks.json", {
        name: `Rescue callback #${item.rank} (${packet_date}): ${item.prospect_name ?? "unknown caller"}`,
        description:
          `${item.diagnosis ?? ""}\n\nCALLBACK SCRIPT:\n${item.callback_script ?? ""}` +
          (item.sol_deadline ? `\n\nSOL deadline: ${item.sol_deadline} — call first.` : ""),
        priority: item.sol_deadline ? "High" : "Normal",
        ...(ctx.fieldMap ?? {}),
      })
    );
  }
  return { delivered: results.every((r) => r.delivered), provider: "clio", tasks: results.length };
}

// On audit completion: push the case-ready summary memo as a Note.
export async function pushCaseSummary(ctx, { call, memo } = {}) {
  return clioPost(ctx, "/api/v4/notes.json", {
    subject: "Intake QA: case-ready summary",
    detail: typeof memo === "string" ? memo : JSON.stringify(memo ?? {}),
    external_ref: call?.external_call_id ?? call?.id ?? null,
    ...(ctx.fieldMap ?? {}),
  });
}
