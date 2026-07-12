// POST /api/rescue/run — founder-only console runner for the CRM dead-lead
// rescue layer. Nothing here contacts a prospect or writes to a live CRM:
// import + triage + review + packet are internal; the outbound leg is a CSV
// download the firm re-imports themselves (live CRM writes stay behind the
// per-integration sign-off gate in ROADMAP.md).
//
// Actions:
//   { action: "import", firmId, crm, csvText, filename?, importedBy }
//   { action: "review", reviewItemId, decision: "confirm"|"reject", reviewer,
//     reason?, firmId }
//   { action: "packet", firmId }        → build (or return) today's packet
//   { action: "export", firmId }        → today's packet as a tagged CSV (text/csv)
//   { action: "callback", firmId, flagId, employeeName, outcome?, note? }
import { z } from "zod";
import { requireFounderRoute } from "@/lib/studio/guard";
import { openPipelineDb } from "../../../../../ingest/store.mjs";
import { importDeadLeads as importDeadLeadsUntyped, CRM_KEYS } from "../../../../../rescue/import.mjs";

// The .mjs module's inferred types are too narrow (defaults like `= null`);
// give the call site an explicit shape, same pattern as api/digest/run.
const importDeadLeads = importDeadLeadsUntyped as unknown as (opts: {
  db: unknown;
  firmId: string | number;
  csvText: string;
  crm: string;
  filename?: string | null;
  importedBy: string;
}) => Promise<{
  batchId: unknown;
  rows: number;
  surfaced: number;
  needsInfo: number;
  screenedOut: number;
  skipped: number;
  screenReasons: { reason: string; count: number }[];
}>;
import { confirmFlag, rejectFlag as rejectFlagUntyped } from "../../../../../rescue/review.mjs";
import { buildDailyPacket as buildDailyPacketUntyped } from "../../../../../rescue/packet.mjs";

const buildDailyPacket = buildDailyPacketUntyped as unknown as (opts: {
  db: unknown;
  firmId: string | number;
  date?: string;
}) => Promise<{
  empty?: boolean;
  packet_date?: string;
  items?: Array<Record<string, unknown>>;
  [k: string]: unknown;
}>;
import { recordCallback as recordCallbackUntyped } from "../../../../../rescue/callback-audit.mjs";

const rejectFlag = rejectFlagUntyped as unknown as (opts: {
  db: unknown;
  reviewItemId: string | number;
  reviewer: string;
  reason?: string | null;
  firmId?: string | number | null;
}) => Promise<{ state: string }>;

const recordCallback = recordCallbackUntyped as unknown as (opts: {
  db: unknown;
  firmId: string | number;
  flagId?: string | number | null;
  employeeName: string;
  outcome?: string | null;
  note?: string | null;
}) => Promise<{ entryId: unknown; ledgerAdvanced: boolean }>;
import { rescueListToCrmCsv } from "../../../../../rescue/crm-export.mjs";
import { getCrmLeadByFlag, getLedgerEntryByFlag } from "../../../../../beta/store.mjs";

export const runtime = "nodejs";

const Body = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("import"),
    firmId: z.union([z.string(), z.number()]),
    crm: z.enum(CRM_KEYS as unknown as [string, ...string[]]),
    csvText: z.string().min(1).max(2_000_000),
    filename: z.string().max(200).optional(),
    importedBy: z.string().min(1).max(120),
  }),
  z.object({
    action: z.literal("review"),
    firmId: z.union([z.string(), z.number()]),
    reviewItemId: z.union([z.string(), z.number()]),
    decision: z.enum(["confirm", "reject"]),
    reviewer: z.string().min(1).max(120),
    reason: z.string().max(500).optional(),
  }),
  z.object({ action: z.literal("packet"), firmId: z.union([z.string(), z.number()]) }),
  z.object({ action: z.literal("export"), firmId: z.union([z.string(), z.number()]) }),
  z.object({
    action: z.literal("callback"),
    firmId: z.union([z.string(), z.number()]),
    flagId: z.union([z.string(), z.number()]),
    employeeName: z.string().min(1).max(120),
    outcome: z.enum(["reached", "voicemail", "booked_consult", "declined", "bad_number"]).optional(),
    note: z.string().max(500).optional(),
  }),
]);

// One pipeline handle per server process (sqlite locally, pg Pool when
// DATABASE_URL is set) — same pattern as the crm/run mock singleton.
const globalDb = globalThis as unknown as { __rescueDb?: unknown };
async function db() {
  if (!globalDb.__rescueDb) globalDb.__rescueDb = await openPipelineDb();
  return globalDb.__rescueDb;
}

export async function POST(req: Request) {
  const gate = await requireFounderRoute();
  if (gate instanceof Response) return gate;

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }

  try {
    const handle = await db();

    if (body.action === "import") {
      const result = await importDeadLeads({
        db: handle,
        firmId: body.firmId,
        csvText: body.csvText,
        crm: body.crm,
        filename: body.filename ?? null,
        importedBy: body.importedBy,
      });
      return Response.json(result);
    }

    if (body.action === "review") {
      if (body.decision === "confirm") {
        await confirmFlag({ db: handle, reviewItemId: body.reviewItemId, reviewer: body.reviewer });
        return Response.json({ state: "confirmed" });
      }
      await rejectFlag({
        db: handle,
        reviewItemId: body.reviewItemId,
        reviewer: body.reviewer,
        reason: body.reason ?? "not_a_real_case",
        firmId: body.firmId,
      });
      return Response.json({ state: "rejected" });
    }

    if (body.action === "packet") {
      const packet = await buildDailyPacket({ db: handle, firmId: body.firmId });
      return Response.json(packet);
    }

    if (body.action === "export") {
      const packet = await buildDailyPacket({ db: handle, firmId: body.firmId });
      if (!packet || (packet as { empty?: boolean }).empty) {
        return Response.json({ error: "no packet to export — confirm candidates first" }, { status: 404 });
      }
      const items = [];
      for (const item of (packet as { items: Array<Record<string, unknown>> }).items) {
        const crmLead = await getCrmLeadByFlag(handle, item.flag_id);
        const ledger = await getLedgerEntryByFlag(handle, item.flag_id);
        items.push({
          ...item,
          external_lead_id: crmLead?.external_lead_id ?? null,
          value_tier: crmLead?.value_tier ?? null,
          value_tier_basis: crmLead?.value_tier_basis ?? null,
          gap_kind: crmLead?.gap_kind ?? null,
          rescue_tag: ledger?.rescue_tag ?? null,
        });
      }
      const csv = rescueListToCrmCsv(items);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="rescue-list-${(packet as { packet_date?: string }).packet_date ?? "today"}.csv"`,
        },
      });
    }

    const result = await recordCallback({
      db: handle,
      firmId: body.firmId,
      flagId: body.flagId,
      employeeName: body.employeeName,
      outcome: body.outcome ?? null,
      note: body.note ?? null,
    });
    return Response.json(result);
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : "rescue run failed" },
      { status: 500 },
    );
  }
}
