// Peer benchmarking — anonymized cross-firm aggregates.
//
// Two hard safeguards:
//   1. CONSENT: only firms with benchmark_data_sharing = ON are included.
//   2. k-ANONYMITY: no snapshot is produced or served unless >= MIN_CONSENTING
//      firms contribute — below that, callers show "unlocks as the network grows".
// Snapshots store only distribution stats + a contributor count; no firm identity
// ever leaves this module.
//
// Pure stats (quantile, aggregateBenchmark) have no I/O and are unit-tested.
// computeSnapshot (CLI-triggered) + getBenchmark are the persistence wrappers.

import {
  countConsentingFirms,
  getConsentingFirmIds,
  getBenchmarkRows,
  insertBenchmarkSnapshot,
  getLatestBenchmarkSnapshot,
} from "../ingest/store.mjs";

export const MIN_CONSENTING_FIRMS = 5;

function band(score) {
  if (score == null) return null;
  if (score >= 80) return "strong";
  if (score >= 60) return "moderate";
  return "weak";
}

// Linear-interpolation quantile of a numeric array (p in 0..1). Pure.
export function quantile(values, p) {
  const xs = values.filter((v) => typeof v === "number").sort((a, b) => a - b);
  if (xs.length === 0) return null;
  if (xs.length === 1) return xs[0];
  const idx = p * (xs.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return xs[lo];
  return xs[lo] + (xs[hi] - xs[lo]) * (idx - lo);
}

// Reduce per-flag rows ({score, leaked, signed}) to distribution stats. Pure.
export function aggregateBenchmark(rows = []) {
  const scores = rows.map((r) => Number(r.score)).filter((n) => Number.isFinite(n));
  const leaked = rows.filter((r) => Number(r.leaked) === 1).length;

  // Sign rate within each handling-score band.
  const byBand = { weak: { n: 0, signed: 0 }, moderate: { n: 0, signed: 0 }, strong: { n: 0, signed: 0 } };
  for (const r of rows) {
    const b = band(Number(r.score));
    if (!b) continue;
    byBand[b].n += 1;
    if (Number(r.signed) === 1) byBand[b].signed += 1;
  }
  const signRateByBand = {};
  for (const b of Object.keys(byBand)) {
    signRateByBand[b] = byBand[b].n ? byBand[b].signed / byBand[b].n : null;
  }

  return {
    sample_size: rows.length,
    median_handling_score: quantile(scores, 0.5),
    q1_handling_score: quantile(scores, 0.25),
    q3_handling_score: quantile(scores, 0.75),
    leak_rate: rows.length ? leaked / rows.length : null,
    sign_rate_by_band: signRateByBand,
  };
}

// Where does `score` sit vs the snapshot's quartiles? Coarse percentile estimate
// (we store quartiles, not the full distribution). Returns 0..100 or null. Pure.
export function estimatePercentile(score, snapshot) {
  if (score == null || !snapshot) return null;
  const { q1_handling_score: q1, median_handling_score: m, q3_handling_score: q3 } = snapshot;
  if (q1 == null || m == null || q3 == null) return null;
  if (score <= q1) return 25;
  if (score <= m) return 50;
  if (score <= q3) return 75;
  return 90;
}

// Compute + persist a snapshot IF the k-anonymity gate passes. CLI-triggered.
// Returns { ok, snapshotId, ...stats } or { ok:false, reason, contributors }.
export async function computeSnapshot({ db, minFirms = MIN_CONSENTING_FIRMS } = {}) {
  const contributors = await countConsentingFirms(db);
  if (contributors < minFirms) {
    return { ok: false, reason: "below_k", contributors, minFirms };
  }
  const firmIds = await getConsentingFirmIds(db);
  const rows = await getBenchmarkRows(db, firmIds);
  const stats = aggregateBenchmark(rows);
  const snapshot = { contributor_count: contributors, ...stats };
  const snapshotId = await insertBenchmarkSnapshot(db, snapshot);
  return { ok: true, snapshotId, ...snapshot };
}

// Serve the latest snapshot for display, honoring k-anonymity. Returns
// { available:false } when there's no snapshot or it's below the threshold.
/**
 * @param {{ db?: unknown, minFirms?: number }} [opts]
 */
export async function getBenchmark({ db, minFirms = MIN_CONSENTING_FIRMS } = {}) {
  const snap = await getLatestBenchmarkSnapshot(db);
  if (!snap || snap.contributor_count < minFirms) {
    return { available: false, reason: "below_k" };
  }
  let signRateByBand = snap.sign_rate_by_band;
  if (typeof signRateByBand === "string") {
    try {
      signRateByBand = JSON.parse(signRateByBand);
    } catch {
      signRateByBand = null;
    }
  }
  return { available: true, snapshot: { ...snap, sign_rate_by_band: signRateByBand } };
}
