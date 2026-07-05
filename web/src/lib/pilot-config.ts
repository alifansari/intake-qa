// Founding-cohort scarcity — REAL, not a fake countdown. Update SPOTS_TAKEN by
// hand as pilots are signed. The PilotCohortBanner reads only from here.

export const SPOTS_TOTAL = 5;
export const SPOTS_TAKEN = 0;

export const SPOTS_OPEN = Math.max(0, SPOTS_TOTAL - SPOTS_TAKEN);

// One-line label used across marketing surfaces.
export const COHORT_LABEL = `Founding cohort — ${SPOTS_OPEN} of ${SPOTS_TOTAL} spots open`;
