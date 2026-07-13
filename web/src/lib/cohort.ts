// Founding-cohort seat count — the SINGLE, manually-updated source of truth.
// This is the "Founding 5" Charter cap: 5 firms, hard cap, closes at the 5th
// firm or Aug 31, 2026 (see CHARTER_CLOSES in site-constants).
// Real scarcity only: update SEATS_TAKEN by hand as founding firms sign on.
// Never auto-decrement, never fake a number, never add a countdown timer.
// When SEATS_TAKEN === SEATS_TOTAL, every cohort CTA flips to a waitlist state.

export const SEATS_TOTAL = 5;
export const SEATS_TAKEN = 0; // <-- update by hand only

export const SEATS_REMAINING = Math.max(0, SEATS_TOTAL - SEATS_TAKEN);
export const COHORT_FULL = SEATS_REMAINING === 0;

// Forward-scarcity seat line shown wherever the count appears (no em dash, per
// site voice). Before any firm signs, "5 of 5 remaining" reads as "nobody bought,"
// so lead with the cap. Once firms sign, show the real remaining count.
export const SEAT_LINE = COHORT_FULL
  ? "The founding cohort is full. Join the list for the next opening."
  : SEATS_TAKEN === 0
    ? `We’re taking only ${SEATS_TOTAL} founding firms.`
    : `${SEATS_REMAINING} of ${SEATS_TOTAL} founding seats remaining.`;

// Canonical cohort CTA, waitlist-aware. Destination is the existing apply flow
// (/audit), which already collects the firm’s email, recordings, and monthly
// call volume — the free audit is step one of the beta.
export const COHORT_CTA_LABEL = COHORT_FULL ? "Join the waitlist" : "Join the beta";
export const COHORT_CTA_HREF = "/audit";
