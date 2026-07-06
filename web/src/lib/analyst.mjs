// Analyst-of-Record identity — the SINGLE source of truth for the human whose
// name, title, and contact appear on every client-facing document (Intake Leak
// Report, monthly statement, readout) and in the sign-off / attestation blocks.
//
// This is a .mjs (not the TS site-constants) on purpose: it is imported by BOTH
// the .mjs copy/compose layer AND the .tsx react-pdf components, and .mjs is the
// only form both can share. Change the person here and it updates everywhere.
export const ANALYST = {
  name: "Ali F. Ansari",
  title: "Founder & Analyst of Record",
  org: "Intake QA — the Independent Recovery Desk",
  email: "ali@plaintiffops.com",
  phone: "(949) 636-6918",
};

// The direct-contact line used in sign-offs ("Direct line: …").
export const ANALYST_CONTACT = `${ANALYST.phone} · ${ANALYST.email}`;
