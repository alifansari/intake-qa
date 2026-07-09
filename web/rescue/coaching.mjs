// Staff coaching — staff-helping, not policing (module 7, Phase 2 feature,
// Phase 1 interface + visibility rules).
//
// Design rules encoded now so Phase 2 cannot drift into a surveillance tool:
//   * PRIVATE by default: an individual scorecard is visible to the staffer +
//     manager only; raw call-by-call scores are NEVER broadcast office-wide.
//   * Wins first: every coaching artifact leads with saves/praise before misses.
//   * One specific note tied to a lost dollar — no generic coaching libraries.
//   * Team goals over leaderboards; improvement streaks tied to real KPIs
//     (appointment-set rate), not vanity metrics.

export const COACHING_VISIBILITY = Object.freeze({
  scorecard: ["staffer", "manager"], // never 'office'
  teamGoals: ["staffer", "manager", "office"],
});

// A coaching note exists ONLY in relation to a specific call + specific dollar
// figure. Pure composition from a flag + handling score.
// TODO(phase2): self-review flow (staff self-score before manager sees the
// engine's score) + improvement streaks over handling_scores history.
export function buildCoachingNote({ flag, handling, estValueCents, staffer = null }) {
  const wins = [];
  const miss = [];

  if (handling?.screening_completeness != null && handling.screening_completeness >= 80) {
    wins.push("Screening was thorough — the case facts were all captured.");
  }
  if (handling?.objection_handling != null && handling.objection_handling >= 80) {
    wins.push("Caller hesitations were addressed head-on.");
  }
  if (!truthy(handling?.next_step_secured)) {
    const dollars = Math.round((estValueCents ?? 0) / 100).toLocaleString("en-US");
    miss.push(
      `The call ended without a locked-in next step, and the case (est. $${dollars}) went cold. One sentence fixes this: "Let's get you on the attorney's calendar before we hang up — morning or afternoon?"`
    );
  }

  return {
    staffer,
    visibility: COACHING_VISIBILITY.scorecard,
    winsFirst: wins,
    theOneThing: miss[0] ?? null, // exactly one note tied to the lost dollar
    callRef: flag?.call_id ?? null,
  };
}

function truthy(v) {
  return v === true || v === 1;
}
