// Operator feature-flag admin — the small, testable logic behind the toggle
// route + screen. The route stays thin (auth + facade); all validation lives
// here so it can be unit-tested without spinning up an HTTP handler (matching
// the repo convention of testing modules, not routes).

import { isKnownFeature } from "../features.mjs";

// Validate an operator feature-toggle request body. Returns either
//   { ok: true,  value: { firmId, feature, enabled } }
// or
//   { ok: false, status, error }
// so the route can map straight to an HTTP response.
export function validateFeatureToggle(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "body must be a JSON object" };
  }
  const { firm_id, feature, enabled } = body;
  if (
    firm_id == null ||
    (typeof firm_id !== "number" && typeof firm_id !== "string")
  ) {
    return { ok: false, status: 422, error: "firm_id is required" };
  }
  if (typeof feature !== "string" || !isKnownFeature(feature)) {
    return { ok: false, status: 422, error: "unknown feature" };
  }
  if (typeof enabled !== "boolean") {
    return { ok: false, status: 422, error: "enabled must be a boolean" };
  }
  return { ok: true, value: { firmId: firm_id, feature, enabled } };
}
