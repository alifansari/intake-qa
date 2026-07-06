// Renders the Intake Leak Report PDF from the composed document model. Serves the
// self-contained demo fixture so a SAMPLE always renders with no DB.
// TODO(Ali): resolve a real firm+period → DocData and gate on report_status=released.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { LeakReportDoc } from "@/pdf/leak-report";
import { DEMO_DOC } from "@/pdf/demo-fixture";
import { composeLeakReport } from "../../../../lib/leak-report/compose.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const model = composeLeakReport(DEMO_DOC);
  const el = React.createElement(LeakReportDoc, { model }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(el);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="intake-leak-report-sample.pdf"',
      "cache-control": "no-store",
    },
  });
}
