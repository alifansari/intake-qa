// Leak Audit Readout — first-impression diagnostic, findings-first like an
// inspection report.
import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import { DocPage, S, COLORS, BenchmarkBand, AttestationBlock } from "./shared";
import type { DocData } from "./demo-fixture";
import {
  fmtMoneyRange,
  fmtDate,
  statuteClock,
  readoutId,
  trendVerdict,
  getAttestation,
  FOOTNOTES,
  READOUT_LIMITS_INTRO,
  READOUT_NEXT_STEPS,
  SEVERITY_TIERS,
  INTAKE_METRICS,
} from "./doc-helpers.mjs";

export function ReadoutDoc({ d }: { d: DocData }) {
  const id = readoutId(d.firmCode, d.year, d.seq);
  const metricName = (k: string) => INTAKE_METRICS.find((m) => m.key === k)?.name ?? k;
  const channels = Array.from(new Set(d.leaks.map((l) => l.channel)));
  // Findings-first: order by severity.
  const order = { critical: 0, significant: 1, awareness: 2 } as const;
  const sorted = [...d.leaks].sort((a, b) => order[a.severity] - order[b.severity]);
  return (
    <Document title={`Leak Audit: ${d.firmName}`} language="en">
      <DocPage docId={id}>
        <Text style={S.h1}>Leak Audit · {d.firmName}</Text>
        <Text style={{ ...S.serif, fontSize: 12, marginTop: 2 }}>Independent review of intake calls</Text>
        <Text style={{ ...S.metaLine, marginTop: 4 }}>
          Scope: {d.reconciliation.received} intake calls received {fmtDate(d.periodStart)}{" to "}{fmtDate(d.periodEnd)},
          across {channels.join(" / ")}. {d.reconciliation.processed} calls were analyzed; the remainder are
          accounted for in the reconciliation table on the last page.
        </Text>
        <Text style={S.metaLine}>Prepared by Intake QA · Independent Intake Desk</Text>
        <Text style={S.metaLine}>Readout No. {id}</Text>

        {/* Findings, most severe first */}
        <View style={S.section}>
          <Text style={S.h2}>Findings</Text>
          {sorted.map((l) => (
            <View key={l.callerId} style={{ marginBottom: 12 }} wrap={false}>
              <Text style={{ fontSize: 9, color: l.severity === "critical" ? COLORS.red : COLORS.ink, marginBottom: 2 }}>
                {SEVERITY_TIERS[l.severity]}
              </Text>
              <Text style={{ fontSize: 10 }}>
                {l.callerInitials} · {l.callerId} · {l.caseType} · {fmtDate(l.callDate)} · {l.channel}
              </Text>
              {l.qualifyingFacts.map((f, i) => (
                <Text key={i} style={{ fontSize: 8.5, color: COLORS.muted, marginLeft: 8 }}>• {f.text} {f.cite}</Text>
              ))}
              {l.excerpt ? (
                <View style={{ marginTop: 4, marginLeft: 8, borderLeftWidth: 1.5, borderLeftColor: COLORS.rule, paddingLeft: 6 }}>
                  <Text style={{ ...S.faint, marginBottom: 2 }}>Excerpt (internal use; redacted).</Text>
                  {(Array.isArray(l.excerpt)
                    ? l.excerpt.map((e) => `${e.ts} ${e.speaker}: ${e.text}`)
                    : l.excerpt.split("\n")
                  ).map((line, i) => (
                    <Text key={i} style={{ fontSize: 8, color: COLORS.ink }}>{line}</Text>
                  ))}
                </View>
              ) : null}
              <View style={{ ...S.row, marginTop: 4 }}>
                <Text style={{ width: "40%", fontSize: 8.5 }}>Est. fee value: {fmtMoneyRange(l.feeLowCents, l.feeHighCents)}¹</Text>
                <Text style={{ width: "60%", fontSize: 8.5, color: l.statuteDays < 90 ? COLORS.red : COLORS.muted }}>
                  {statuteClock(l.statuteDays)}
                </Text>
              </View>
              <Text style={{ fontSize: 8.5, marginTop: 2, color: COLORS.navy }}>
                Recommended action: {l.severity === "awareness"
                  ? "Log the pattern and review after-hours callback timing with the team."
                  : "Have staff place a same-day callback and send the follow-up draft in the queue."}
              </Text>
            </View>
          ))}
        </View>

        {/* Intake-performance findings */}
        <View style={S.section} wrap={false}>
          <Text style={S.h2}>Intake performance</Text>
          {d.metrics.map((m) => (
            <BenchmarkBand
              key={m.key}
              label={metricName(m.key)}
              value={m.pct}
              bandLow={m.bandLow}
              bandHigh={m.bandHigh}
              unit={m.unit ?? "%"}
              verdict={m.pct == null ? "not yet measured" : trendVerdict(m.pct, m.priorPct)}
            />
          ))}
        </View>

        {/* What we could not determine */}
        <View style={S.section} wrap={false}>
          {READOUT_LIMITS_INTRO.split("\n").map((line, i) => (
            <Text key={i} style={i === 0 ? S.h2 : S.p}>{line}</Text>
          ))}
          {d.couldNotDetermine.map((t, i) => (
            <Text key={i} style={{ fontSize: 8.5, color: COLORS.muted, marginLeft: 8 }}>• {t}</Text>
          ))}
        </View>

        {/* Reconciliation */}
        <View style={S.section} wrap={false}>
          <Text style={S.h2}>Calls &amp; reconciliation</Text>
          <View style={{ ...S.row, paddingVertical: 2 }}>
            <Text style={{ width: "70%", color: COLORS.muted }}>Received</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>{d.reconciliation.received}</Text>
          </View>
          <View style={{ ...S.row, paddingVertical: 2 }}>
            <Text style={{ width: "70%", color: COLORS.muted }}>Processed (analyzed)</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>{d.reconciliation.processed}</Text>
          </View>
          <View style={{ ...S.row, paddingVertical: 2 }}>
            <Text style={{ width: "70%", color: COLORS.muted }}>Excluded</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>{d.reconciliation.excluded}</Text>
          </View>
          <View style={{ ...S.row, paddingVertical: 2 }}>
            <Text style={{ width: "70%", color: COLORS.muted }}>Failed</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>{d.reconciliation.failed}</Text>
          </View>
          <View style={S.ruleAboveTotal} />
          <View style={{ ...S.row, paddingTop: 3 }}>
            <Text style={{ width: "70%" }}>Received = Processed + Excluded + Failed</Text>
            <Text style={{ width: "30%", ...S.cellNum }}>
              {d.reconciliation.received} = {d.reconciliation.processed} + {d.reconciliation.excluded} + {d.reconciliation.failed}
            </Text>
          </View>
          <Text style={{ ...S.faint, marginTop: 6 }}>{FOOTNOTES.fee}</Text>
        </View>

        {/* Next steps */}
        <View style={S.section} wrap={false}>
          {READOUT_NEXT_STEPS.split("\n").map((line, i) => (
            <Text key={i} style={i === 0 ? S.h2 : S.p}>{line}</Text>
          ))}
        </View>

        <AttestationBlock text={getAttestation()} analystName={d.analystName} issuedDate={fmtDate(d.issuedDate)} />
      </DocPage>
    </Document>
  );
}
