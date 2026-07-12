// scoring-v2/lib/statutes.mjs — date-indexed California statutory constants.
// Pure data + lookups, no I/O. Every value here is VERIFIED against primary
// sources (see CHANGELOG-v2.2.md corrections ledger) and is CURRENT for 2026.
//
// COMPLIANCE RAIL: nothing in this module is ever emitted as a dollar figure
// at intake. These constants drive TIER reasoning only (e.g. "min-limits +
// heavy treatment → underwater tier"); the verdict layer surfaces tiers and
// FLAGS, never the amounts or any computed date. The amounts exist so the
// code can reason about coverage/lien math internally, not to be shown.
//
// Every constant is keyed to a controlling DATE where the law changed, so a
// case whose facts predate a change is scored under the law that governed it
// (a pre-2025 collision still legally carries 15/30 minimums, etc.).

// Parse an ISO-ish date or a bare year into a comparable {year, ms}. Returns
// null when nothing usable is given (caller then falls back to a default).
export function parseYear(dateOrYear) {
  if (dateOrYear == null) return null;
  if (typeof dateOrYear === "number" && Number.isFinite(dateOrYear))
    return { year: dateOrYear, ms: Date.UTC(dateOrYear, 0, 1) };
  const s = String(dateOrYear).trim();
  const ymd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (ymd) return { year: +ymd[1], ms: Date.UTC(+ymd[1], +ymd[2] - 1, +ymd[3]) };
  const y = s.match(/^(\d{4})$/);
  if (y) return { year: +y[1], ms: Date.UTC(+y[1], 0, 1) };
  const parsed = Date.parse(s);
  if (!Number.isNaN(parsed)) {
    const d = new Date(parsed);
    return { year: d.getUTCFullYear(), ms: parsed };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Frozen constant block (auditable; the corrections ledger cites each).
export const STATUTES = Object.freeze({
  auto_min_limits: Object.freeze({
    // SB 1107 (Ch. 717, Stats. 2022); Veh. Code 16056. Keyed to POLICY
    // issue/renewal date (CDI Bulletin 2023-1), fallback loss date.
    pre_2025: Object.freeze({ per_person: 15000, per_accident: 30000, pd: 5000 }),
    from_2025: Object.freeze({ per_person: 30000, per_accident: 60000, pd: 15000 }),
    from_2035: Object.freeze({ per_person: 50000, per_accident: 100000, pd: 25000 }),
  }),
  // AB 35 (Ch. 17, Stats. 2022) amending Civ. Code 3333.2. Year-of-RESOLUTION.
  micra: Object.freeze({
    injury_base_2023: 350000,
    injury_step: 40000,
    death_base_2023: 500000,
    death_step: 50000,
    plateau_year: 2033, // injury $750k / death $1.0M; then +2%/yr
    injury_plateau: 750000,
    death_plateau: 1000000,
    post_plateau_growth: 0.02,
    pre_2023_flat: 250000, // filings before 1/1/2023 stay at the old flat cap
  }),
  limited_civil_ceiling: Object.freeze({
    amount: 35000, // SB 71 (Ch. 861, Stats. 2023); eff. 1/1/2024. NOT AB 2347.
    bill: "SB 71 (Stats. 2023, ch. 861)",
    effective: "2024-01-01",
  }),
  rideshare: Object.freeze({
    // AB 2293 three periods; SB 371 (2025) amended PUC 5433 eff. 1/1/2026.
    liability_active: 1000000, // 5433(b)(1) — only when the TNC DRIVER is at fault
    umuim_active_pre_2026: 1000000,
    umuim_active_from_2026_per_person: 60000, // 5433(b)(2)
    umuim_active_from_2026_per_accident: 300000,
    period1_contingent: Object.freeze({ per_person: 50000, per_accident: 100000, pd: 30000 }),
    period1_excess: 200000, // 5433(c)(2)
    cut_effective: "2026-01-01",
  }),
  fmcsa: Object.freeze({
    // 49 CFR 387.9 / 387.33 — federal carrier minimums.
    property_general: 750000,
    property_oil: 1000000,
    property_hazmat: 5000000,
    passenger_small: 1500000, // <=15 seats
    passenger_large: 5000000, // >=16 seats
  }),
  // SB 447 sunset: survival NONeconomic (predeath p&s) allowed only for
  // actions with a §36 preference before 1/1/2022, OR filed >= 1/1/2022 and
  // < 1/1/2026. Filings >= 1/1/2026 revert to economic-only. Elder/dependent-
  // adult abuse (WIC 15657(b)) is exempt and survives the sunset.
  survival_noneconomic: Object.freeze({
    window_open: "2022-01-01",
    window_close: "2026-01-01",
  }),
});

// Practitioner sign/decline threshold SEEDS — labeled published-heuristic,
// NOT this firm's data; they decay under firm outcomes. Amounts are internal
// reasoning bounds only, never emitted at intake (tiers/flags only).
export const PRACTITIONER_SEEDS = Object.freeze({
  mist_pd_low_ceiling: 1500, // vehicle PD proxy for a MIST/low-impact headwind (some carriers 1000)
  mist_pd_clean_sign: 12000, // significant PD = clean-sign input
  min_specials_floor: 3000, // routine-decline zone below ~2-3k specials (NEVER a terminal decline)
  cost_to_value_ratio: 0.1, // expect ~10% of case value in advanced costs
  litigated_spend_floor: 50000, // typical spend once a matter is litigated
  prior_attorney_walk_count: 2, // 2 prior attorneys = strong negative; 1 = scrutiny
  healthy_sign_rate_low: 0.25, // calibration target for the decision table's sign rate
  healthy_sign_rate_high: 0.35,
  treatment_gap_days: 30, // formal treatment-gap threshold (a FLAG, never a decline)
  is_firm_data: false,
  provenance: "published-heuristic (CAALA/Advocate/Plaintiff Magazine + intake consultants); decays under firm data",
});

// SOL descriptors — FLAGS ONLY. This table never computes a date; it describes
// the shape of the clock so procedural-urgency reasoning can flag it.
export const solTable = Object.freeze({
  mva_standard: { years: 2, basis: "CCP 335.1 (2yr PI); minors tolled to 18 (CCP 352)" },
  mva_commercial: { years: 2, basis: "CCP 335.1 (2yr PI)" },
  motorcycle: { years: 2, basis: "CCP 335.1 (2yr PI)" },
  pedestrian_bicycle: { years: 2, basis: "CCP 335.1 (2yr PI)" },
  rideshare: { years: 2, basis: "CCP 335.1 (2yr PI)" },
  premises: { years: 2, basis: "CCP 335.1 (2yr PI)" },
  dog_bite: { years: 2, basis: "CCP 335.1 (2yr PI)" },
  product: { years: 2, basis: "CCP 335.1 (2yr PI/product)" },
  med_mal: {
    years: 1,
    outer_years: 3,
    basis: "CCP 340.5 (1yr discovery / 3yr outer; minor <6 to 8th birthday); CCP 364 90-day notice of intent",
  },
  wrongful_death: { years: 2, basis: "CCP 335.1 (2yr WD)" },
  government_entity: {
    months: 6,
    basis: "Gov. Code 911.2 (6-month claim presentation); 945.6 (6-month suit after rejection; 2yr if no compliant rejection); minor mandatory late-claim relief to ~1yr (911.4/946.6)",
  },
  workers_comp: { years: 2, basis: "third-party civil claim CCP 335.1; comp claim separate (LC 5405)" },
  other_pi: { years: 2, basis: "CCP 335.1 (2yr PI, default)" },
});

// ---------------------------------------------------------------------------
// Lookups. Each returns { ...values, basis } — basis is a human-readable
// citation the verdict layer may show as REASONING (never a dollar at intake).

// Auto minimum liability limits controlling for a policy/loss date.
export function autoMinLimits({ policyOrLossDateISO } = {}) {
  const p = parseYear(policyOrLossDateISO);
  const a = STATUTES.auto_min_limits;
  if (!p) {
    return { ...a.from_2025, basis: "SB 1107: 30/60/15 (current default; date not stated — prefer stated limits)", era: "from_2025", date_known: false };
  }
  if (p.ms >= Date.UTC(2035, 0, 1))
    return { ...a.from_2035, basis: "SB 1107: 50/100/25 (policy on/after 1/1/2035)", era: "from_2035", date_known: true };
  if (p.ms >= Date.UTC(2025, 0, 1))
    return { ...a.from_2025, basis: "SB 1107: 30/60/15 (policy issued/renewed on/after 1/1/2025)", era: "from_2025", date_known: true };
  return { ...a.pre_2025, basis: "pre-SB 1107: 15/30/5 (policy issued/renewed before 1/1/2025)", era: "pre_2025", date_known: true };
}

// MICRA non-economic cap for the projected YEAR OF RESOLUTION. A 2026 intake
// resolves ~2027-2029, so callers should pass a projected resolution year,
// not the intake year (under-tiering otherwise is systematic).
export function micraNoneconomicCap({ resolutionYear, kind = "injury" } = {}) {
  const m = STATUTES.micra;
  const y = Number.isInteger(resolutionYear) ? resolutionYear : 2026;
  if (y < 2023) return { amount: m.pre_2023_flat, basis: "MICRA pre-AB 35 flat $250k (filing before 1/1/2023)", year: y, kind };
  const base = kind === "death" ? m.death_base_2023 : m.injury_base_2023;
  const step = kind === "death" ? m.death_step : m.injury_step;
  const plateau = kind === "death" ? m.death_plateau : m.injury_plateau;
  let amount;
  if (y <= m.plateau_year) {
    amount = base + step * (y - 2023);
  } else {
    amount = Math.round(plateau * Math.pow(1 + m.post_plateau_growth, y - m.plateau_year));
  }
  return {
    amount,
    basis: `AB 35 MICRA ${kind} non-economic cap for resolution year ${y} (economic damages UNcapped; up to 3 category caps may stack)`,
    year: y,
    kind,
  };
}

// Rideshare coverage available given period + at-fault party + crash date.
// Value tier must branch on WHO is at fault, not merely "was it a rideshare".
export function rideshareCoverage({ period = "unknown", atFaultParty = "unknown", crashDateISO } = {}) {
  const r = STATUTES.rideshare;
  const post2026 = (() => {
    const p = parseYear(crashDateISO);
    return p ? p.ms >= Date.UTC(2026, 0, 1) : true; // default to current law
  })();
  if (period === "unknown" || atFaultParty === "unknown") {
    return { layer: "unknown", basis: "rideshare period / at-fault party not established — abstain and DEVELOP (which period? who was at fault?)", branch: "abstain" };
  }
  if (period === "off")
    return { layer: "personal_auto", basis: "app off — personal auto only (no TNC coverage)", branch: "personal" };
  if (period === "on_waiting")
    return {
      layer: "period1_contingent",
      per_person: r.period1_contingent.per_person,
      per_accident: r.period1_contingent.per_accident,
      excess: r.period1_excess,
      basis: "app on, no match (Period 1) — contingent $50k/$100k/$30k + $200k excess (PUC 5433(c)); treat like min-limits",
      branch: "period1",
    };
  // enroute_or_passenger (Periods 2-3)
  if (atFaultParty === "rideshare_driver")
    return { layer: "tnc_liability", per_accident: r.liability_active, basis: "TNC driver at fault, active ride — $1M third-party liability (PUC 5433(b)(1))", branch: "liability_1m" };
  // injured passenger, uninsured/underinsured third party at fault
  if (post2026)
    return {
      layer: "tnc_umuim_capped",
      per_person: r.umuim_active_from_2026_per_person,
      per_accident: r.umuim_active_from_2026_per_accident,
      basis: "passenger, uninsured third party at fault, crash on/after 1/1/2026 — UM/UIM capped at $60k/$300k (SB 371, PUC 5433(b)(2)); can compress value a full tier and trip G1",
      branch: "umuim_capped",
    };
  return { layer: "tnc_umuim_1m", per_accident: r.umuim_active_pre_2026, basis: "passenger, third party at fault, crash before 1/1/2026 — $1M UM/UIM still applies", branch: "umuim_1m" };
}

// May a survival action recover NON-economic (predeath p&s) damages?
export function survivalNoneconomicAllowed({ filingDateISO, elderAbuse = false } = {}) {
  if (elderAbuse)
    return { allowed: true, basis: "WIC 15657(b) elder/dependent-adult abuse — predeath p&s survives the SB 447 sunset (capped at current Civ. 3333.2(b))" };
  const p = parseYear(filingDateISO);
  const s = STATUTES.survival_noneconomic;
  // Default (unknown filing date) to CURRENT law: sunset has passed.
  if (!p) return { allowed: false, basis: "filing date unknown; as of 2026 the SB 447 window has closed — survival damages are economic-only for new filings (verify filing date)" };
  const open = Date.parse(s.window_open);
  const close = Date.parse(s.window_close);
  if (p.ms >= open && p.ms < close)
    return { allowed: true, basis: "SB 447 window: action filed on/after 1/1/2022 and before 1/1/2026 — predeath p&s recoverable" };
  return { allowed: false, basis: "SB 447 sunset: action filed on/after 1/1/2026 — survival damages economic-only (plus punitives); elder-abuse excepted" };
}

export function limitedCivilCeiling() {
  const c = STATUTES.limited_civil_ceiling;
  return { amount: c.amount, bill: c.bill, effective: c.effective };
}

// FMCSA coverage floor for a commercial-truck case (cargo type drives it).
export function fmcsaFloor({ cargoType = "general", passenger = false, seatsOver15 = false } = {}) {
  const f = STATUTES.fmcsa;
  if (passenger) return { amount: seatsOver15 ? f.passenger_large : f.passenger_small, basis: "49 CFR 387.33 passenger carrier minimum" };
  if (cargoType === "hazmat") return { amount: f.property_hazmat, basis: "49 CFR 387.9 hazmat minimum ($5M)" };
  if (cargoType === "oil") return { amount: f.property_oil, basis: "49 CFR 387.9 oil minimum ($1M)" };
  return { amount: f.property_general, basis: "49 CFR 387.9 general-freight minimum ($750k)" };
}
