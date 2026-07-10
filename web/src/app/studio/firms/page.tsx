import Link from "next/link";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { listFirms, type StudioFirm } from "@/lib/studio/data";

export const dynamic = "force-dynamic";

// The one home for firm management. Before this page existed, firm details were
// reachable only from a list buried on Today, and onboarding only from a card in
// the "Everything else" grid — insider knowledge. Now: Firms in the nav → every
// firm, plus the one button that turns an application into an account.
export default async function StudioFirms() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake QA · Studio" title="Firms" />
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted">
              The Studio needs a connected Supabase project and a FOUNDER_EMAIL. Set the
              environment variables to enable it.
            </p>
          </CardContent>
        </Card>
      </PageShell>
    );
  }

  const { supabase } = await requireFounderPage();
  let firms: StudioFirm[] = [];
  try {
    firms = await listFirms(supabase);
  } catch {
    firms = [];
  }

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio" title="Firms">
        <Link
          href="/studio/onboard-firm"
          className="rounded-sm bg-navy-deep px-3 py-1.5 text-xs font-medium text-white hover:bg-navy"
        >
          Onboard a firm
        </Link>
      </PageHeader>
      <p className="mb-4 max-w-[64ch] text-sm text-muted">
        Every firm with an account. Open one to see its recordings, mystery shops, and
        scorecards. New application? &ldquo;Onboard a firm&rdquo; creates the account and
        composes the welcome email in one step.
      </p>
      {firms.length === 0 ? (
        <Card>
          <CardContent className="py-6">
            <p className="text-sm text-muted">
              No firms yet. When an application comes in, onboard it here — or add a firm on
              the fly by uploading a call on{" "}
              <Link href="/studio" className="underline hover:text-ink">
                Today
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-paper">
          {firms.map((f) => (
            <li key={f.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium text-ink">{f.name}</div>
                {f.website ? <div className="text-xs text-faint">{f.website}</div> : null}
              </div>
              <Link
                href={`/studio/firms/${f.id}`}
                className="text-xs text-accent underline hover:text-accent-hover"
              >
                Open
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
