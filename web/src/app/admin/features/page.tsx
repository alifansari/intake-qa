// Operator feature-flag console. Lists every firm and the on/off state of each
// enhancement flag, and lets the operator roll features out firm-by-firm.
// Read path goes through the pipeline facade; writes go through
// /api/admin/features (never db.mjs directly). Degrades gracefully with no DB.

import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { FeatureToggles } from "@/components/feature-toggles";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const metadata = { title: "Feature flags — Intake QA" };

type FirmFeatures = {
  id: number | string;
  name: string;
  features: Record<string, boolean>;
};

async function loadFirms(): Promise<
  | { connected: true; firms: FirmFeatures[] }
  | { connected: false; error?: string }
> {
  try {
    const store = await import("../../../../ingest/store.mjs");
    if (!store.pipelineDbConfigured()) return { connected: false };
    const db = await store.openPipelineDb();
    try {
      const firms = await store.listFirms(db);
      const withFeatures: FirmFeatures[] = await Promise.all(
        firms.map(async (f: { id: number | string; name: string }) => ({
          id: f.id,
          name: f.name,
          features: await store.getFirmFeatures(db, f.id),
        })),
      );
      return { connected: true, firms: withFeatures };
    } finally {
      await store.closePipelineDb(db);
    }
  } catch (e) {
    return { connected: false, error: String((e as Error)?.message ?? e) };
  }
}

export default async function AdminFeaturesPage() {
  // Defense in depth: middleware already founder-gates /admin, but no page may
  // assume the request passed middleware (same rule as every studio surface).
  if (isStudioConfigured()) await requireFounderPage();

  const state = await loadFirms();

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio · System" title="Feature flags" />
      <Card>
        <CardContent className="pt-5">
          <SectionTitle>Per-firm rollout</SectionTitle>
          {state.connected ? (
            <FeatureToggles firms={state.firms} />
          ) : (
            <p className="text-sm text-muted">
              No database connected. Feature flags appear here once a
              Supabase/Postgres connection is configured.
            </p>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
