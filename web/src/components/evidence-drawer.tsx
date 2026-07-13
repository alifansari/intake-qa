"use client";
import * as React from "react";
import { Sheet, SheetContent, SheetTrigger } from "./ui/sheet";
import { ReportView } from "./report-view";
import { Badge } from "./ui/badge";
import type { ReconciledCall } from "@/lib/reconcile";
import { OUTCOME_LABEL, VERDICT_LABEL, VERDICT_TONE } from "@/lib/labels";
import { money, shortDate, titleCase } from "@/lib/format";

// Opens a call’s full evidence inline: reconciliation summary at the top, then
// the original scored report (quotes + timestamps) one click away.
export function EvidenceDrawer({
  row,
  children,
}: {
  row: ReconciledCall;
  children: React.ReactNode;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent title={`${row.call.call_id} · ${row.meta.rep}`}>
        <div className="border-b border-line bg-canvas px-5 py-4">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge tone={VERDICT_TONE[row.verdict]}>{VERDICT_LABEL[row.verdict]}</Badge>
            {row.flagged ? <Badge tone="solidRed">Flagged: lost signable</Badge> : null}
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
            <Field label="Outcome" value={OUTCOME_LABEL[row.outcome.outcome_code]} />
            <Field label="Received" value={shortDate(row.meta.received_at)} />
            <Field label="Source" value={titleCase(row.meta.source)} />
            <Field
              label="Fee at risk"
              value={row.feeAtRisk ? money(row.feeAtRisk) : "—"}
            />
            <Field
              label="Callback"
              value={
                row.outcome.callback_made
                  ? `${row.outcome.time_to_callback_hours ?? "?"} hrs`
                  : "none"
              }
            />
            <Field
              label="Recovered"
              value={
                row.outcome.realized_fee_recovered != null
                  ? money(row.outcome.realized_fee_recovered)
                  : "—"
              }
            />
          </dl>
        </div>
        <ReportView call={row.call} />
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow">{label}</dt>
      <dd className="tnum mt-0.5 text-ink">{value}</dd>
    </div>
  );
}
