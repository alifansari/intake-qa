// Plain-English labels for the intake system’s internal keys. The consoles are
// read by a non-technical law-office founder, so every raw enum gets a label a
// person would actually say. Raw keys stay visible only as tooltips/suffixes.
// Pure maps + lookups — no I/O, safe for server and client components alike.

/** trigger_key / trigger_family → what the flag means in plain English. */
export const TRIGGER_LABELS: Record<string, string> = {
  // Trigger keys (src/lib/escalation/engine.mjs TRIGGERS)
  gov_claims_notice: "Government claim — deadline risk",
  sol_near: "Statute of limitations near",
  emergency: "Emergency screen",
  evidence_decay: "Evidence going stale",
  child_victim: "Minor involved — handled differently",
  catastrophic_treatment: "Serious injury — ER-level care",
  clear_liability_treated: "Clear fault plus treated injury",
  shopping_other_firms: "Already talking to other firms",
  distress_cues: "Caller sounds in distress",
  low_confidence_routing: "System unsure — a person should look",
  other_matter: "Outside practice areas",
  // Trigger families (also stored on escalations)
  time_decay: "Going cold — time decay",
  human_judgment: "Needs human judgment",
  case_value: "Signs of a valuable case",
  competitive_loss: "Risk of losing to another firm",
};

/** Look up a trigger key/family; unknown keys fall back to "spaces for underscores". */
export function plainTrigger(key: string): string {
  return TRIGGER_LABELS[key] ?? key.replace(/_/g, " ");
}

/** tier → what urgency it means. Badges keep the short form; put this in title. */
export const TIER_LABELS: Record<string, string> = {
  hot: "Urgent — act now",
  warm: "Today",
  flagged: "This week",
};

/** intake_leads.bucket → where the conversation ended up. */
export const BUCKET_LABELS: Record<string, string> = {
  book: "Booked",
  escalate: "Escalated",
  human_handoff: "Handed to a human",
  decline: "Declined by design",
  in_progress: "Still in chat",
};
