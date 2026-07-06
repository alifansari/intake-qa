// Monthly Missed-Revenue Statement — styled like a financial statement.
import React from "react";
import { Document, View, Text } from "@react-pdf/renderer";
import { DocPage, S, COLORS, BenchmarkBand, AttestationBlock } from "./shared";
import type { DocData } from "./demo-fixture";
import {
  fmtMoneyRange,
  fmtDate,
  statuteClock,
  statementId,
  trendVerdict,
  ATTESTATION,
  FOOTNOTES,
  AGENCY_INTRO,
  COACHING_XREF,
  INTAKE_METRICS,
} from "./doc-helpers.mjs";

export function StatementDoc({ d }: { d: DocData }) {
  const id = statementId(d.firmCode, d.year, d.seq);
  const metricName = (k: string) => INTAKE_METRICS.find((m) => m.key === k)?.name ?? k;
  return (
    <Document title={`Missed-Revenue Statement: ${d.firmName}, ${d.periodLabel}`} language="en">
      <DocPage docId={id}>
        {/* Header block */}
        <Text style={S.h1}>{d.firmName}</Text>
        <Text style={{ ...S.serif, fontSize: 14, marginTop: 2 }}>Missed-Revenue Statement</Text>
        <Text style={S.metaLine}>
          Period: {d.periodLabel}  (calls received {fmtDate(d.periodStart)}{" to "}{fmtDate(d.periodEnd)})
        </Text>
        <Text style={S.metaLine}>Prepared by Intake QA · Independent Recovery Desk</Text>
        <Text style={S.metaLine}>Statement No. {id}</Text>

        {/* Executive summary — EXACTLY three numbers */}
        <View style={S.section}>
          <Text style={S.h2}>This period at a glance</Text>
          <View style={{ ...S.row, paddingVertical: 3 }}>
            <Text style={{ width: "62%", color: COLORS.muted }}>Estimated missed signable fee value</Text>
            <Text style={{ width: "26%", ...S.cellNum }}>{fmtMoneyRange(d.missedLowCents, d.missedHighCents)}</Text>
            <Text style={{ width: "12%", ...S.cellNum, ...S.faint }}>(see App. A)</Text>
          </View>
          <View style={{ ...S.row, paddingVertical: 3 }}>
            <Text style={{ width: "62%", color: COLORS.muted }}>Leaked signable cases flagged</Text>
            <Text style={{ width: "38%", ...S.cellNum }}>{d.leaksFlagged}</Text>
          </View>
          <View style={{ ...S.row, paddingVertical: 3 }}>
            <Text style={{ width: "62%", color: COLORS.muted }}>Saves in progress or converted</Text>
            <Text style={{ width: "38%", ...S.cellNum }}>{d.savesInProgress} of {d.leaksFlagged}</Text>
          </View>
        </View>

        {/* Leaked-case schedule */}
        <View style={S.section}>
          <Text style={S.h2}>Leaked-case schedule</Text>
          <View style={S.tableHead}>
            <Text style={{ ...S.th, width: "16%" }}>Caller</Text>
            <Text style={{ ...S.th, width: "14%" }}>Call date</Text>
            <Text style={{ ...S.th, width: "18%" }}>Case type</Text>
            <Text style={{ ...S.th, width: "20%", textAlign: "right" }}>Est. fee value¹</Text>
            <Text style={{ ...S.th, width: "16%" }}>Statute</Text>
            <Text style={{ ...S.th, width: "16%" }}>Save status</Text>
          </View>
          {d.leaks.map((l) => (
            <View key={l.callerId} style={S.trow} wrap={false}>
              <Text style={{ width: "16%" }}>{l.callerInitials} · {l.callerId}</Text>
              <Text style={{ width: "14%" }}>{fmtDate(l.callDate)}</Text>
              <Text style={{ width: "18%" }}>{l.caseType}</Text>
              <Text style={{ width: "20%", ...S.cellNum }}>{fmtMoneyRange(l.feeLowCents, l.feeHighCents)}¹</Text>
              <Text style={{ width: "16%", fontSize: 8, color: l.statuteDays < 90 ? COLORS.red : COLORS.muted }}>
                {statuteClock(l.statuteDays)}
              </Text>
              <Text style={{ width: "16%", fontSize: 8 }}>{l.saveStatus}</Text>
            </View>
          ))}
          {/* Qualifying facts with citations, per case */}
          {d.leaks.map((l) => (
            <View key={`facts-${l.callerId}`} style={{ marginTop: 6 }} wrap={false}>
              <Text style={{ fontSize: 8, color: COLORS.ink }}>{l.callerInitials} · {l.callerId} · qualifying facts</Text>
              {l.qualifyingFacts.map((f, i) => (
                <Text key={i} style={{ fontSize: 8, color: COLORS.muted, marginLeft: 8 }}>
                  • {f.text} {f.cite}
                </Text>
              ))}
            </View>
          ))}
        </View>

        {/* Intake performance trend */}
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

        {/* Agency lead-quality */}
        <View style={S.section} wrap={false}>
          {AGENCY_INTRO.split("\n").map((line, i) => (
            <Text key={i} style={i === 0 ? S.h2 : S.p}>{line}</Text>
          ))}
          <View style={S.tableHead}>
            <Text style={{ ...S.th, width: "46%" }}>Channel</Text>
            <Text style={{ ...S.th, width: "18%", textAlign: "right" }}>Calls</Text>
            <Text style={{ ...S.th, width: "20%", textAlign: "right" }}>Qual. complete</Text>
            <Text style={{ ...S.th, width: "16%", textAlign: "right" }}>Leaks</Text>
          </View>
          {d.channels.map((c) => (
            <View key={c.name} style={S.trow}>
              <Text style={{ width: "46%" }}>{c.name}</Text>
              <Text style={{ width: "18%", ...S.cellNum }}>{c.volume}</Text>
              <Text style={{ width: "20%", ...S.cellNum }}>{c.qualificationPct}%</Text>
              <Text style={{ width: "16%", ...S.cellNum }}>{c.leaks}</Text>
            </View>
          ))}
        </View>

        {/* Analyst's note */}
        <View style={S.section} wrap={false}>
          <Text style={S.h2}>Analyst&apos;s note</Text>
          <Text style={S.p}>{d.analystNote}</Text>
          <Text style={S.faint}>{COACHING_XREF}</Text>
        </View>

        {/* Footnotes */}
        <View style={S.section}>
          <Text style={{ ...S.faint, marginBottom: 3 }}>{FOOTNOTES.fee}</Text>
          <Text style={{ ...S.faint, marginBottom: 3 }}>{FOOTNOTES.confidence}</Text>
          <Text style={S.faint}>{FOOTNOTES.reconciliation}</Text>
        </View>

        {/* Attestation */}
        <AttestationBlock text={ATTESTATION} analystName={d.analystName} issuedDate={fmtDate(d.issuedDate)} />
      </DocPage>
    </Document>
  );
}
