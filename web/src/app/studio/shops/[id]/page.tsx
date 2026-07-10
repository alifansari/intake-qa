import Link from "next/link";
import { notFound } from "next/navigation";
import { PageShell, PageHeader } from "@/components/page";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { getFirm } from "@/lib/studio/data";
import {
  getShop,
  listShopChannels,
  listBenchmarkMarkets,
} from "@/lib/studio/shops-data";
import { ShopEditor } from "./editor";

export const dynamic = "force-dynamic";

// Mystery-shop editor page. Founder-only. Loads the shop + its channel rows +
// the known benchmark markets (for the market picker) and hands off to the
// client editor.
export default async function ShopEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!isStudioConfigured()) return notFound();
  const { id } = await params;
  const { supabase } = await requireFounderPage();
  const shop = await getShop(supabase, id);
  if (!shop) return notFound();
  const [firm, channels, markets] = await Promise.all([
    getFirm(supabase, shop.firm_id),
    listShopChannels(supabase, id),
    listBenchmarkMarkets(supabase).catch(() => [] as string[]),
  ]);

  return (
    <PageShell>
      <PageHeader
        kicker="Intake QA · Studio · Mystery shop"
        title={`Mystery shop — ${firm?.name ?? "Firm"}`}
      >
        <div className="flex gap-3">
          <Link
            href="/studio/shops"
            className="text-xs text-accent underline hover:text-accent-hover"
          >
            All shops
          </Link>
          <Link
            href={`/studio/shops/${id}/report`}
            className="text-xs text-accent underline hover:text-accent-hover"
          >
            View report
          </Link>
        </div>
      </PageHeader>
      <ShopEditor
        initial={shop}
        initialChannels={channels}
        firmName={firm?.name ?? "Firm"}
        knownMarkets={markets}
      />
    </PageShell>
  );
}
