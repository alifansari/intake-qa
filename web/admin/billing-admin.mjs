// Operator billing actions — the small, testable logic behind /api/admin/billing.
// The route stays thin (auth + facade/orchestrator); validation lives here so it
// can be unit-tested without an HTTP handler (repo convention).

const ACTIONS = new Set([
  "close_period",
  "dispute_event",
  "resolve_event",
  "void_event",
  "void_invoice",
]);

// Validate an operator billing-action body. Returns { ok, value } or { ok:false,
// status, error }.
export function validateBillingAction(body) {
  if (!body || typeof body !== "object") {
    return { ok: false, status: 400, error: "body must be a JSON object" };
  }
  const { action } = body;
  if (typeof action !== "string" || !ACTIONS.has(action)) {
    return { ok: false, status: 422, error: "unknown action" };
  }
  if (action === "close_period") {
    if (body.firm_id == null) return { ok: false, status: 422, error: "firm_id required" };
    if (!/^\d{4}-\d{2}$/.test(String(body.period ?? ""))) {
      return { ok: false, status: 422, error: "period must be YYYY-MM" };
    }
  }
  if ((action === "dispute_event" || action === "resolve_event" || action === "void_event") && body.event_id == null) {
    return { ok: false, status: 422, error: "event_id required" };
  }
  if (action === "void_invoice" && body.invoice_id == null) {
    return { ok: false, status: 422, error: "invoice_id required" };
  }
  return { ok: true, value: body };
}
