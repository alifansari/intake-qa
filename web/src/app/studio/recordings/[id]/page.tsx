import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, PageHeader } from "@/components/page";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { getRecording } from "@/lib/studio/data";
import { RecordingAnalysis } from "./analysis";

export const dynamic = "force-dynamic";

// Recording view: transcript viewer + leak-audit analysis panel. Founder-only.
export default async function RecordingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isStudioConfigured()) return notFound();
  const { id } = await params;
  const { supabase } = await requireFounderPage();
  const rec = await getRecording(supabase, id);
  if (!rec) return notFound();

  const done = Boolean(rec.transcript && rec.transcript.trim());

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio · Recording" title={rec.original_filename}>
        <Link
          href={`/studio/firms/${rec.firm_id}`}
          className="text-xs text-accent underline hover:text-accent-hover"
        >
          Back to firm
        </Link>
      </PageHeader>

      <RecordingAnalysis
        id={rec.id}
        firmId={rec.firm_id}
        initialDone={done}
        initialTranscript={rec.transcript}
        initialScoring={rec.scoring}
      />
    </PageShell>
  );
}
