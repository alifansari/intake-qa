"use client";
import * as React from "react";
import { ResponsiveContainer } from "recharts";
import { cn } from "@/lib/cn";

// Minimal shadcn-style chart wrapper: a responsive container with consistent
// sizing and a quiet, editorial frame. Charts stay flat — no 3D, few colors.
export function ChartContainer({
  className,
  height = 260,
  children,
}: {
  className?: string;
  height?: number;
  children: React.ReactElement;
}) {
  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

// Shared tooltip surface for Recharts custom tooltips.
export function ChartTooltip({
  title,
  rows,
}: {
  title?: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <div className="rounded-sm border border-line bg-paper px-3 py-2 text-xs shadow-md">
      {title ? <div className="mb-1 font-semibold text-ink">{title}</div> : null}
      {rows.map((r) => (
        <div key={r.label} className="flex justify-between gap-4 text-muted">
          <span>{r.label}</span>
          <span className="tnum font-medium text-ink">{r.value}</span>
        </div>
      ))}
    </div>
  );
}
