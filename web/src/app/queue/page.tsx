import { redirect } from "next/navigation";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { pilotRepo } from "@/lib/pilot-repository";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { QueueClient } from "./queue-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // always reflect the live queue

export default async function QueuePage() {
  // Not wired to Supabase yet: show a friendly setup state (never crash).
  if (!isSupabaseConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Pilot control" title="Approval Queue" />
        <Card>
          <CardContent className="py-8">
            <p className="text-sm text-ink">
              The approval queue is ready, but no database is connected yet.
            </p>
            <p className="mt-2 text-sm text-muted">
              Create a Supabase project, run the migrations in{" "}
              <code className="rounded-sm bg-canvas px-1 py-0.5">web/supabase/migrations</code>, and
              set <code className="rounded-sm bg-canvas px-1 py-0.5">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
              and{" "}
              <code className="rounded-sm bg-canvas px-1 py-0.5">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
              in your environment. Then this page shows every drafted text awaiting your approval.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  // PILOT MODE: a human must be signed in to review/approve any message.
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/queue");

  const [drafted, approved] = await Promise.all([
    pilotRepo.listDraftedMessages(),
    pilotRepo.listApprovedMessages(),
  ]);

  return (
    <PageShell>
      <PageHeader kicker="Pilot control" title="Approval Queue">
        <span className="text-xs text-muted">Signed in as {user.email ?? user.id}</span>
      </PageHeader>
      <QueueClient drafted={drafted} approved={approved} />
    </PageShell>
  );
}
