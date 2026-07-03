import * as React from "react";
import type { ScoredCall } from "@/lib/schema";
import { money, titleCase } from "@/lib/format";
import { Badge } from "./ui/badge";

// Inline evidence view — the same content and visual language as the printed
// report from lib/report.js (banners, category bars, coaching, evidence quotes
// with timestamps, summary), re-expressed in React so it renders responsively
// inside the drawer. Reads the loose ScoredCall defensively.

const CATEGORY_LABELS: Record<string, string> = {
  qualification: "Qualification Completeness",
  conversion: "Conversion Behaviors",
  connection: "Connection & Empathy",
  risk_compliance: "Risk & Compliance",
  process: "Process & Logistics",
};

const BAND_COLOR: Record<string, string> = {
  exemplary: "#1a7f37",
  strong: "#1a4d8f",
  developing: "#b26a00",
  needs_coaching: "#c05621",
  intervention: "#b00020",
};

type Coaching = {
  top_strength?: { behavior?: string; quote?: string; timestamp?: string };
  one_thing?: {
    behavior?: string;
    model_utterance?: string;
    why_it_matters?: string;
    missed_moment_timestamp?: string;
  };
};

function categoryRows(call: ScoredCall) {
  const cats = (call.scores.categories ?? {}) as Record<string, { score?: number }>;
  return Object.keys(CATEGORY_LABELS)
    .filter((k) => cats[k] && typeof cats[k].score === "number")
    .map((k) => ({ key: k, label: CATEGORY_LABELS[k], score: cats[k].score as number }));
}

export function ReportView({ call }: { call: ScoredCall }) {
  const scores = call.scores;
  const bandColor = BAND_COLOR[scores.band ?? ""] ?? "#1a1a1a";
  const alerts = call.alerts ?? {};
  const rar = alerts.revenue_at_risk;
  const coaching = (call.coaching ?? {}) as Coaching;
  const cats = categoryRows(call);

  return (
    <div className="px-5 py-4">
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-ink pb-3">
        <div>
          <div className="font-display text-lg font-semibold">{call.call_id}</div>
          <div className="mt-1 text-xs text-muted">
            {titleCase(call.call_type)} · {call.language ?? "en"}
            {call.duration_assessed_sec ? ` · ${call.duration_assessed_sec}s` : ""}
          </div>
        </div>
        <div className="text-center">
          <div className="font-display text-4xl font-bold leading-none tnum" style={{ color: bandColor }}>
            {scores.overall}
          </div>
          {scores.band ? (
            <span
              className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
              style={{ background: bandColor }}
            >
              {scores.band.replace(/_/g, " ")}
            </span>
          ) : null}
          {scores.confidence ? (
            <div className="mt-1 text-[10px] text-muted">confidence: {scores.confidence}</div>
          ) : null}
        </div>
      </div>

      {/* Lost signable banner */}
      {alerts.lost_signable_case ? (
        <div className="mt-4 rounded-sm bg-red px-4 py-3 text-white">
          <div className="text-sm font-bold uppercase tracking-wide">Lost signable case</div>
          {rar?.amount_usd != null ? (
            <div className="mt-1 font-display text-2xl font-bold tnum">
              {money(rar.amount_usd)}
              <span className="ml-1 text-xs font-normal opacity-90">
                estimated fee at risk
                {rar.case_type_matched ? ` · ${rar.case_type_matched}` : ""}
              </span>
            </div>
          ) : null}
          {rar?.evidence_quotes?.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
              {rar.evidence_quotes.map((q, i) => (
                <li key={i} className="italic opacity-95">
                  &ldquo;{q}&rdquo;
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}

      {/* Category bars */}
      {cats.length ? (
        <div className="mt-5">
          <div className="eyebrow mb-2">Category scores</div>
          <div className="flex flex-col gap-2">
            {cats.map((c) => (
              <div key={c.key} className="grid grid-cols-[160px_1fr_34px] items-center gap-2">
                <div className="text-xs text-ink">{c.label}</div>
                <div className="h-3.5 overflow-hidden rounded-sm bg-canvas">
                  <div
                    className="h-full bg-navy"
                    style={{ width: `${Math.max(0, Math.min(100, c.score))}%` }}
                  />
                </div>
                <div className="tnum text-right text-xs font-semibold">{c.score}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* Coaching */}
      {coaching.top_strength || coaching.one_thing ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {coaching.top_strength ? (
            <div className="rounded-sm border border-line p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-navy">
                Top strength
              </div>
              <p className="mt-1 text-xs leading-relaxed">{coaching.top_strength.behavior}</p>
              {coaching.top_strength.quote ? (
                <p className="mt-2 border-l-2 border-line pl-2 text-xs italic text-muted">
                  &ldquo;{coaching.top_strength.quote}&rdquo;{" "}
                  {coaching.top_strength.timestamp ? (
                    <span className="not-italic text-faint">{coaching.top_strength.timestamp}</span>
                  ) : null}
                </p>
              ) : null}
            </div>
          ) : null}
          {coaching.one_thing ? (
            <div className="rounded-sm border border-line p-3">
              <div className="text-[11px] font-bold uppercase tracking-wide text-navy">
                The one thing
              </div>
              <p className="mt-1 text-xs leading-relaxed">{coaching.one_thing.behavior}</p>
              {coaching.one_thing.model_utterance ? (
                <p className="mt-2 border-l-2 border-navy pl-2 text-xs italic text-ink">
                  Try: &ldquo;{coaching.one_thing.model_utterance}&rdquo;
                </p>
              ) : null}
              {coaching.one_thing.why_it_matters ? (
                <p className="mt-2 text-xs text-muted">{coaching.one_thing.why_it_matters}</p>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Summary */}
      {call.summary ? (
        <div className="mt-5">
          <div className="eyebrow mb-1">Summary</div>
          <p className="text-sm leading-relaxed text-ink/90">{call.summary}</p>
        </div>
      ) : null}

      {call.case_signability ? (
        <div className="mt-4">
          <Badge tone="neutral">signability: {call.case_signability.replace(/_/g, " ")}</Badge>
        </div>
      ) : null}
    </div>
  );
}
