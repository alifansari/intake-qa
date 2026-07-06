"use client";

// Do-the-math calculator. Straightforward arithmetic (no hidden cleverness); the
// recovery-rate assumptions are shown, not buried. Conservative and optimistic
// side by side. Client-only, no network, no email gate.

import { useState } from "react";
import { REF_MONTHLY_USD } from "@/lib/site-constants";

const usd = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

// Conservative vs optimistic: what share of the signable cases that didn't
// convert the workflow realistically wins back. Shown to the user as captions.
const CONSERVATIVE = 0.2;
const OPTIMISTIC = 0.4;
// Reference cost is a FLAT monthly subscription, never per recovered case.
const BASE_YR = REF_MONTHLY_USD * 12;

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
  const cost = BASE_YR; // flat annual subscription, independent of recoveries
  const net = recoveredFees - cost;
  const paysInDays = recoveredFees > 0 ? Math.max(1, Math.round((cost / recoveredFees) * 365)) : null;
  return (
    <div className="flex flex-col gap-2 rounded-card border border-hairline bg-canvas p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{tone}</p>
      <p className="text-xs text-faint">Wins back {Math.round(rate * 100)}% of the signable cases that didn&apos;t convert</p>
      <dl className="mt-1 flex flex-col gap-1.5 text-sm">
        <div className="flex justify-between"><dt className="text-ink-muted">Cases won back / yr</dt><dd className="tnum font-semibold text-ink">{recoveredCases.toFixed(1)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Fees recovered / yr</dt><dd className="tnum font-semibold text-accent">{usd(recoveredFees)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Net of software / yr</dt><dd className="tnum font-semibold text-ink">{usd(net)}</dd></div>
        <div className="flex justify-between"><dt className="text-ink-muted">Pays for itself in</dt><dd className="tnum font-semibold text-ink">{paysInDays ? `${paysInDays} days` : "n/a"}</dd></div>
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
          <span className="tnum font-semibold text-ink">{casesLost.toFixed(0)}</span> signable cases,
          about <span className="tnum font-semibold text-alert">{usd(feesLost)}</span> in fees, a year.
        </p>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Result tone="Conservative" rate={CONSERVATIVE} casesLost={casesLost} avgFee={avgFee} />
        <Result tone="Optimistic" rate={OPTIMISTIC} casesLost={casesLost} avgFee={avgFee} />
      </div>
      <p className="mt-3 text-xs text-faint">
        Estimates on your own inputs, at illustrative 20% / 40% recovery rates. Reference cost: a
        flat monthly subscription (illustrative ${REF_MONTHLY_USD.toLocaleString("en-US")}/mo), never
        a share of any recovery. Not a guarantee.
      </p>
    </div>
  );
}
