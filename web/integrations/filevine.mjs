// Filevine connector (EXPORT mode) — writes a finished intake into a firm's OWN
// Filevine as a real MATTER (Person -> Project -> Note): the keystone / moat, so
// nobody re-keys the case. CREATE/APPEND-ONLY (no updates or deletes of firm data).
//
// Filevine API contract (developer.filevine.com): Bearer PAT auth PLUS the acting
// org + user on every request via the x-fv-orgid / x-fv-userid headers. Creds may
// be a bare PAT string or a JSON blob {pat, orgId, userId}; the base URL defaults
// to api.filevine.io (override per firm via the integration URL). Per-firm custom
// fields (projectTypeId + custom-field selectors) are configured, never guessed.
//
// SAFETY (B-023 pattern): nothing transmits unless ctx.live (INTEGRATIONS_LIVE=true,
// threaded by the connector) — absent it, every request SIMULATES: it shapes the
// exact payload and returns it with no network call, so a connected firm's Filevine
// is never written to by accident. Going live is the deliberate env flip + the
// firm's own credentials. ctx.fetchImpl is injectable for mock-server tests.

const DEFAULT_BASE = "https://api.filevine.io";

// Credentials may be a bare PAT string, or a JSON blob {pat, orgId, userId} —
// Filevine needs the org + acting-user on every request. Parse both shapes.
function parseCreds(creds) {
  if (creds && typeof creds === "object") return creds;
  if (typeof creds === "string" && creds.trim().startsWith("{")) {
    try {
      return JSON.parse(creds);
    } catch {
      /* fall through */
    }
  }
  return { pat: creds };
}

function fvHeaders(ctx) {
  const c = parseCreds(ctx.creds);
  const h = {
    "content-type": "application/json",
    authorization: `Bearer ${c.pat ?? ctx.creds ?? ""}`,
  };
  const orgId = c.orgId ?? ctx.fieldMap?.orgId;
  const userId = c.userId ?? ctx.fieldMap?.userId;
  if (orgId) h["x-fv-orgid"] = String(orgId);
  if (userId) h["x-fv-userid"] = String(userId);
  return h;
}

async function fvReq(ctx, method, path, body) {
  const url = `${ctx.baseUrl || DEFAULT_BASE}${path}`;
  // Live-gate: simulate (no network) until INTEGRATIONS_LIVE is flipped (ctx.live,
  // threaded by the connector). Absent it, we return what WOULD have been sent.
  if (!ctx.live) {
    return { ok: false, simulated: true, status: 0, json: null, url, method, body };
  }
  const doFetch = ctx.fetchImpl ?? fetch;
  const res = await doFetch(url, {
    method,
    headers: fvHeaders(ctx),
    body: body != null ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try {
    json = await res.json();
  } catch {
    /* non-JSON body */
  }
  return { ok: res.ok, status: res.status, json };
}

async function fvPost(ctx, path, body) {
  const r = await fvReq(ctx, "POST", path, body);
  return {
    delivered: r.ok,
    status: r.status,
    provider: "filevine",
    ...(r.simulated ? { simulated: true, url: r.url, body } : {}),
  };
}

// THE MOAT — create the intake MATTER with the facts written in (not just a note
// on an existing project). Person -> Project (matter, with per-firm custom-field
// mapping) -> a note carrying the full intake summary so the record lands even
// where a firm hasn't mapped every custom field. `ctx.fieldMap` supplies the
// firm's projectTypeId + custom-field selectors; `ctx.fetchImpl` is injectable
// for tests. Field selectors are firm-specific, so the mapping is configured per
// firm, never guessed.
export async function pushIntake(ctx, { record } = {}) {
  if (!record) return { delivered: false, skipped: true, reason: "no_record" };
  const fm = ctx.fieldMap ?? {};

  // 1. Person.
  const nameParts = String(record.person?.name ?? "").trim().split(/\s+/).filter(Boolean);
  const person = await fvReq(ctx, "POST", "/core/persons", {
    firstName: nameParts[0] ?? null,
    lastName: nameParts.slice(1).join(" ") || null,
    phone: record.person?.phone ?? null,
    ...(fm.personFields ?? {}),
  });
  const personId = person.ok ? (person.json?.personId ?? person.json?.id ?? null) : null;

  // 2. Project (matter) with per-firm custom fields.
  const custom = {};
  const sel = fm.custom && typeof fm.custom === "object" ? fm.custom : {};
  for (const f of record.facts ?? []) {
    if (sel[f.key]) custom[`custom.${sel[f.key]}`] = f.value;
  }
  if (sel.disposition && record.disposition_plain) custom[`custom.${sel.disposition}`] = record.disposition_plain;
  if (sel.sol_deadline && record.incident?.sol_deadline) custom[`custom.${sel.sol_deadline}`] = record.incident.sol_deadline;
  if (sel.area_of_law && record.incident?.area_of_law_sali) custom[`custom.${sel.area_of_law}`] = record.incident.area_of_law_sali;

  const project = await fvReq(ctx, "POST", "/core/projects", {
    projectTypeId: fm.projectTypeId ?? null,
    projectOrClientName: record.person?.name ?? "New intake",
    personId,
    incidentDate: record.incident?.incident_date ?? null,
    externalRef: record.external_ref ?? null,
    ...custom,
  });
  const projectId = project.ok ? (project.json?.projectId ?? project.json?.id ?? null) : null;

  // 3. Note carrying the full intake summary.
  if (projectId && record.summary) {
    await fvReq(ctx, "POST", `/core/projects/${projectId}/notes`, { body: record.summary });
  }

  return {
    delivered: Boolean(project.ok),
    provider: "filevine",
    projectId,
    personId,
    status: project.status,
    ...(project.simulated ? { simulated: true } : {}),
  };
}

// Notes attach to an EXISTING Filevine project. A leaked-call flag has no project
// yet (the matter is created by pushIntake), so these only fire when the caller
// supplies a Filevine projectId (payload.projectId or fieldMap.projectId); absent
// it they skip HONESTLY rather than post to a project that doesn't exist.
function resolveProjectId(ctx, pid) {
  return pid ?? ctx.fieldMap?.projectId ?? null;
}

export async function pushFlag(ctx, { flag, evidenceUrl, projectId } = {}) {
  const pj = resolveProjectId(ctx, projectId);
  if (!pj) return { delivered: false, skipped: true, reason: "no_project_ref", provider: "filevine" };
  const body =
    `Intake QA — handling score ${flag?.qualification_score ?? "?"}/100.` +
    (flag?.is_leaked_signable ? " Leaked signable case." : "") +
    (flag?.reason ? ` ${flag.reason}` : "") +
    (evidenceUrl ? ` Evidence: ${evidenceUrl}` : "");
  return fvPost(ctx, `/core/projects/${pj}/notes`, { body: body.trim() });
}

export async function pushOutcomePrompt(ctx, { projectId } = {}) {
  const pj = resolveProjectId(ctx, projectId);
  if (!pj) return { delivered: false, skipped: true, reason: "no_project_ref", provider: "filevine" };
  return fvPost(ctx, `/core/projects/${pj}/notes`, {
    body: "Intake QA — please confirm the outcome for this flagged lead in your system of record.",
  });
}

export async function pushCaseSummary(ctx, { memo, projectId } = {}) {
  const pj = resolveProjectId(ctx, projectId);
  if (!pj) return { delivered: false, skipped: true, reason: "no_project_ref", provider: "filevine" };
  return fvPost(ctx, `/core/projects/${pj}/notes`, {
    body: typeof memo === "string" ? memo : JSON.stringify(memo ?? {}),
  });
}
