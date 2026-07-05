"use client";

// Do-the-math calculator. Straightforward arithmetic (no hidden cleverness); the
// recovery-rate assumptions are shown, not buried. Conservative and optimistic
// side by side. Client-only, no network, no email gate.

import { useState } from "react";

const usd = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

// Conservative vs optimistic: what share of leaked signable cases the workflow
// realistically wins back. Shown to the user as captions.
const CONSERVATIVE = 0.2;
const OPTIMISTIC = 0.4;
// Core plan reference cost.
const BASE_YR = 1500 * 12;
const PER_CASE = 500;

function Field({
  label,
  value,
  onChange,
  prefix,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-ink">{label}</span>
      <span className="flex items-center rounded-base border border-hairline bg-surface focus-within:border-accent">
        {prefix ? <span className="pl-3 text-sm text-faint">{prefix}</span> : null}
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
          className="tnum w-full bg-transparent px-3 py-2 text-sm outline-none"
        />
        {suffix ? <span className="pr-3 text-sm text-faint">{suffix}</span> : null}
      </span>
    </label>
  );
}

function Result({ tone, rate, casesLost, avgFee }: { tone: string; rate: number; casesLost: number; avgFee: number }) {
  const recoveredCases = casesLost * rate;
  const recoveredFees = recoveredCases * avgFee;
  const cost = BASE_YR + PER_CASE * recoveredCases;
  const net = recoveredFees - cost;
  const paysInDays = recoveredFees > 0 ? Math.max(1, Math.round((cost / recoveredFees) * 365)) : null;
  return (
    <div className="flex flex-col gap-2 rounded-card border border-hairline bg-canvas p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{tone}</p>
      <p className="text-xs text-faint">Recovers {Math.round(rate * 100)}% of leaked signable cases</p>
      <dl className="mt-1 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Cases won back / yr</dt><dd className="tnum font-semibold text-ink">{recoveredCases.toFixed(1)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Fees recovered / yr</dt><dd className="tnum font-semibold text-accent">{usd(recoveredFees)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Net of software / yr</dt><dd className="tnum font-semibold text-ink">{usd(net)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Pays for itself in</dt><dd className="tnum font-semibold text-ink">{paysInDays ? `${paysInDays} days` : "—"}</dd></div>
      </dl>
    </div>
  );
}

export function ROICalculator() {
  const [missedPerWeek, setMissed] = useState(10);
  const [avgFee, setAvgFee] = useState(25000);
  const [signPct, setSignPct] = useState(30);

  const casesLost = missedPerWeek * 52 * (signPct / 100);
  const feesLost = casesLost * avgFee;

  return (
    <div className="rounded-card border border-hairline bg-surface p-6 shadow-card">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Missed / unreturned calls per week" value={missedPerWeek} onChange={setMissed} />
        <Field label="Avg. fee per signed case" value={avgFee} onChange={setAvgFee} prefix="$" />
        <Field label="Sign rate on those calls" value={signPct} onChange={setSignPct} suffix="%" />
      </div>

      <div className="mt-5 flex flex-col gap-1 rounded-card bg-canvas p-5">
        <p className="text-sm text-ink-muted">
          At that rate you lose{" "}
          <span className="tnum font-semibold text-ink">{casesLost.toFixed(0)}</span> signable cases —
          about <span className="tnum font-semibold text-alert">{usd(feesLost)}</span> in fees — a year.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Result tone="Conservative" rate={CONSERVATIVE} casesLost={casesLost} avgFee={avgFee} />
        <Result tone="Optimistic" rate={OPTIMISTIC} casesLost={casesLost} avgFee={avgFee} />
      </div>
      <p className="mt-3 text-xs text-faint">
        Estimates on your own inputs, at illustrative 20% / 40% recovery rates. Reference cost: Core
        plan ($1,500/mo + $500 per recovered case). Not a guarantee.
      </p>
    </div>
  );
}
