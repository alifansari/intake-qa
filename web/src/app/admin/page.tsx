import Link from "next/link";
import { PageShell, PageHeader } from "@/components/page";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";

export const dynamic = "force-dynamic";

// /admin used to 404 while its four child consoles sat unlinked — the founder
// had to remember the URLs. This index makes "System" a real place.
const CONSOLES = [
  {
    href: "/admin/status",
    title: "Operator status",
    desc: "The readiness board: kill switches, TEST_MODE, pending work, recent errors. Read-only.",
  },
  {
    href: "/admin/audits",
    title: "Leak Audit console",
    desc: "Every audit session: review, release reports, see what visitors uploaded.",
  },
  {
    href: "/admin/billing",
    title: "Billing console",
    desc: "Invoices and billing state per firm.",
  },
  {
    href: "/admin/features",
    title: "Feature flags",
    desc: "Per-firm entitlements and flags (e.g. Live coach).",
  },
];

export default async function AdminIndexPage() {
  if (isStudioConfigured()) await requireFounderPage();
  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio" title="System" />
      <p className="max-w-[60ch] text-sm text-muted">
        The operator consoles. Check <span className="font-medium">Operator status</span> first —
        it answers &ldquo;is everything safe and running?&rdquo; in one screen.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CONSOLES.map((c) => (
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
    </PageShell>
  );
}
