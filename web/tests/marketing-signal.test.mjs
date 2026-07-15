// Stage 2b: the Marketing Signal aggregator (source -> signable value).
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateMarketingSignal } from "../src/lib/desk/marketing-signal.mjs";

const call = (source, signable, cents) => ({
  lead_source: source,
  case_signability: signable ? "signable" : "not_signable",
  revenue_at_risk_cents: cents,
});

test("aggregates signable value per source and ranks by value", () => {
  const rows = [
    ...Array.from({ length: 6 }, () => call("TV", true, 900000)), // 6 signable @ $9k
    ...Array.from({ length: 6 }, () => call("PPC", false, null)), // 6 junk
    call("PPC", true, 300000), // 1 signable @ $3k
  ];
  const { groups, headline } = aggregateMarketingSignal(rows);
  const tv = groups.find((g) => g.source === "TV");
  const ppc = groups.find((g) => g.source === "PPC");
  assert.equal(tv.calls, 6);
  assert.equal(tv.signable, 6);
  assert.equal(tv.signableValueCents, 5400000);
  assert.equal(ppc.signable, 1);
  // TV ranks first (higher total signable value)
  assert.equal(groups[0].source, "TV");
  // Honest headline: TV's value-per-call multiple over PPC
  assert.ok(headline && headline.bestSource === "TV" && headline.worstSource === "PPC");
  assert.ok(headline.multiple > 1);
});

test("small-N sources are marked not-rankable (no false precision, §IV)", () => {
  const rows = [
    call("Billboard", true, 900000), // only 1 call
    ...Array.from({ length: 5 }, () => call("SEO", true, 500000)),
  ];
  const { groups, headline } = aggregateMarketingSignal(rows);
  const bb = groups.find((g) => g.source === "Billboard");
  const seo = groups.find((g) => g.source === "SEO");
  assert.equal(bb.rankable, false); // 1 call, not rankable
  assert.equal(seo.rankable, true); // 5 calls, rankable
  // Only one rankable source -> no comparative headline
  assert.equal(headline, null);
});

test("unattributed calls bucket separately and never rank or drive the headline", () => {
  const rows = [
    ...Array.from({ length: 6 }, () => call(null, true, 900000)), // no source
    ...Array.from({ length: 6 }, () => call("SEO", true, 100000)),
  ];
  const { groups } = aggregateMarketingSignal(rows);
  const un = groups.find((g) => g.source === "Unattributed");
  assert.ok(un);
  assert.equal(un.rankable, false); // never rankable even with volume
});
