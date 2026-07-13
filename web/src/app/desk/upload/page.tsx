// Upload calls — the firm’s self-serve way in when their phone system isn’t
// connected (or for one-off recordings). Server component: resolve the firm
// exactly like the queue does, then hand the interactive uploader to the
// client. Every degraded state renders a friendly panel, never plumbing.
import { UploadClient } from "./upload-client";
import { resolveDeskFirm } from "@/lib/desk/firm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Upload calls — Intake QA" };

export default async function UploadPage() {
  const store = await import("../../../../ingest/store.mjs");
  // Resolve the firm inside try/catch, render OUTSIDE it (lint: JSX in a
  // try/catch isn’t actually covered by it — rendering is deferred).
  let firm: { id: string | number; name: string } | null = null;
  let db;
  try {
    db = await store.openPipelineDb();
    firm = await resolveDeskFirm(db, store.listFirms);
  } catch {
    firm = null;
  } finally {
    if (db) await store.closePipelineDb(db);
  }

  if (!firm) return <NotReady />;
  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk · {firm.name}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Upload calls</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          No connected phone system? Drop call recordings here whenever it suits you &mdash; end
          of day, end of week. We read and score each one the same way we score calls that
          arrive automatically, and anything that needs action shows up on{" "}
          <a href="/desk/queue" className="font-medium text-accent hover:text-accent-hover">
            Missed cases
          </a>
          .
        </p>
      </div>
      <UploadClient />
    </div>
  );
}

function NotReady() {
  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Upload calls</h1>
      </div>
      <div className="rounded-card border border-hairline bg-surface p-6">
        <p className="text-sm text-ink-muted">
          Uploads aren’t ready on this workspace yet. Email your recordings to{" "}
          <a
            href="mailto:ali@plaintiffops.com"
            className="font-medium text-accent hover:text-accent-hover"
          >
            ali@plaintiffops.com
          </a>{" "}
          and we’ll run them for you the same day.
        </p>
      </div>
    </div>
  );
}
