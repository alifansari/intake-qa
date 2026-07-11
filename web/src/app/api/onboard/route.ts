// POST /api/onboard — finish the onboarding wizard.
// Validates the firm answers + the SMS template pack (the pack must pass the SAME
// compliance guard the send chokepoint enforces), then BEST-EFFORT persists the
// firm + a versioned, approved template pack. Persistence failure (e.g. a
// read-only serverless fs on the pilot) never blocks onboarding — the generated
// firm-config markdown + validation always come back. Nothing here can send: a
// new firm's kill_switch defaults ON and TEST_MODE stays on until A2P approval.

import { z } from "zod";
import {
  openPipelineDb,
  closePipelineDb,
  createFirm,
  saveTemplateVersion,
  logError,
} from "../../../../ingest/store.mjs";
import {
  normalizeFirmInput,
  buildFirmConfigMarkdown,
} from "../../../../onboarding/firm-config.mjs";
import {
  parseTemplatePack,
  validateTemplatePack,
} from "../../../../onboarding/template-pack.mjs";

export const runtime = "nodejs";

const Body = z.object({
  firm: z.object({
    name: z.string().min(1),
    timezone: z.string().optional(),
    subscriptionPrice: z.union([z.number(), z.string()]).nullish(),
    accepted: z
      .array(z.object({ key: z.string(), fee: z.union([z.number(), z.string()]).optional() }))
      .default([]),
  }),
  templatesText: z.string().min(1),
  approvedBy: z.string().optional(),
  complianceAcknowledged: z.boolean(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return Response.json({ error: "missing or invalid fields" }, { status: 422 });
  }
  const { firm: firmInput, templatesText, approvedBy, complianceAcknowledged } = parsed.data;

  // Compliance acknowledgement is mandatory — the operator must confirm they
  // understand PILOT MODE (a human approves every text; nothing sends yet).
  if (!complianceAcknowledged) {
    return Response.json(
      { error: "You must acknowledge the pilot compliance terms to continue." },
      { status: 422 },
    );
  }

  // Normalize firm answers (throws on no name / no accepted case types).
  let firm;
  try {
    firm = normalizeFirmInput(firmInput);
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 422 });
  }

  // The template pack must pass the compliance guard for THIS firm's name.
  const validation = validateTemplatePack(templatesText, { firmName: firm.name });
  if (!validation.valid) {
    return Response.json(
      { error: "Your message templates need changes before they can be approved.", validation },
      { status: 422 },
    );
  }

  const pack = parseTemplatePack(templatesText);
  const configMarkdown = buildFirmConfigMarkdown(firm);

  // Best-effort persistence. On a read-only pilot fs this can fail; we still
  // return the generated config so onboarding is never a dead end.
  let firmId: number | string | null = null;
  let version: number | null = null;
  let persisted = false;
  const db = await openPipelineDb();
  try {
    firmId = await createFirm(db, {
      name: firm.name,
      avg_case_fee: firm.avgCaseFee,
      timezone: firm.timezone,
      subscription_price: firm.subscriptionPrice,
    });
    const saved = await saveTemplateVersion(db, {
      firm_id: firmId,
      pack,
      approved_by: approvedBy ?? null,
    });
    version = saved.version;
    persisted = true;
  } catch (e) {
    // Persistence is best-effort in the pilot — never block onboarding. But do
    // record it so an operator can see it on /admin/status (logging is itself
    // best-effort and must never throw).
    try {
      await logError(db, {
        source: "api.onboard",
        message: `onboarding persistence failed: ${(e as Error)?.message ?? e}`,
        firm_id: typeof firmId === "number" ? firmId : null,
      });
    } catch {
      // ignore — a logging failure can't be allowed to break the response
    }
  } finally {
    await closePipelineDb(db);
  }

  return Response.json({
    ok: true,
    persisted,
    firmId,
    version,
    templateCount: validation.count,
    configMarkdown,
  });
}
