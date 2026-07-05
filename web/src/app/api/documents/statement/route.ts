// Renders the Monthly Missed-Revenue Statement PDF. For now it serves the
// self-contained demo fixture so a sample always renders with no DB; real per-firm
// data wiring lands with the pipeline gate. TODO(Ali): resolve firm+period → DocData.
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
