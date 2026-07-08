import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, PageHeader } from "@/components/page";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { getSpotCheck, getFirm, getRecordingForSpotCheck } from "@/lib/studio/data";
import { ScorecardEditor } from "./editor";

export const dynamic = "force-dynamic";

export default async function ScorecardEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isStudioConfigured()) return notFound();
  const { id } = await params;
  const { supabase } = await requireFounderPage();
  const sc = await getSpotCheck(supabase, id);
  if (!sc) return notFound();
  const firm = await getFirm(supabase, sc.firm_id);
  const rec = await getRecordingForSpotCheck(supabase, id);

  return (
    <PageShell>
      <PageHeader
        kicker="Spot Check Studio · Scorecard"
        title={firm?.name ?? "Scorecard"}
      >
        <div className="flex items-center gap-3">
          {sc.status === "final" ? (
            <Link
              href={`/studio/scorecards/${sc.id}/print`}
              className="text-xs text-accent underline hover:text-accent-hover"
              target="_blank"
            >
              Open print view
            </Link>
          ) : null}
          <Link
            href={`/studio/firms/${sc.firm_id}`}
            className="text-xs text-accent underline hover:text-accent-hover"
          >
            Back to firm
          </Link>
        </div>
      </PageHeader>

      <ScorecardEditor
        initial={sc}
        firmName={firm?.name ?? ""}
        hasEvidence={Boolean(rec?.transcript)}
      />
    </PageShell>
  );
}
