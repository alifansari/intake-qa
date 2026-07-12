// The Intake Leak Report PDF — the canonical forwarding artifact. Renders from the
// composed document model (src/lib/leak-report/compose.mjs). Reuses the shared
// react-pdf primitives. Fonts: real bundled OFL families registered in shared.tsx —
// Source Serif 4 (headings), IBM Plex Sans (body/UI), JetBrains Mono (transcript).
import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import { DocPage, S, COLORS, FONTS } from "./shared";
import { ANALYST } from "../lib/analyst.mjs";

// Shape of the composed document model (from src/lib/leak-report/compose.mjs).
// A structured transcript line for the deposition-style excerpt (P1). When the
// excerpt is a plain string we fall back to line-numbered rendering.
type ExcerptLine = { speaker: string; ts: string; text: string; isLeakMoment?: boolean };

type Exhibit = {
  n: number;
  initials: string;
  displayId: string;
  caseType: string;
  callDate: string;
  channel: string;
  qualifyingFacts: { text: string; cite: string }[];
  excerpt: string | ExcerptLine[] | null;
  feeRange: string;
  feeDerivation?: string | null;
  confidence?: string;
  badge: string;
  tag: string;
  tagDef: string;
  recommendedAction: string;
  disclaimer: string;
};
type Model = {
  meta: { firmName: string; reportId: string; periodLabel: string; analystName: string; issuedDate: string };
  coverMemo: string | null;
  pageOne: {
    labels: { count: string; fee: string; recoverable: string };
    count: number;
    feeRange: string;
    recoverable: number;
    split?: { strong: number; moderate: number; expired: number };
    threeActions?: string[];
    verdict: string;
    nextAction: string | null;
  };
  scope: string;
  exhibits: Exhibit[];
  schedule: {
    rows: { caseType: string; feeRange: string }[];
    headlineLow: number;
    headlineHigh: number;
    exclusions: { label: string; reason: string }[];
    exclusionsIntro: string;
  };
  findingsSummary: { intro: string; counts: { tag: string; def: string; count: number }[] };
  couldNotDetermine: { intro: string; items: string[] };
  guarantee: string;
  methodology: string;
  signoff: string;
  falseAlarmLine?: string;
};

// Grayscale-survivable urgency badge: encoded by SHAPE + LABEL, never color alone.
function Badge({ band }: { band: string }) {
  const base = { fontSize: 7.5, fontFamily: FONTS.sans, paddingHorizontal: 4, paddingVertical: 1 } as const;
  if (band === "CRITICAL")
    return <Text style={{ ...base, color: "#FFFFFF", backgroundColor: COLORS.ink }}>■ CRITICAL</Text>;
  if (band === "SOON")
    return <Text style={{ ...base, color: COLORS.ink, borderWidth: 1, borderColor: COLORS.ink }}>▢ SOON</Text>;
  if (band === "EXPIRED")
    return <Text style={{ ...base, color: COLORS.muted, textDecoration: "line-through", borderWidth: 0.5, borderColor: COLORS.muted }}>✕ EXPIRED</Text>;
  return <Text style={{ ...base, color: COLORS.muted }}>OK</Text>;
}

// Grayscale-safe confidence tier chip: encoded by SHAPE + LABEL, never color alone
// (P1). Strong = filled square; moderate = outlined dot.
function ConfidenceChip({ tier }: { tier?: string }) {
  const base = { fontSize: 7, fontFamily: FONTS.sans, paddingHorizontal: 3, paddingVertical: 1 } as const;
  if (tier === "moderate")
    return <Text style={{ ...base, color: COLORS.muted, borderWidth: 0.5, borderColor: COLORS.muted }}>◇ MODERATE</Text>;
  return <Text style={{ ...base, color: COLORS.ink, borderWidth: 1, borderColor: COLORS.ink }}>◆ STRONG</Text>;
}

// Deposition-style transcript block. Two modes:
//  - structured ({speaker, ts, text, isLeakMoment}[]): timestamp in the gutter,
//    speaker + text in the body, the leak moment bolded (P1).
//  - plain string: monospace, line-numbered fallback.
function TranscriptExcerpt({ excerpt }: { excerpt: string | ExcerptLine[] }) {
  const structured = Array.isArray(excerpt);
  return (
    <View style={{ marginTop: 4, borderLeftWidth: 1.5, borderLeftColor: COLORS.rule, paddingLeft: 6 }} wrap={false}>
      <Text style={{ ...S.faint, marginBottom: 2 }}>Excerpt (internal use; redacted: surname to initial; phone/address/DOB removed).</Text>
      {structured
        ? (excerpt as ExcerptLine[]).map((ln, i) => (
            <View key={i} style={{ flexDirection: "row" }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 8, color: COLORS.faint, width: 40 }}>{ln.ts}</Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 8, color: COLORS.ink, flex: 1 }}>
                <Text style={{ color: COLORS.muted }}>{ln.speaker}: </Text>
                <Text style={ln.isLeakMoment ? { fontFamily: FONTS.mono, fontWeight: 700, color: COLORS.ink } : {}}>{ln.text}</Text>
              </Text>
            </View>
          ))
        : (excerpt as string).split("\n").map((ln, i) => (
            <View key={i} style={{ flexDirection: "row" }}>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 8, color: COLORS.faint, width: 20 }}>
                {String(i + 1).padStart(2, "0")}
              </Text>
              <Text style={{ fontFamily: FONTS.mono, fontSize: 8, color: COLORS.ink, flex: 1 }}>{ln}</Text>
            </View>
          ))}
    </View>
  );
}

export function LeakReportDoc({ model }: { model: Model }) {
  const m = model;
  return (
    <Document title={`Intake Leak Report: ${m.meta.firmName}`} language="en">
      {/* Dated cover memo — only when a case is in the CRITICAL band */}
      {m.coverMemo ? (
        <DocPage docId={m.meta.reportId}>
          <View style={{ borderWidth: 1, borderColor: COLORS.ink, padding: 14 }}>
            {m.coverMemo.split("\n").map((line, i) => (
              <Text key={i} style={{ fontSize: i === 0 ? 13 : 10, fontFamily: i === 0 ? FONTS.serif : FONTS.sans, marginBottom: 4, color: COLORS.ink }}>
                {line}
              </Text>
            ))}
          </View>
        </DocPage>
      ) : null}

      <DocPage docId={m.meta.reportId}>
        {/* Cover / masthead */}
        <Text style={S.h1}>Intake Leak Report</Text>
        <Text style={{ ...S.serif, fontSize: 13, marginTop: 2 }}>{m.meta.firmName}</Text>
        <Text style={S.metaLine}>{m.meta.periodLabel} · Report No. {m.meta.reportId}</Text>
        <Text style={S.metaLine}>Prepared by Intake QA · Independent Intake Desk · Analyst of record: {m.meta.analystName}</Text>

        {/* Page-one BLUF: three numbers */}
        <View style={S.section}>
          <Text style={S.h2}>Bottom line</Text>
          <View style={{ ...S.row, paddingVertical: 3 }}>
            <Text style={{ width: "70%", color: COLORS.muted }}>{m.pageOne.labels.count}</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>{m.pageOne.count}</Text>
          </View>
          <View style={{ ...S.row, paddingVertical: 3 }}>
            <Text style={{ width: "70%", color: COLORS.muted }}>{m.pageOne.labels.fee}</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>{m.pageOne.feeRange}</Text>
          </View>
          <View style={{ ...S.row, paddingVertical: 3 }}>
            <Text style={{ width: "70%", color: COLORS.muted }}>{m.pageOne.labels.recoverable}</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>{m.pageOne.recoverable}</Text>
          </View>
          {m.pageOne.split ? (
            <Text style={{ ...S.faint, marginTop: 2 }}>
              {m.pageOne.split.strong} strong (counted) · {m.pageOne.split.moderate} moderate (excluded from totals)
              {m.pageOne.split.expired ? ` · ${m.pageOne.split.expired} expired (excluded)` : ""}
            </Text>
          ) : null}
          <Text style={{ ...S.p, marginTop: 8 }}>{m.pageOne.verdict}</Text>
          {m.pageOne.nextAction ? <Text style={{ ...S.p, fontFamily: FONTS.serif }}>{m.pageOne.nextAction}</Text> : null}
        </View>

        {/* Dated 3-action box (P1) */}
        {m.pageOne.threeActions && m.pageOne.threeActions.length ? (
          <View style={{ ...S.section, borderWidth: 0.8, borderColor: COLORS.ink, padding: 10 }} wrap={false}>
            <Text style={{ ...S.h2, marginBottom: 4 }}>Do these 3 things this week</Text>
            {m.pageOne.threeActions.map((a, i) => (
              <Text key={i} style={{ fontSize: 9, marginBottom: 3 }}>
                {i + 1}. {a}
              </Text>
            ))}
          </View>
        ) : null}

        {/* Scope & method */}
        <View style={S.section} wrap={false}>
          <Text style={S.h2}>Scope and method</Text>
          <Text style={S.p}>{m.scope}</Text>
        </View>

        {/* Exhibits */}
        <View style={S.section}>
          <Text style={S.h2}>Leaked-case exhibits</Text>
          {m.exhibits.map((e) => (
            <View key={e.n} style={{ marginBottom: 12 }} wrap={false}>
              <View style={{ ...S.row, justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 10, fontFamily: FONTS.serif, flex: 1 }}>
                  Exhibit {e.n}: {e.caseType} · {e.initials} {e.displayId} · {e.callDate} · {e.channel}
                </Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  <ConfidenceChip tier={e.confidence} />
                  <Badge band={e.badge} />
                </View>
              </View>
              {e.qualifyingFacts.map((f, i) => (
                <Text key={i} style={{ fontSize: 8.5, color: COLORS.muted, marginLeft: 8 }}>• {f.text} {f.cite}</Text>
              ))}
              {e.excerpt ? <TranscriptExcerpt excerpt={e.excerpt} /> : null}
              {/* Per-exhibit fee derivation — the one-line arithmetic (P0-C). */}
              {e.feeDerivation ? (
                <Text style={{ fontSize: 8, color: COLORS.muted, marginTop: 4 }}>{e.feeDerivation}¹</Text>
              ) : (
                <Text style={{ fontSize: 8.5, marginTop: 4 }}>Estimated fee value: {e.feeRange}¹</Text>
              )}
              <View style={{ ...S.row, marginTop: 2 }}>
                <Text style={{ width: "100%", fontSize: 8.5, color: COLORS.muted }}>Moment of leak: {e.tag}</Text>
              </View>
              <Text style={{ fontSize: 8.5, marginTop: 2, color: COLORS.navy }}>Recommended action: {e.recommendedAction}</Text>
              <Text style={{ ...S.faint, marginTop: 2 }}>{e.disclaimer}</Text>
            </View>
          ))}
        </View>

        {/* Fee-at-risk schedule */}
        <View style={S.section} wrap={false}>
          <Text style={S.h2}>Fee-at-risk schedule</Text>
          {m.schedule.rows.map((r, i) => (
            <View key={i} style={{ ...S.row, paddingVertical: 2 }}>
              <Text style={{ width: "70%", color: COLORS.muted }}>{r.caseType}</Text>
              <Text style={{ width: "30%", ...S.cellNum }}>{r.feeRange}</Text>
            </View>
          ))}
          <View style={S.ruleAboveTotal} />
          <View style={{ ...S.row, paddingTop: 3 }}>
            <Text style={{ width: "70%" }}>Headline total (sum of rows above)</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>
              ${(m.schedule.headlineLow / 100).toLocaleString("en-US")} to ${(m.schedule.headlineHigh / 100).toLocaleString("en-US")}
            </Text>
          </View>
          <Text style={{ ...S.faint, marginTop: 6 }}>{m.schedule.exclusionsIntro}</Text>
          {m.schedule.exclusions.map((x, i) => (
            <Text key={i} style={{ ...S.faint, marginLeft: 8 }}>• {x.label}: excluded ({x.reason})</Text>
          ))}
        </View>

        {/* Findings summary (taxonomy) */}
        <View style={S.section} wrap={false}>
          <Text style={S.h2}>Findings summary</Text>
          <Text style={S.p}>{m.findingsSummary.intro}</Text>
          {m.findingsSummary.counts.map((c) => (
            <View key={c.tag} style={{ ...S.row, paddingVertical: 2 }}>
              <Text style={{ width: "30%", fontSize: 8.5 }}>{c.tag}</Text>
              <Text style={{ width: "62%", fontSize: 8, color: COLORS.muted }}>{c.def}</Text>
              <Text style={{ width: "8%", ...S.cellNum }}>{c.count}</Text>
            </View>
          ))}
        </View>

        {/* What we could not determine */}
        {m.couldNotDetermine.items.length ? (
          <View style={S.section} wrap={false}>
            <Text style={S.h2}>What we could not determine</Text>
            <Text style={S.p}>{m.couldNotDetermine.intro}</Text>
            {m.couldNotDetermine.items.map((t, i) => (
              <Text key={i} style={{ fontSize: 8.5, color: COLORS.muted, marginLeft: 8 }}>• {t}</Text>
            ))}
          </View>
        ) : null}

        {/* Guarantee */}
        <View style={{ ...S.section, borderWidth: 0.6, borderColor: COLORS.rule, padding: 10 }} wrap={false}>
          <Text style={S.p}>{m.guarantee}</Text>
        </View>

        {/* Methodology */}
        <View style={S.section}>
          <Text style={S.h2}>Methodology appendix</Text>
          <Text style={S.faint}>{m.methodology}</Text>
          {/* Published false-alarm rate — rides on every deliverable (P0-D / §IV). */}
          {m.falseAlarmLine ? <Text style={{ ...S.faint, marginTop: 4 }}>{m.falseAlarmLine}</Text> : null}
        </View>

        {/* Analyst sign-off */}
        <View style={S.attest} wrap={false}>
          <Text style={{ fontSize: 8.5, color: COLORS.muted }}>{m.signoff}</Text>
          <Text style={{ marginTop: 14 }}>_______________________________</Text>
          <Text style={{ marginTop: 2, color: COLORS.ink }}>{m.meta.analystName}</Text>
          <Text style={{ color: COLORS.muted }}>{ANALYST.title}, Intake QA · {m.meta.issuedDate}</Text>
        </View>
      </DocPage>
    </Document>
  );
}
