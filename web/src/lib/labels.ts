import type { OutcomeCode } from "./schema";
import type { Verdict } from "./reconcile";

export const OUTCOME_LABEL: Record<OutcomeCode, string> = {
  signed_us_first_call: "Signed with us — first call",
  signed_us_after_callback: "Signed with us — after callback",
  signed_elsewhere: "Signed elsewhere",
  no_representation: "No representation",
  not_signable_disqualified: "Not signable / disqualified",
  still_open: "Still open",
  unreachable: "Unreachable",
  unknown: "Unknown",
};

// Single-key dispositions for the Superhuman-style triage queue.
export const OUTCOME_HOTKEYS: { key: string; code: OutcomeCode; label: string }[] = [
  { key: "1", code: "signed_us_first_call", label: "Signed (first call)" },
  { key: "2", code: "signed_us_after_callback", label: "Signed (callback)" },
  { key: "3", code: "signed_elsewhere", label: "Signed elsewhere" },
  { key: "4", code: "not_signable_disqualified", label: "Not signable" },
  { key: "5", code: "no_representation", label: "No representation" },
  { key: "6", code: "still_open", label: "Still open" },
  { key: "7", code: "unreachable", label: "Unreachable" },
];

export const VERDICT_LABEL: Record<Verdict, string> = {
  correct_flag: "Correct flag — they signed elsewhere",
  correct_flag_recovered: "Correct flag — recovered by callback",
  false_alarm: "False alarm — wasn't signable",
  missed_catch: "Missed catch — signed elsewhere, unflagged",
  correct_pass: "Correct pass — rightly not flagged",
  excluded: "No outcome yet",
};

export const VERDICT_TONE: Record<Verdict, "green" | "red" | "amber" | "neutral"> = {
  correct_flag: "green",
  correct_flag_recovered: "green",
  false_alarm: "amber",
  missed_catch: "red",
  correct_pass: "neutral",
  excluded: "neutral",
};
