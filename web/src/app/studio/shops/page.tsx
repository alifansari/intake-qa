import Link from "next/link";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { listFirms, type StudioFirm } from "@/lib/studio/data";
import { listShops, type StudioShop } from "@/lib/studio/shops-data";
import { NewShop } from "./new-shop";

export const dynamic = "force-dynamic";

// "The Mirror" — mystery-shop audits home. Founder-only (guarded here AND in
// middleware AND by RLS). Lists every shop and starts a new one.
export default async function ShopsHome() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Spot Check Studio · The Mirror" title="Not configured" />
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
  let shops: StudioShop[] = [];
  try {
    [firms, shops] = await Promise.all([listFirms(supabase), listShops(supabase)]);
  } catch {
    // Graceful degradation if migration 0024 hasn't been applied yet.
  }
  const firmName = new Map(firms.map((f) => [f.id, f.name]));

  return (
    <PageShell>
      <PageHeader kicker="Spot Check Studio · The Mirror" title="Mystery-shop audits">
        <Link href="/studio" className="text-xs text-accent underline hover:text-accent-hover">
          Studio home
        </Link>
      </PageHeader>

      <NewShop firms={firms} />

      <div className="mt-8">
        <h2 className="eyebrow mb-3">Shops</h2>
        {shops.length === 0 ? (
          <p className="text-sm text-muted">
            No shops yet. Start one above — pick the firm, then log each channel attempt
            (after-hours call, weekend call, web form, website chat).
          </p>
        ) : (
          <ul className="divide-y divide-line rounded-card border border-line bg-paper">
            {shops.map((s) => (
              <li key={s.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <div className="text-sm font-medium text-ink">
                    {firmName.get(s.firm_id) ?? "Firm"}
                  </div>
                  <div className="text-xs text-faint">
                    {s.status === "final" ? `Final · ${s.ref_code ?? ""}` : "Draft"}
                    {s.market ? ` · ${s.market}` : ""}
                  </div>
                </div>
                <div className="flex gap-3">
                  <Link
                    href={`/studio/shops/${s.id}`}
                    className="text-xs text-accent underline hover:text-accent-hover"
                  >
                    Edit
                  </Link>
                  <Link
                    href={`/studio/shops/${s.id}/report`}
                    className="text-xs text-accent underline hover:text-accent-hover"
                  >
                    Report
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
