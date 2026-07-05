// Firm integration settings (login-gated). Configure CRM connectors / a signed
// webhook and send a test event. Reads existing config through the facade;
// credentials are never rendered back (write-only).

import { redirect } from "next/navigation";
import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { IntegrationSettings } from "@/components/integration-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Integrations — Intake QA" };

export default async function IntegrationsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ firm?: string }>;
}) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect("/login?next=/settings/integrations");
  }
  const { firm: firmParam } = await searchParams;

  const store = await import("../../../../ingest/store.mjs");
  if (!store.pipelineDbConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Settings" title="Integrations" />
        <Card>
          <CardContent className="pt-5">
            <p className="text-sm text-muted">
              Integrations appear here once your workspace database is connected.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const db = await store.openPipelineDb();
  try {
    const firms = await store.listFirms(db);
    const firm =
      (firmParam && firms.find((f: { id: unknown }) => String(f.id) === String(firmParam))) ||
      firms[0];
    if (!firm) {
      return (
        <PageShell>
          <PageHeader kicker="Settings" title="Integrations" />
          <Card>
            <CardContent className="pt-5">
              <p className="text-sm text-muted">No firm found.</p>
            </CardContent>
          </Card>
        </PageShell>
      );
    }
    const rows = await store.listFirmIntegrations(db, firm.id);
    const existing = rows.map(
      (r: { provider: string; enabled: number | boolean; credentials_encrypted: string | null; webhook_url: string | null }) => ({
        provider: r.provider,
        enabled: Boolean(r.enabled),
        hasCreds: Boolean(r.credentials_encrypted),
        webhook_url: r.webhook_url ?? null,
      }),
    );

    return (
      <PageShell>
        <PageHeader kicker="Settings" title="Integrations" />
        <Card>
          <CardContent className="pt-5">
            <SectionTitle>Push findings to your CRM</SectionTitle>
            <p className="mb-4 mt-1 text-sm text-muted">
              Send Intake QA flags, outcomes, and audits into Lead Docket, Filevine, or any signed
              webhook. Export only — we never text your callers through here.
            </p>
            <IntegrationSettings firmId={firm.id} existing={existing} />
          </CardContent>
        </Card>
      </PageShell>
    );
  } finally {
    await store.closePipelineDb(db);
  }
}
