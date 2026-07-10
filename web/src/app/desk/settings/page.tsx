// Settings — server wrapper. Resolves the signed-in user's firm so the client
// screen can show THEIR paste-once webhook address and THEIR CRM connector
// link. No firm resolvable → the sections degrade to the concierge line.
import { resolveDeskFirm } from "@/lib/desk/firm";
import { SettingsClient } from "./settings-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Settings — Intake QA" };

export default async function SettingsPage() {
  let firmId: string | null = null;
  try {
    const store = await import("../../../../ingest/store.mjs");
    const db = await store.openPipelineDb();
    try {
      const firm = await resolveDeskFirm(db, store.listFirms);
      if (firm) firmId = String(firm.id);
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    // no workspace DB — sections degrade gracefully
  }

  const origin = process.env.APP_URL?.replace(/\/$/, "") || "https://plaintiffops.com";
  return (
    <SettingsClient
      firmId={firmId}
      webhookUrl={firmId ? `${origin}/webhooks/callrail/${firmId}` : null}
      crmHref={firmId ? `/settings/integrations?firm=${firmId}` : null}
    />
  );
}
