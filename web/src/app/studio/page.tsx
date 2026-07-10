import Link from "next/link";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { listFirms, type StudioFirm } from "@/lib/studio/data";
import { NewLeakAudit } from "./new-leak-audit";

export const dynamic = "force-dynamic";

// The Spot Check Studio home. Founder-only (guarded here AND in middleware AND by
// RLS). The audio-upload action is deliberately front-and-center — it is the
// primary thing the founder does here.
export default async function StudioHome() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Spot Check Studio" title="Not configured" />
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
      <PageHeader kicker="Spot Check Studio" title="New Leak Audit">
        <div className="flex items-center gap-3">
          <Link
            href="/studio/shops"
            className="text-xs text-accent underline hover:text-accent-hover"
          >
            Mystery-shop audits (The Mirror)
          </Link>
          <span className="text-xs text-faint">Founder-only</span>
        </div>
      </PageHeader>

      {/* PRIMARY action: upload the firm's calls. Front-and-center by design. */}
      <NewLeakAudit firms={firms} />

      {/* The intake-system cockpit: every founder surface, one hop away. */}
      <div className="mt-8">
        <h2 className="eyebrow mb-3">Intake system</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              href: "/studio/shops",
              title: "The Mirror",
              desc: "Mystery-shop audits — grade each intake channel, print the firm-facing report.",
            },
            {
              href: "/intake-demo",
              title: "Intake agent demo",
              desc: "The consent-first chat walking the full qualification tree. Show this to firms.",
            },
            {
              href: "/studio/escalations",
              title: "Escalations",
              desc: "Every fired trigger, hottest first. Ack, action, resolve — named. Run the sweep.",
            },
            {
              href: "/studio/ledger",
              title: "The Ledger",
              desc: "The monthly receipt — captures, catches, SLA including misses. Printable.",
            },
            {
              href: "/studio/tuning",
              title: "Tuning",
              desc: "The loop's proposals with their precision math. You approve by name; nothing tunes itself.",
            },
          ].map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-card border border-line bg-paper p-4 transition-colors hover:border-accent"
            >
              <div className="text-sm font-semibold text-ink">{c.title}</div>
              <div className="mt-1 text-xs leading-relaxed text-muted">{c.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <h2 className="eyebrow mb-3">Firms</h2>
        {firms.length === 0 ? (
          <p className="text-sm text-muted">
            No firms yet. Add one above to start a spot check.
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line bg-paper">
            {firms.map((f) => (
              <li key={f.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-ink">{f.name}</div>
                  {f.website ? (
                    <div className="text-xs text-faint">{f.website}</div>
                  ) : null}
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
      </div>
    </PageShell>
  );
}
