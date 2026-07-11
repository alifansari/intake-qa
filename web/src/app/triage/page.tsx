import { getReconciledCalls } from "@/lib/data";
import { PageShell, PageHeader } from "@/components/page";
import { TriageQueue } from "@/components/triage-queue";
import { Annotation } from "@/components/demo-mode";

export const dynamic = "force-dynamic"; // reflect newly-recorded outcomes

export default async function TriagePage() {
  const rows = await getReconciledCalls();
  // "Needs outcome" queue: only unknowns, highest fee-at-risk first.
  const queue = rows
    .filter((r) => r.outcome.outcome_code === "unknown")
    .sort((a, b) => b.feeAtRisk - a.feeAtRisk || b.overall - a.overall);

  return (
    <PageShell>
      <PageHeader kicker="Close the loop" title="Outcome Triage Queue" />
      <Annotation>
        This is the daily 5-minute habit. Staff clear this queue and every metric on the other
        pages sharpens. Try the number keys on your keyboard.
      </Annotation>
      <TriageQueue initial={queue} />
    </PageShell>
  );
}
