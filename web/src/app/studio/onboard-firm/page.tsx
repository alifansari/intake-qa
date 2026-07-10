import Link from "next/link";
import { PageShell, PageHeader } from "@/components/page";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { OnboardFirmForm } from "./form";

export const dynamic = "force-dynamic";

// The apply → account bridge (founder cockpit). An approved applicant becomes
// a working firm in one click: firm row + sign-in account + membership, with
// the welcome email composed and ready to paste.
export default async function OnboardFirmPage() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake System" title="Onboard a firm — not configured" />
      </PageShell>
    );
  }
  await requireFounderPage();
  return (
    <PageShell>
      <PageHeader kicker="Intake System" title="Onboard a firm">
        <Link href="/studio" className="text-xs text-accent underline hover:text-accent-hover">
          Studio home
        </Link>
      </PageHeader>
      <p className="mb-6 max-w-[70ch] text-sm text-muted">
        When a beta application clears the NDA, provision the firm here. One click creates
        their account, scopes the desk to their firm, and writes the welcome email for you —
        sign-in link, temporary password, and their paste-once webhook address.
      </p>
      <OnboardFirmForm />
    </PageShell>
  );
}
