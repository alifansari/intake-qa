import { redirect } from "next/navigation";
import { requireFounderPage } from "@/lib/studio/guard";
import { createSpotCheck } from "@/lib/studio/data";

export const dynamic = "force-dynamic";

// Create a draft scorecard from a recording, then send the founder to the editor.
export default async function NewScorecard({
  searchParams,
}: {
  searchParams: Promise<{ firm?: string; recording?: string }>;
}) {
  const { supabase } = await requireFounderPage();
  const { firm, recording } = await searchParams;
  if (!firm) redirect("/studio");

  const sc = await createSpotCheck(supabase, {
    firm_id: firm,
    recording_id: recording ?? null,
  });
  redirect(`/studio/scorecards/${sc.id}`);
}
