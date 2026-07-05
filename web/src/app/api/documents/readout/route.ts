// Renders the Leak Audit Readout PDF. Serves the self-contained demo fixture for
// now so a sample always renders with no DB. TODO(Ali): resolve firm → DocData.
import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ReadoutDoc } from "@/pdf/readout";
import { DEMO_DOC } from "@/pdf/demo-fixture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const el = React.createElement(ReadoutDoc, { d: DEMO_DOC }) as unknown as Parameters<typeof renderToBuffer>[0];
  const buffer = await renderToBuffer(el);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": 'inline; filename="leak-audit-readout-demo.pdf"',
      "cache-control": "no-store",
    },
  });
}
