// Smoke test for the durable layer: importing functions.mjs wires the Inngest
// client + all the proven pipeline modules it wraps. If any import or
// createFunction call is broken, this throws — catching the mis-registration
// class of failure without needing the Inngest dev server.

import { test } from "node:test";
import assert from "node:assert/strict";
import { functions } from "../inngest/functions.mjs";
import { inngest } from "../inngest/client.mjs";

test("the durable functions construct and export cleanly", () => {
  // scorePipeline (event), scheduledScoreSweep (cron fallback), retentionPurge,
  // dailyDigest.
  assert.equal(functions.length, 4);
  for (const f of functions) {
    assert.ok(f && typeof f === "object", "each is an InngestFunction object");
  }
});

test("the Inngest client constructed", () => {
  assert.ok(inngest, "client exists");
  assert.equal(typeof inngest.createFunction, "function");
});
