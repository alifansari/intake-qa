// Live Coach — server gate (P0-2). The interactive coach is a Pro-tier,
// consent-gated feature; the client UI lives in coach-client.tsx. This server
// component DENIES BY DEFAULT: a firm that is not entitled to the coach sees a
// "not available" panel instead of the mic UI, even via a direct /desk/coach URL
// (hiding the nav item alone is not access control).
import { isLiveCoachEntitled } from "@/lib/coach-entitlement";
import { CoachClient } from "./coach-client";

export const dynamic = "force-dynamic";

export default async function CoachPage() {
  const { entitled } = await isLiveCoachEntitled();
  if (!entitled) {
    return (
      <div className="mx-auto max-w-[620px] rounded-xl border border-hairline bg-surface px-6 py-12 text-center">
        <h1 className="font-display text-lg font-semibold text-ink">
          Live coach is a Pro feature
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-ink-muted">
          The in-call coach records and analyzes call audio, so it is available
          only to firms on the Pro tier with recording consent in place. Contact
          us to enable it for your firm.
        </p>
      </div>
    );
  }
  return <CoachClient />;
}
