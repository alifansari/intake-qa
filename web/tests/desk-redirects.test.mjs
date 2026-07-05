// Asserts every consolidated old tab route redirects to one of the four desk
// screens, with no data loss (routes only move; data stays in the DB).

import { test } from "node:test";
import assert from "node:assert/strict";
import { DESK_REDIRECTS } from "../src/lib/desk-redirects.mjs";

const NEW_SCREENS = new Set([
  "/desk/queue",
  "/desk/documents",
  "/desk/reconciliation",
  "/desk/settings",
]);

const EXPECTED = {
  "/dashboard": "/desk/queue",
  "/queue": "/desk/queue",
  "/triage": "/desk/queue",
  "/reps": "/desk/queue",
  "/calibration": "/desk/queue",
  "/statement": "/desk/documents",
  "/funnel": "/desk/reconciliation",
  "/getting-started": "/desk/settings",
};

test("every old tab redirects to a valid new desk screen", () => {
  for (const r of DESK_REDIRECTS) {
    assert.ok(NEW_SCREENS.has(r.destination), `${r.source} -> ${r.destination} must be a desk screen`);
    assert.equal(r.permanent, true, `${r.source} should be a permanent redirect`);
  }
});

test("each expected old route is mapped to the right screen", () => {
  const map = Object.fromEntries(DESK_REDIRECTS.map((r) => [r.source, r.destination]));
  for (const [oldRoute, newScreen] of Object.entries(EXPECTED)) {
    assert.equal(map[oldRoute], newScreen, `${oldRoute} should redirect to ${newScreen}`);
  }
});
