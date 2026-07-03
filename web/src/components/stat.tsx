import * as React from "react";
import { cn } from "@/lib/cn";
import { InfoTip } from "./ui/tooltip";

// The three-across hero numbers on the Executive Summary. Numbers are the hero;
// chrome is quiet. A serif figure, a plain-language line beneath.
export function HeroStat({
  label,
  value,
  sub,
  secondary,
  tone = "ink",
  method,
}: {
  label: string;
  value: string;
  sub?: string;
  secondary?: string;
  tone?: "ink" | "navy" | "red" | "green";
  method?: string;
}) {
  const color =
    tone === "red"
      ? "text-red"
      : tone === "green"
        ? "text-green"
        : tone === "navy"
          ? "text-navy"
          : "text-ink";
  return (
    <div className="flex flex-col justify-between p-5">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="eyebrow">{label}</span>
        {method ? <InfoTip>{method}</InfoTip> : null}
      </div>
      <div>
        <div className={cn("font-display text-5xl font-bold leading-none tnum", color)}>
          {value}
        </div>
        {secondary ? (
          <div className="mt-1.5 text-sm text-muted tnum">{secondary}</div>
        ) : null}
        {sub ? <div className="mt-2 text-sm leading-snug text-ink/80">{sub}</div> : null}
      </div>
    </div>
  );
}

// A compact stat used in dense grids.
export function MiniStat({
  label,
  value,
  sub,
  tone = "ink",
  method,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "ink" | "navy" | "red" | "green" | "amber";
  method?: string;
}) {
  const color =
    tone === "red"
      ? "text-red"
      : tone === "green"
        ? "text-green"
        : tone === "amber"
          ? "text-amber"
          : tone === "navy"
            ? "text-navy"
            : "text-ink";
  return (
    <div className="p-4">
      <div className="mb-1 flex items-center gap-1.5">
        <span className="eyebrow">{label}</span>
        {method ? <InfoTip>{method}</InfoTip> : null}
      </div>
      <div className={cn("font-display text-2xl font-semibold tnum", color)}>{value}</div>
      {sub ? <div className="mt-0.5 text-xs text-muted">{sub}</div> : null}
    </div>
  );
}
