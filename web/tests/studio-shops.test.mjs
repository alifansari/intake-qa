// Tests for "The Mirror" mystery-shop content + math (shops-content.mjs).
// Everything here is deterministic pure logic: headline counts, benchmark
// ranking (a comparative rank is a CLAIM — cohort minimum + seed labeling),
// disclosures, ref codes, and the grounded no-LLM narrative draft.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  SHOP_CHANNELS,
  SHOP_GRADES,
  MIN_BENCHMARK_COHORT,
  computeShopSummary,
  computeBenchmarkRank,
  ordinal,
  shopDisclosures,
  generateShopRefCode,
  pickWorstChannel,
  formatLatency,
  draftShopNarrative,
  isShopChannelKey,
  isShopGradeKey,
} from "../src/lib/studio/shops-content.mjs";

// --- vocabulary ---------------------------------------------------------------

test("channel and grade vocabularies are the canonical four and three", () => {
  assert.deepEqual(
    SHOP_CHANNELS.map((c) => c.key),
    ["after_hours_call", "weekend_call", "web_form", "website_chat"],
  );
  assert.deepEqual(
    SHOP_GRADES.map((g) => g.key),
    ["captured", "fumbled", "lost"],
  );
  assert.ok(isShopChannelKey("web_form"));
  assert.ok(!isShopChannelKey("carrier_pigeon"));
  assert.ok(isShopGradeKey("fumbled"));
  assert.ok(!isShopGradeKey("great"));
});

// --- headline counts -----------------------------------------------------------

test("computeShopSummary counts grades; ungraded channels excluded from counts", () => {
  const s = computeShopSummary([
    { channel: "after_hours_call", grade: "lost" },
    { channel: "weekend_call", grade: "fumbled" },
    { channel: "web_form", grade: "captured" },
    { channel: "website_chat", grade: null }, // shopped, not graded yet
  ]);
  assert.equal(s.shopped, 4);
  assert.equal(s.graded, 3);
  assert.equal(s.captured, 1);
  assert.equal(s.fumbled, 1);
  assert.equal(s.lost, 1);
  assert.equal(s.notCaptured, 2);
});

test("computeShopSummary on empty input is all zeros", () => {
  const s = computeShopSummary([]);
  assert.deepEqual(s, {
    shopped: 0,
    graded: 0,
    captured: 0,
    fumbled: 0,
    lost: 0,
    notCaptured: 0,
  });
});

// --- benchmark ranking ----------------------------------------------------------

const PEERS = [
  { channel: "after_hours_call", grade: "captured", response_latency_seconds: 35, ring_count: 2, is_seed: true },
  { channel: "after_hours_call", grade: "fumbled", response_latency_seconds: 70, ring_count: 6, is_seed: true },
  { channel: "after_hours_call", grade: "lost", response_latency_seconds: null, ring_count: 10, is_seed: true },
  { channel: "after_hours_call", grade: "fumbled", response_latency_seconds: 55, ring_count: 4, is_seed: true },
  { channel: "after_hours_call", grade: "lost", response_latency_seconds: null, ring_count: 8, is_seed: true },
];

test("rank orders by grade first: a captured firm beats every fumbled/lost peer", () => {
  const r = computeBenchmarkRank(
    { channel: "after_hours_call", grade: "captured", response_latency_seconds: 20, ring_count: 1 },
    PEERS,
  );
  assert.ok(r);
  assert.equal(r.rank, 1);
  assert.equal(r.cohortSize, 6); // 5 peers + the shopped firm
  assert.equal(r.isSeed, true);
  assert.match(r.label, /^1st of 6 firms shopped in this area for after-hours call response$/);
});

test("rank uses latency within a grade; lost-with-no-latency sorts worst", () => {
  // Fumbled at 60s: beaten by captured(35) and fumbled(55); ties nothing → rank 3.
  const mid = computeBenchmarkRank(
    { channel: "after_hours_call", grade: "fumbled", response_latency_seconds: 60, ring_count: 5 },
    PEERS,
  );
  assert.equal(mid.rank, 3);
  // Lost with no latency at all: beaten by captured + 2 fumbled; TIES the two
  // lost-null-latency peers on latency, then ring_count decides. ring_count 9
  // sits between the peers' 8 and 10 → one lost peer is strictly better → rank 5.
  const worst = computeBenchmarkRank(
    { channel: "after_hours_call", grade: "lost", response_latency_seconds: null, ring_count: 9 },
    PEERS,
  );
  assert.equal(worst.rank, 5);
});

test("exact ties share the better rank (competition ranking)", () => {
  const r = computeBenchmarkRank(
    // Identical to Peer B: fumbled, 70s, 6 rings → not strictly beaten by it.
    { channel: "after_hours_call", grade: "fumbled", response_latency_seconds: 70, ring_count: 6 },
    PEERS,
  );
  // Strictly better: captured(35) and fumbled(55) → rank 3, sharing with Peer B.
  assert.equal(r.rank, 3);
});

test("no rank below the minimum cohort (a comparative rank is a claim)", () => {
  const twoPeers = PEERS.slice(0, MIN_BENCHMARK_COHORT - 1);
  const r = computeBenchmarkRank(
    { channel: "after_hours_call", grade: "captured", response_latency_seconds: 5 },
    twoPeers,
  );
  assert.equal(r, null);
});

test("no rank for an ungraded channel, and peers of other channels don't count", () => {
  assert.equal(
    computeBenchmarkRank({ channel: "after_hours_call", grade: null }, PEERS),
    null,
  );
  assert.equal(
    computeBenchmarkRank({ channel: "web_form", grade: "captured" }, PEERS),
    null,
  );
});

test("isSeed is false only when NO contributing peer row is seed", () => {
  const real = PEERS.map((p) => ({ ...p, is_seed: false }));
  const r = computeBenchmarkRank(
    { channel: "after_hours_call", grade: "captured", response_latency_seconds: 20 },
    real,
  );
  assert.equal(r.isSeed, false);
  const mixed = [...real.slice(0, 4), { ...real[4], is_seed: true }];
  assert.equal(
    computeBenchmarkRank(
      { channel: "after_hours_call", grade: "captured", response_latency_seconds: 20 },
      mixed,
    ).isSeed,
    true,
  );
});

test("ordinal handles teens and edge suffixes", () => {
  assert.equal(ordinal(1), "1st");
  assert.equal(ordinal(2), "2nd");
  assert.equal(ordinal(3), "3rd");
  assert.equal(ordinal(4), "4th");
  assert.equal(ordinal(11), "11th");
  assert.equal(ordinal(12), "12th");
  assert.equal(ordinal(13), "13th");
  assert.equal(ordinal(21), "21st");
  assert.equal(ordinal(22), "22nd");
});

// --- disclosures ----------------------------------------------------------------

test("disclosures: scope is dynamic; benchmark disclosure labels seed data", () => {
  const d = shopDisclosures({ channelsShopped: 4, benchmarkShown: true, benchmarkIsSeed: true });
  assert.match(d.scope, /4 intake channels/);
  assert.match(d.benchmark, /ILLUSTRATIVE SEED DATA/);
  assert.match(d.benchmark, /not a factual ranking claim/);
  // Flat-fee + independence language present (compliance §I); prohibited
  // outcome-tied phrasings absent.
  assert.match(d.flatFee, /flat monthly fee/);
  for (const banned of ["contingent", "% of recovery", "per signed client", "success fee"]) {
    assert.ok(!d.flatFee.toLowerCase().includes(banned), `banned phrase: ${banned}`);
  }
});

test("disclosures: real-cohort benchmark text has no seed label; none when not shown", () => {
  const real = shopDisclosures({ channelsShopped: 1, benchmarkShown: true, benchmarkIsSeed: false });
  assert.match(real.scope, /1 intake channel /);
  assert.ok(!/SEED/i.test(real.benchmark));
  const none = shopDisclosures({ channelsShopped: 2 });
  assert.equal(none.benchmark, undefined);
});

// --- ref code -------------------------------------------------------------------

test("shop ref code shape: MS-YYYYMMDD-XXXX", () => {
  const code = generateShopRefCode(new Date("2026-07-09T12:00:00Z"));
  assert.match(code, /^MS-20260709-[0-9A-Z]{4}$/);
});

// --- worst channel + deterministic narrative -------------------------------------

test("pickWorstChannel prefers lost over fumbled; null when everything captured", () => {
  const worst = pickWorstChannel([
    { channel: "web_form", grade: "fumbled", response_latency_seconds: 100 },
    { channel: "after_hours_call", grade: "lost", response_latency_seconds: null },
    { channel: "weekend_call", grade: "captured" },
  ]);
  assert.equal(worst.channel, "after_hours_call");
  assert.equal(
    pickWorstChannel([{ channel: "web_form", grade: "captured" }]),
    null,
  );
});

test("draftShopNarrative is grounded: names the channel, echoes field notes, invents no numbers", () => {
  const draft = draftShopNarrative([
    {
      channel: "after_hours_call",
      grade: "lost",
      ring_count: 8,
      response_latency_seconds: null,
      answered_by: "none",
      notes: "Rang eight times, voicemail box was full.",
    },
    { channel: "web_form", grade: "captured" },
  ]);
  assert.ok(draft);
  assert.match(draft.narrative_failure, /after-hours call/i);
  assert.match(draft.narrative_failure, /voicemail box was full/);
  assert.match(draft.narrative_fix, /after-hours/i);
  // No invented dollar figures in either field (leakage lives elsewhere).
  assert.ok(!/\$\d/.test(draft.narrative_failure + draft.narrative_fix));
  // Nothing to write about when all captured — never invent a failure.
  assert.equal(draftShopNarrative([{ channel: "web_form", grade: "captured" }]), null);
});

test("formatLatency renders s/m/h/d bands", () => {
  assert.equal(formatLatency(45), "45s");
  assert.equal(formatLatency(300), "5m");
  assert.equal(formatLatency(5400), "1.5h");
  assert.equal(formatLatency(86400), "1d");
});
