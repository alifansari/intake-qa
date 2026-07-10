// ============================================================================
// Intake engine — walks the fixed tree (tree.mjs), builds the CANONICAL
// RECORD, and appends the event trail. Pure logic, no I/O: the chat UI drives
// it in the browser and the server persists snapshots (api/intake/lead).
//
// The canonical record produced here is THE contract every channel shares
// (contact / incident / path_data / routing / provenance / review blocks —
// migration 0025). Voice and web-form channels later produce this same shape.
// ============================================================================

import { getNode, resolveNext, START_NODE, TREE_VERSION } from "./tree.mjs";
import { routeLead, terminalMessage } from "./routing.mjs";
import { AI_DISCLOSURE_VERSION } from "./guardrails.mjs";

export function createRecord(sessionId, now = new Date()) {
  return {
    channel: "website_chat",
    matter_type: "unknown",
    bucket: null,
    status: "in_progress",
    confidence: null,
    contact: {},
    incident: {},
    path_data: {},
    routing: {},
    provenance: {
      session_id: sessionId,
      tree_version: TREE_VERSION,
      disclosure_version: AI_DISCLOSURE_VERSION,
      started_at: now.toISOString(),
      node_history: [],
    },
    review: { verified: false }, // AI/chat-captured data stays unverified until a human reviews it
    consent_version: null,
    consent_at: null,
    events: [],
  };
}

function appendEvent(record, kind, payload, now) {
  record.events.push({
    seq: record.events.length,
    kind,
    payload,
    at: now.toISOString(),
  });
}

// Set a dot-path field ("contact.phone", "path_data.fault", "matter_type").
function setField(record, path, value) {
  const parts = path.split(".");
  if (parts.length === 1) {
    record[parts[0]] = value;
    return;
  }
  let obj = record;
  for (const p of parts.slice(0, -1)) {
    if (typeof obj[p] !== "object" || obj[p] === null) obj[p] = {};
    obj = obj[p];
  }
  obj[parts.at(-1)] = value;
}

// Render a node's prompt for the current record (prompts may be functions).
export function promptFor(nodeId, record) {
  const node = getNode(nodeId);
  if (!node) return null;
  if (node.kind === "terminal") return terminalMessage(record);
  return typeof node.prompt === "function" ? node.prompt(record) : node.prompt;
}

export function startConversation(sessionId, now = new Date()) {
  const record = createRecord(sessionId, now);
  appendEvent(record, "question", { node: START_NODE }, now);
  return { record, nodeId: START_NODE };
}

// Apply the visitor's answer to `nodeId` and advance. Returns
// { record, nodeId, done } where done=true means nodeId is a terminal that has
// been routed (record.bucket/routing/status are final).
//
// Answers by node kind:
//   choice → option key    text/phone → string    date → "YYYY-MM-DD"
//   upload → { filename, path } | null (skipped)
export function answerNode(record, nodeId, answer, now = new Date()) {
  const node = getNode(nodeId);
  if (!node || node.kind === "terminal") {
    return { record, nodeId, done: true };
  }

  let value = answer;
  let nextRef = node.next;

  if (node.kind === "choice") {
    const option = (node.options ?? []).find((o) => o.key === answer);
    if (!option) return { record, nodeId, done: false, invalid: true };
    value = option.key;
    nextRef = option.next;
  } else if (node.kind === "upload") {
    // null = skipped; otherwise append to the photo list.
    if (answer && typeof answer === "object") {
      const existing = record.path_data.photos ?? [];
      value = [...existing, { filename: answer.filename ?? "photo", path: answer.path ?? null }];
      appendEvent(record, "upload", { node: nodeId, filename: answer.filename ?? "photo" }, now);
    } else {
      value = record.path_data.photos ?? [];
    }
  } else if (typeof value === "string") {
    value = value.trim();
    if (!value) return { record, nodeId, done: false, invalid: true };
  }

  if (node.field) setField(record, node.field, value);
  appendEvent(record, "answer", { node: nodeId, value: node.kind === "upload" ? "(files)" : value }, now);

  // Consent chokepoint: proceeding past the disclosure stamps version + time.
  if (nodeId === START_NODE && value === "proceed") {
    record.consent_version = AI_DISCLOSURE_VERSION;
    record.consent_at = now.toISOString();
    appendEvent(record, "consent", { version: AI_DISCLOSURE_VERSION }, now);
  }

  record.provenance.node_history.push(nodeId);
  const nextId = resolveNext(nextRef, record);
  const nextNode = getNode(nextId);

  if (nextNode?.kind === "terminal") {
    const routing = routeLead(record, nextNode.force ?? null);
    record.routing = routing;
    record.bucket = routing.bucket;
    record.confidence = routing.confidence;
    record.status = "complete";
    appendEvent(record, "routed", routing, now);
    return { record, nodeId: nextId, done: true };
  }

  appendEvent(record, "question", { node: nextId }, now);
  return { record, nodeId: nextId, done: false };
}

// Record an off-script question that was answered with a FIXED deflection
// (guardrails.mjs): the question and which deflection fired go on the event
// trail — provable later that the agent never improvised — and the tree
// position is untouched.
export function recordDeflection(record, question, deflectionKey, now = new Date()) {
  appendEvent(record, "deflection", { question: String(question).slice(0, 500), deflection: deflectionKey }, now);
  return record;
}

// Merge the (optional) LLM interpretation of the narrative into the record —
// data fields only, never visitor-facing (guardrails.mjs).
export function applyInterpretation(record, interp, now = new Date()) {
  if (!interp || typeof interp !== "object") return record;
  const summary = typeof interp.summary === "string" ? interp.summary.trim() : "";
  if (summary) record.incident.summary = summary;
  for (const key of ["mentions_injury", "mentions_prior_attorney", "distress_cues"]) {
    if (typeof interp[key] === "boolean") record.incident[key] = interp[key];
  }
  appendEvent(record, "interpreted", { has_summary: Boolean(summary) }, now);
  return record;
}
