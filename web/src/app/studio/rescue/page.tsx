import Link from "next/link";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";
import { openPipelineDb, listFirms } from "../../../../ingest/store.mjs";
import {
  listImportBatches,
  listReviewQueueDetailed,
  listCrmLeads as listCrmLeadsUntyped,
  getRescuePacket,
  getCrmLeadByFlag,
  listLedgerEntries,
} from "../../../../beta/store.mjs";

// The .mjs option defaults (`= null`) infer over-narrow types; widen the one
// call site that passes options — same pattern as api/digest/run.
const listCrmLeads = listCrmLeadsUntyped as unknown as (
  db: unknown,
  firmId: string | number,
  opts?: { batchId?: string | number | null; verdict?: string | null },
) => Promise<unknown[]>;
import { ledgerSummary } from "../../../../rescue/ledger.mjs";
import { RescueConsole } from "./console";
import type { BatchRow, ReviewRow, PacketView, LeadRow, FirmRow, LedgerView } from "./console";

export const dynamic = "force-dynamic";

// The Rescue desk — the layer ABOVE the firm’s CRM cadence.
//
// A cadence fires on elapsed time; it cannot tell a soft-tissue whiff from a
// lost six-figure case. This desk takes the leads the cadence marked dead,
// re-triages them on legal merit (deterministic rules — statute, case type,
// the reasons follow-up stopped), and walks the few live ones through the
// SAME human-review conveyor as call flags: named confirm -> top-3 daily
// list with callback scripts -> tagged CSV back into the firm’s CRM.
// Nothing here contacts a prospect or writes to a live CRM.

const globalDb = globalThis as unknown as { __rescuePageDb?: unknown };
async function db() {
  if (!globalDb.__rescuePageDb) globalDb.__rescuePageDb = await openPipelineDb();
  return globalDb.__rescuePageDb;
}

export default async function RescuePage({
  searchParams,
}: {
  searchParams: Promise<{ firm?: string }>;
}) {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake QA · Studio" title="Rescues — not configured" />
      </PageShell>
    );
  }
  await requireFounderPage();

  const params = await searchParams;
  const handle = await db();

  const firms = ((await listFirms(handle)) ?? []) as FirmRow[];
  const firmId = params.firm ?? firms[0]?.id ?? null;

  let migrationPending = false;
  let batches: BatchRow[] = [];
  let pending: ReviewRow[] = [];
  let screenedOut: LeadRow[] = [];
  let packet: PacketView | null = null;
  let ledger: LedgerView | null = null;

  if (firmId != null) {
    try {
      batches = ((await listImportBatches(handle, firmId)) ?? []) as BatchRow[];
      pending = ((await listReviewQueueDetailed(handle, firmId, "pending")) ?? []) as ReviewRow[];
      screenedOut = ((await listCrmLeads(handle, firmId, { verdict: "screened_out" })) ?? []) as LeadRow[];

      const today = new Date().toISOString().slice(0, 10);
      const raw = (await getRescuePacket(handle, firmId, today)) as PacketView | null;
      if (raw?.items) {
        // Attach each item’s import provenance (tier, gap, CRM ids) for display.
        for (const item of raw.items) {
          const lead = (await getCrmLeadByFlag(handle, item.flag_id)) as Record<string, unknown> | null;
          item.value_tier = (lead?.value_tier as string | undefined) ?? null;
          item.value_tier_basis = (lead?.value_tier_basis as string | undefined) ?? null;
          item.gap_kind = (lead?.gap_kind as string | undefined) ?? null;
          item.external_lead_id = (lead?.external_lead_id as string | undefined) ?? null;
        }
        packet = raw;
      }

      const entries = (await listLedgerEntries(handle, firmId)) ?? [];
      ledger = ledgerSummary(entries) as unknown as LedgerView;
    } catch {
      // The crm_leads tables (migration 0027 / supabase 0035) aren’t in this
      // database yet — render an honest state instead of a broken page.
      migrationPending = true;
    }
  }

  return (
    <PageShell>
      <PageHeader kicker="Intake QA · Studio" title="Rescues">
        <Link href="/studio" className="text-xs text-accent underline hover:text-accent-hover">
          Studio home
        </Link>
      </PageHeader>

      <p className="mb-1 max-w-[74ch] text-sm text-muted">
        The layer above the firm&rsquo;s CRM cadence. The cadence re-touches every lead on a
        timer; it can&rsquo;t tell a soft-tissue whiff from a lost six-figure case. Upload the
        leads it marked dead, and this desk re-reads them on legal merit — statute clock,
        case type, and why the follow-up actually stopped.
      </p>
      <p className="mb-4 max-w-[74ch] text-xs text-faint">
        Every surfaced lead still needs a named human confirmation before it can appear on a
        callback list, the firm&rsquo;s own staff make every call, and nothing here writes to a
        live CRM — the hand-back is a CSV the firm imports themselves.
      </p>

      {firmId == null ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            No firms yet. Add one under <Link href="/studio/onboard-firm" className="text-accent underline">Firms</Link>.
          </CardContent>
        </Card>
      ) : migrationPending ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            The rescue-import tables aren&rsquo;t in this database yet — apply migration
            <code className="mx-1 text-xs">supabase/migrations/0035_crm_rescue_import.sql</code>
            and reload.
          </CardContent>
        </Card>
      ) : (
        <RescueConsole
          firms={firms}
          firmId={String(firmId)}
          batches={batches}
          pending={pending}
          screenedOut={screenedOut}
          packet={packet}
          ledger={ledger}
        />
      )}
    </PageShell>
  );
}
