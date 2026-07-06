// Renders the Monthly Missed-Revenue Statement PDF (the SAMPLE). Unlike the Leak
// Audit readout/report — which now render real per-session data (see the readout +
// leak-report routes) — the monthly statement is a SUBSCRIPTION-phase artifact: it
// aggregates a firm's calls over a billing period, which only exists once a firm is
// subscribed and a period has closed. Until then this serves the demo fixture.
// TODO(Ali): wire firm+period aggregation → DocData when the first firm subscribes.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { StatementDoc } from "@/pdf/statement";
import { DEMO_DOC } from "@/pdf/demo-fixture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const el = React.createElement(StatementDoc, { d: DEMO_DOC }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(el);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="missed-revenue-statement-demo.pdf"',
      "cache-control": "no-store",
    },
  });
}
