"use client";

// Do-the-math calculator. Straightforward arithmetic (no hidden cleverness); the
// recovery-rate assumptions are shown, not buried. Conservative and optimistic
// side by side. Client-only, no network, no email gate.

import { useState } from "react";

const usd = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

// Conservative vs optimistic: what share of the signable cases that didn’t
// convert the workflow realistically wins back. Shown to the user as captions.
const CONSERVATIVE = 0.2;
const OPTIMISTIC = 0.4;
// BETA WINDOW: no dollar fee figure in public copy, so the calculator shows the
// value side only (fees lost / recoverable). The cost-side rows return with the
// published price when the beta ends.

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
  return (
    <div className="flex flex-col gap-2 rounded-card border border-hairline bg-canvas p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{tone}</p>
      <p className="text-xs text-faint">That’s {Math.round(rate * 100)}% of the signable cases that didn’t convert</p>
      <dl className="mt-1 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Cases won back / yr</dt><dd className="tnum font-semibold text-ink">{recoveredCases.toFixed(1)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Fees recovered / yr</dt><dd className="tnum font-semibold text-accent">{usd(recoveredFees)}</dd></div>
      </dl>
    </div>
  );
}

export function ROICalculator() {
  // Conservative defaults: PI contingency fees commonly run 33-40% of recovery
  // (ABA / California norms), so a $12,000 average signable-case fee is modest.
  const [missedPerWeek, setMissed] = useState(10);
  const [avgFee, setAvgFee] = useState(12000);
  const [signPct, setSignPct] = useState(5);
  // Cost per LEAD (not per signed case). Default = the one verified acquisition
  // number on the site ($284/lead, Pareto Legal). This is the money already
  // spent to make the phone ring — the marketing-waste frame.
  const [costPerLead, setCostPerLead] = useState(284);

  const leadsLost = missedPerWeek * 52;
  const adSpendWasted = leadsLost * costPerLead;
  const casesLost = leadsLost * (signPct / 100);
  const feesLost = casesLost * avgFee;

  return (
    <div className="rounded-card border border-hairline bg-surface p-6 shadow-card">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Missed / unreturned calls per week" value={missedPerWeek} onChange={setMissed} />
        <Field label="What you pay per lead" value={costPerLead} onChange={setCostPerLead} prefix="$" />
        <Field label="Avg. fee per signed case" value={avgFee} onChange={setAvgFee} prefix="$" />
        <Field label="Sign rate on those calls" value={signPct} onChange={setSignPct} suffix="%" />
      </div>

      <div className="mt-5 flex flex-col gap-2 rounded-card bg-canvas p-5">
        <p className="text-sm text-ink">
          You already paid to make those calls happen:{" "}
          <span className="tnum font-semibold text-alert">{usd(adSpendWasted)}</span> in acquisition
          spend a year, walking after the phone rang.
        </p>
        <p className="text-sm text-ink-muted">
          At that sign rate it’s{" "}
          <span className="tnum font-semibold text-ink">{casesLost.toFixed(0)}</span> signable cases,
          about <span className="tnum font-semibold text-alert">{usd(feesLost)}</span> in fees, on top.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Result tone="If you win back 1 in 5" rate={CONSERVATIVE} casesLost={casesLost} avgFee={avgFee} />
        <Result tone="If you win back 2 in 5" rate={OPTIMISTIC} casesLost={casesLost} avgFee={avgFee} />
      </div>
      <p className="mt-3 text-xs text-faint">
        Estimates on your own inputs. The 1-in-5 and 2-in-5 win-back rates are illustrative
        assumptions, not observed results. Not a guarantee.
        The desk is free during the beta; at launch the fee is a flat monthly subscription, never
        a share of any recovery.
      </p>
    </div>
  );
}
