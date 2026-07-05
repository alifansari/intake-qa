// Founding-cohort scarcity — REAL, not a fake countdown. Update SPOTS_TAKEN by
// hand as pilots are signed. The PilotCohortBanner reads only from here.

export const SPOTS_TOTAL = 5;
export const SPOTS_TAKEN = 0;

export const SPOTS_OPEN = Math.max(0, SPOTS_TOTAL - SPOTS_TAKEN);

// Single source of truth for cohort scarcity copy (Change 13). Every "seats left"
// count on the site reads from this — update SPOTS_TAKEN as pilots are signed.
export const COHORT_SEATS_REMAINING = SPOTS_OPEN;

// One-line label used across marketing surfaces.
export const COHORT_LABEL = `Founding cohort — ${SPOTS_OPEN} of ${SPOTS_TOTAL} spots open`;
