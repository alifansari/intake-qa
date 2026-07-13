// ============================================================================
// The intake qualification tree — a FIXED GRAPH of pre-written questions.
//
// This is guardrail (a) from guardrails.mjs: the agent is structurally unable
// to improvise. Every visitor-facing prompt lives here as reviewed copy; every
// branch is an explicit edge; every path ends in one of the four terminal
// buckets (book / escalate / human_handoff / decline) WITH a next action —
// "no dead ends" is a validateTree() invariant, tested in CI.
//
// Node kinds:
//   choice        — quick-reply buttons; each option names its next node
//   text          — free text (narrative, name, hazard description)
//   phone         — free text with light phone shaping
//   date          — date input (the SOL gate reads it)
//   upload        — optional file attach (photos); skippable
//   terminal      — conversation end; routing.mjs decides/records the bucket
//
// `next` may be a node id or a function(record) for data-dependent branches
// (the SOL gate, the matter fork after the narrative). TREE_VERSION is stamped
// into every record’s provenance; bump it when the graph changes.
//
// Flow: consent → emergency screen → contact capture EARLY (an abandoned
// session is still a lead) → matter fork → incident date (SOL gate) →
// narrative → path questions → prior-representation/conflict → routing.
// ============================================================================

import { AI_DISCLOSURE_TEXT } from "./guardrails.mjs";
import { solCheck } from "./routing.mjs";

export const TREE_VERSION = "intake-tree-v1-2026-07";
export const START_NODE = "consent";

// Shared follow-ups so all three paths converge on the same tail.
const TAIL_AFTER_PATH = "prior_rep";

export const NODES = {
  // --- Consent first (CIPA + AI disclosure; see guardrails.mjs) --------------
  consent: {
    kind: "choice",
    prompt: AI_DISCLOSURE_TEXT,
    options: [
      { key: "proceed", label: "OK, continue", next: "emergency" },
      { key: "no_consent", label: "No thanks", next: "t_no_consent" },
    ],
  },

  // --- Emergency / catastrophic screen ---------------------------------------
  emergency: {
    kind: "choice",
    prompt:
      "First and most important: is anyone hurt badly enough to need emergency help right now, or is anyone in the hospital?",
    field: "incident.emergency",
    options: [
      { key: "yes", label: "Yes", next: "em_name" },
      { key: "no", label: "No, everyone is safe", next: "name" },
    ],
  },
  em_name: {
    kind: "text",
    prompt:
      "If it’s an active emergency, please call 911 before anything else. So the attorney can follow up right away — what’s your first name?",
    field: "contact.first_name",
    next: "em_phone",
  },
  em_phone: {
    kind: "phone",
    prompt: "And the best phone number to reach you at?",
    field: "contact.phone",
    next: "t_emergency",
  },

  // --- Contact capture, early (an abandoned session is still a lead) ---------
  name: {
    kind: "text",
    prompt: "I’m sorry you’re dealing with this. Let’s get you taken care of. What’s your first name?",
    field: "contact.first_name",
    next: "phone",
  },
  phone: {
    kind: "phone",
    prompt: (r) =>
      `Thanks${r.contact.first_name ? `, ${r.contact.first_name}` : ""}. What’s the best phone number to reach you at, in case we get disconnected?`,
    field: "contact.phone",
    next: "matter",
  },

  // --- Matter-type fork --------------------------------------------------------
  matter: {
    kind: "choice",
    prompt: "Got it. Which of these best describes what happened?",
    field: "matter_type",
    options: [
      { key: "mva", label: "Car / vehicle accident", next: "incident_date" },
      { key: "premises", label: "Injured on someone’s property", next: "incident_date" },
      { key: "dog_bite", label: "Dog bite", next: "incident_date" },
      { key: "other", label: "Something else", next: "other_summary" },
    ],
  },
  other_summary: {
    kind: "text",
    prompt:
      "No problem — tell me briefly what happened, and I’ll make sure it gets in front of a person at the office.",
    field: "incident.narrative",
    next: "t_other",
  },

  // --- SOL gate (deterministic; never states a legal conclusion) --------------
  incident_date: {
    kind: "date",
    prompt: "When did it happen? A rough date is fine.",
    field: "incident.date",
    next: (r) => (solCheck(r.incident.date).status === "expired" ? "t_sol" : "narrative"),
  },

  // --- Narrative (free text, stored verbatim) ---------------------------------
  narrative: {
    kind: "text",
    prompt: "In your own words — what happened?",
    field: "incident.narrative",
    next: (r) =>
      r.matter_type === "mva"
        ? "mva_role"
        : r.matter_type === "premises"
          ? "prem_location"
          : "dog_owner",
  },

  // ============================ MVA path =====================================
  mva_role: {
    kind: "choice",
    prompt: "Were you driving, or something else?",
    field: "path_data.role",
    options: [
      { key: "driver", label: "Driving", next: "mva_fault" },
      { key: "passenger", label: "Passenger", next: "mva_fault" },
      { key: "pedestrian", label: "Walking", next: "mva_fault" },
      { key: "cyclist", label: "On a bike", next: "mva_fault" },
    ],
  },
  mva_fault: {
    kind: "choice",
    prompt: "Who do you believe caused the accident? Your honest read is all I need.",
    field: "path_data.fault",
    options: [
      { key: "other", label: "The other driver", next: "mva_police" },
      { key: "me", label: "Mostly me", next: "mva_police" },
      { key: "shared", label: "Both / shared", next: "mva_police" },
      { key: "unsure", label: "Not sure", next: "mva_police" },
    ],
  },
  mva_police: {
    kind: "choice",
    prompt: "Did police come out, or is there a police report?",
    field: "path_data.police_report",
    options: [
      { key: "yes", label: "Yes", next: "mva_injured" },
      { key: "no", label: "No", next: "mva_injured" },
      { key: "unsure", label: "Not sure", next: "mva_injured" },
    ],
  },
  mva_injured: {
    kind: "choice",
    prompt: "Were you (or anyone with you) injured?",
    field: "path_data.injured",
    options: [
      { key: "treated", label: "Yes — I’ve seen a doctor", next: "mva_treatment" },
      { key: "not_yet", label: "Yes — no treatment yet", next: "mva_other_insurance" },
      { key: "no", label: "No injuries", next: "mva_other_insurance" },
    ],
  },
  mva_treatment: {
    kind: "choice",
    prompt: "Where were you treated?",
    field: "path_data.treatment",
    options: [
      { key: "er", label: "Emergency room", next: "mva_other_insurance" },
      { key: "urgent", label: "Urgent care", next: "mva_other_insurance" },
      { key: "doctor", label: "My doctor", next: "mva_other_insurance" },
      { key: "chiro", label: "Chiropractor / PT", next: "mva_other_insurance" },
    ],
  },
  mva_other_insurance: {
    kind: "choice",
    prompt: "Do you know if the other driver has insurance?",
    field: "path_data.other_driver_insured",
    options: [
      { key: "yes", label: "Yes", next: "mva_photos" },
      { key: "no", label: "No / uninsured", next: "mva_photos" },
      { key: "unknown", label: "Don’t know", next: "mva_photos" },
    ],
  },
  mva_photos: {
    kind: "upload",
    prompt:
      "If you have photos — the cars, the scene, your injuries — you can attach them here. Totally optional.",
    field: "path_data.photos",
    next: TAIL_AFTER_PATH,
  },

  // ========================== Premises path ==================================
  prem_location: {
    kind: "choice",
    prompt: "Where did it happen?",
    field: "path_data.location_type",
    options: [
      { key: "business", label: "A business (store, restaurant…)", next: "prem_hazard" },
      { key: "residence", label: "Someone’s home", next: "prem_hazard" },
      { key: "government", label: "Public / government property", next: "prem_hazard" },
      { key: "other_loc", label: "Somewhere else", next: "prem_hazard" },
    ],
  },
  prem_hazard: {
    kind: "text",
    prompt: "What caused it — what did you slip, trip, or get hurt on?",
    field: "path_data.hazard",
    next: "prem_notice",
  },
  prem_notice: {
    kind: "choice",
    prompt:
      "As far as you know, did the owner or staff know about the problem before you got hurt — or had anyone reported it?",
    field: "path_data.notice",
    options: [
      { key: "reported", label: "It had been reported", next: "prem_hazard_now" },
      { key: "staff_knew", label: "Staff knew / it was obvious", next: "prem_hazard_now" },
      { key: "unsure", label: "Not sure", next: "prem_hazard_now" },
      { key: "no", label: "Probably not", next: "prem_hazard_now" },
    ],
  },
  prem_hazard_now: {
    kind: "choice",
    prompt: "Is the hazard still there right now, as far as you know?",
    field: "path_data.hazard_still_present",
    options: [
      { key: "still_there", label: "Still there", next: "prem_photos" },
      { key: "fixed", label: "It’s been fixed/cleaned", next: "prem_injured" },
      { key: "unsure", label: "Not sure", next: "prem_injured" },
    ],
  },
  prem_photos: {
    kind: "upload",
    prompt:
      "If you can safely get a photo of it, that really helps — hazards tend to disappear fast. Attach here, or skip.",
    field: "path_data.photos",
    next: "prem_injured",
  },
  prem_injured: {
    kind: "choice",
    prompt: "Were you injured?",
    field: "path_data.injured",
    options: [
      { key: "treated", label: "Yes — I’ve seen a doctor", next: "prem_treatment" },
      { key: "not_yet", label: "Yes — no treatment yet", next: TAIL_AFTER_PATH },
      { key: "no", label: "No injuries", next: TAIL_AFTER_PATH },
    ],
  },
  prem_treatment: {
    kind: "choice",
    prompt: "Where were you treated?",
    field: "path_data.treatment",
    options: [
      { key: "er", label: "Emergency room", next: TAIL_AFTER_PATH },
      { key: "urgent", label: "Urgent care", next: TAIL_AFTER_PATH },
      { key: "doctor", label: "My doctor", next: TAIL_AFTER_PATH },
      { key: "chiro", label: "Chiropractor / PT", next: TAIL_AFTER_PATH },
    ],
  },

  // ========================== Dog-bite path ==================================
  dog_owner: {
    kind: "choice",
    prompt: "Do you know who owns the dog?",
    field: "path_data.owner_known",
    options: [
      { key: "known_acquaintance", label: "Yes — neighbor / someone I know", next: "dog_insurance" },
      { key: "known_stranger", label: "Yes — identified, but a stranger", next: "dog_insurance" },
      { key: "unknown", label: "No — unknown", next: "dog_insurance" },
    ],
  },
  dog_insurance: {
    kind: "choice",
    prompt:
      "Do you know if the owner has homeowner’s or renter’s insurance? (It often covers this — no worries if you don’t know.)",
    field: "path_data.owner_insurance",
    options: [
      { key: "likely", label: "Yes / probably", next: "dog_child" },
      { key: "unknown", label: "Don’t know", next: "dog_child" },
      { key: "none", label: "Probably not", next: "dog_child" },
    ],
  },
  dog_child: {
    kind: "choice",
    prompt: "Was the person bitten under 18?",
    field: "path_data.victim_is_child",
    options: [
      { key: "yes", label: "Yes", next: "dog_injury" },
      { key: "no", label: "No", next: "dog_injury" },
    ],
  },
  dog_injury: {
    kind: "choice",
    prompt: "How serious was the bite?",
    field: "path_data.injury_severity",
    options: [
      { key: "er", label: "ER visit / deep wound", next: "dog_treatment" },
      { key: "stitches", label: "Stitches or scarring", next: "dog_treatment" },
      { key: "minor", label: "Broke the skin, minor", next: "dog_treatment" },
    ],
  },
  dog_treatment: {
    kind: "choice",
    prompt: "Has it been treated?",
    field: "path_data.treatment",
    options: [
      { key: "er", label: "Yes — ER / urgent care", next: "dog_photos" },
      { key: "doctor", label: "Yes — doctor", next: "dog_photos" },
      { key: "none_yet", label: "Not yet", next: "dog_photos" },
    ],
  },
  dog_photos: {
    kind: "upload",
    prompt: "Photos of the injury help a lot — attach here if you have them, or skip.",
    field: "path_data.photos",
    next: TAIL_AFTER_PATH,
  },

  // --- Common tail: prior representation / conflict ---------------------------
  prior_rep: {
    kind: "choice",
    prompt: "Last question: have you already hired or signed with another attorney for this?",
    field: "incident.prior_representation",
    options: [
      { key: "signed", label: "Yes, I’ve signed with one", next: "t_prior_rep" },
      { key: "talked", label: "I’ve talked to one, not signed", next: "t_routed" },
      { key: "no", label: "No", next: "t_routed" },
    ],
  },

  // --- Terminals (routing.mjs assigns the bucket + next action) ---------------
  // force: deterministic rule terminals. t_routed: scored routing.
  t_no_consent: { kind: "terminal", force: { bucket: "human_handoff", reason: "consent_declined" } },
  t_emergency: { kind: "terminal", force: { bucket: "escalate", reason: "emergency" } },
  t_other: { kind: "terminal", force: { bucket: "human_handoff", reason: "other_matter" } },
  t_sol: { kind: "terminal", force: { bucket: "decline", reason: "sol_window" } },
  t_prior_rep: { kind: "terminal", force: { bucket: "decline", reason: "already_represented" } },
  t_routed: { kind: "terminal" },
};

export function getNode(id) {
  return NODES[id] ?? null;
}

// Resolve a node’s next id (string or function-of-record).
export function resolveNext(next, record) {
  return typeof next === "function" ? next(record) : next;
}

// --- Graph invariants ("no dead ends") — run in tests ------------------------
// Every referenced node exists; every non-terminal node can reach a next node;
// every terminal is one of the four buckets (forced) or scored.
export function validateTree() {
  const errors = [];
  const BUCKETS = new Set(["book", "escalate", "human_handoff", "decline"]);
  for (const [id, node] of Object.entries(NODES)) {
    if (node.kind === "terminal") {
      if (node.force && !BUCKETS.has(node.force.bucket)) {
        errors.push(`${id}: terminal has unknown bucket ${node.force.bucket}`);
      }
      continue;
    }
    if (!node.prompt) errors.push(`${id}: missing prompt`);
    const nexts = [];
    if (node.kind === "choice") {
      if (!node.options?.length) errors.push(`${id}: choice with no options`);
      for (const o of node.options ?? []) nexts.push(o.next);
    } else {
      nexts.push(node.next);
    }
    for (const n of nexts) {
      if (typeof n === "function") continue; // data-dependent; covered by walk tests
      if (!n || !NODES[n]) errors.push(`${id}: next -> missing node "${n}"`);
    }
  }
  if (!NODES[START_NODE]) errors.push(`start node "${START_NODE}" missing`);
  return errors;
}

// All visitor-facing prompt strings (for the banned-phrase compliance test).
export function allPromptTexts() {
  const texts = [];
  const sample = {
    contact: { first_name: "Alex" },
    incident: { date: "2026-01-01" },
    matter_type: "mva",
  };
  for (const node of Object.values(NODES)) {
    if (!node.prompt) continue;
    texts.push(typeof node.prompt === "function" ? node.prompt(sample) : node.prompt);
    for (const o of node.options ?? []) texts.push(o.label);
  }
  return texts;
}
