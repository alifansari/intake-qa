"use client";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
} from "recharts";
import { ChartContainer, ChartTooltip } from "./ui/chart";
import { BAND_COLOR, COLORS } from "@/lib/colors";
import type { BandSignRate, DecayBucket } from "@/lib/metrics";
import type { ScoreBand } from "@/lib/reconcile";

const axisProps = {
  tick: { fill: COLORS.muted, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: COLORS.line },
} as const;

// HERO CHART — sign rate by score band. Proves the score predicts reality.
export function SignRateByBandChart({ data }: { data: BandSignRate[] }) {
  const rows = data.map((d) => ({
    band: d.band,
    label: `${d.band}\n${d.label}`,
    pct: d.signRate == null ? 0 : Math.round(d.signRate * 100),
    signed: d.signed,
    resolved: d.resolved,
  }));
  return (
    <ChartContainer height={300}>
      <BarChart data={rows} margin={{ top: 24, right: 8, left: 4, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={COLORS.line} />
        <XAxis dataKey="band" {...axisProps} />
        <YAxis
          {...axisProps}
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          width={52}
        />
        <RTooltip
          cursor={{ fill: "rgba(0,0,0,0.03)" }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof rows)[number];
            return (
              <ChartTooltip
                title={`Score ${p.band} · ${data.find((d) => d.band === p.band)?.label}`}
                rows={[
                  { label: "Sign rate", value: `${p.pct}%` },
                  { label: "Signed", value: String(p.signed) },
                  { label: "Resolved calls", value: String(p.resolved) },
                ]}
              />
            );
          }}
        />
        <Bar dataKey="pct" radius={[2, 2, 0, 0]} maxBarSize={90}>
          {rows.map((r) => (
            <Cell key={r.band} fill={BAND_COLOR[r.band as ScoreBand]} />
          ))}
          <LabelList
            dataKey="pct"
            position="top"
            formatter={(v) => `${v}%`}
            className="tnum"
            fill={COLORS.ink}
            fontSize={13}
            fontWeight={600}
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}

// Time-to-callback decay: sign rate falls as callback gets colder.
export function CallbackDecayChart({ data }: { data: DecayBucket[] }) {
  const rows = data.map((d) => ({
    label: d.label,
    pct: d.signRate == null ? 0 : Math.round(d.signRate * 100),
    n: d.n,
  }));
  return (
    <ChartContainer height={240}>
      <LineChart data={rows} margin={{ top: 20, right: 12, left: 4, bottom: 8 }}>
        <CartesianGrid vertical={false} stroke={COLORS.line} />
        <XAxis dataKey="label" {...axisProps} />
        <YAxis
          {...axisProps}
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          width={52}
        />
        <RTooltip
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const p = payload[0].payload as (typeof rows)[number];
            return (
              <ChartTooltip
                title={`Callback ${p.label}`}
                rows={[
                  { label: "Recovery sign rate", value: `${p.pct}%` },
                  { label: "Flagged callbacks", value: String(p.n) },
                ]}
              />
            );
          }}
        />
        <Line
          type="monotone"
          dataKey="pct"
          stroke={COLORS.red}
          strokeWidth={2.5}
          dot={{ r: 4, fill: COLORS.red }}
          activeDot={{ r: 6 }}
        >
          <LabelList
            dataKey="pct"
            position="top"
            formatter={(v) => `${v}%`}
            fill={COLORS.ink}
            fontSize={12}
            fontWeight={600}
          />
        </Line>
      </LineChart>
    </ChartContainer>
  );
}

