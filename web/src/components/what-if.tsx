"use client";
import * as React from "react";
import { money, pct } from "@/lib/format";

// "What-if" widget: if the callback rate on flagged calls moved to Y%, recovered
// fees = $Z. Recomputes live in the browser from seed-derived parameters.
export function WhatIf({
  flaggedCount,
  currentCallbackRate,
  signRateOnCallback,
  avgFee,
}: {
  flaggedCount: number;
  currentCallbackRate: number;
  signRateOnCallback: number;
  avgFee: number;
}) {
  const [target, setTarget] = React.useState(
    Math.round(currentCallbackRate * 100),
  );

  const recovered = flaggedCount * (target / 100) * signRateOnCallback * avgFee;
  const currentRecovered =
    flaggedCount * currentCallbackRate * signRateOnCallback * avgFee;
  const delta = recovered - currentRecovered;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-ink">
          If callbacks on flagged calls reached{" "}
          <span className="tnum font-semibold text-navy">{target}%</span>
        </span>
        <span className="text-xs text-muted">
          today: {pct(currentCallbackRate)}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={target}
        onChange={(e) => setTarget(Number(e.target.value))}
        className="mt-3 w-full accent-[#1a4d8f]"
        aria-label="Target callback rate"
      />
      <div className="mt-4 flex items-end justify-between border-t border-line pt-3">
        <div>
          <div className="eyebrow">Projected recovered fees</div>
          <div className="font-display text-3xl font-bold tnum text-green">
            {money(recovered)}
          </div>
        </div>
        <div className="text-right">
          <div className="eyebrow">vs. today</div>
          <div
            className={`tnum text-lg font-semibold ${delta >= 0 ? "text-green" : "text-red"}`}
          >
            {delta >= 0 ? "+" : ""}
            {money(delta)}
          </div>
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">
        Holds today&rsquo;s post-callback sign rate ({pct(signRateOnCallback)}) and average
        fee at risk ({money(avgFee)}) constant across {flaggedCount} flagged calls.
      </p>
    </div>
  );
}
