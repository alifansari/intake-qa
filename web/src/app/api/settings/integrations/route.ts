// Firm integration settings: save a provider config (credentials encrypted at
// rest) or send a test event. Login-gated when Supabase is configured. Thin —
// delegates encryption to integrations/crypto.mjs and delivery to the connector.

import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import * as store from "../../../../../ingest/store.mjs";
import { encryptSecret, encryptionAvailable } from "../../../../../integrations/crypto.mjs";
import { dispatch } from "../../../../../integrations/connector.mjs";

export const runtime = "nodejs";

const Body = z.object({
  action: z.enum(["save", "test"]),
  firm_id: z.union([z.string(), z.number()]),
  provider: z.enum(["leaddocket", "filevine", "webhook"]),
  credentials: z.string().optional(),
  field_map: z.string().optional(),
  webhook_url: z.string().url().optional().or(z.literal("")),
  webhook_secret: z.string().optional(),
  enabled: z.boolean().optional(),
});

export async function POST(req: Request) {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation failed", issues: parsed.error.issues }, { status: 422 });
  }
  const b = parsed.data;

  if (!store.pipelineDbConfigured()) {
    return NextResponse.json({ error: "database not configured" }, { status: 503 });
  }

  const db = await store.openPipelineDb();
  try {
    if (b.action === "save") {
      let credentials_encrypted: string | null = null;
      if (b.credentials) {
        if (!encryptionAvailable()) {
          return NextResponse.json(
            { error: "INTEGRATIONS_ENC_KEY not configured — cannot store credentials securely" },
            { status: 503 },
          );
        }
        credentials_encrypted = encryptSecret(b.credentials);
      }
      const saved = await store.upsertFirmIntegration(db, {
        firm_id: b.firm_id,
        provider: b.provider,
        credentials_encrypted,
        field_map: b.field_map ?? null,
        webhook_url: b.webhook_url || null,
        webhook_secret: b.webhook_secret ?? null,
        enabled: b.enabled ?? false,
      });
      // Never return the stored ciphertext to the client.
      return NextResponse.json({
        ok: true,
        integration: { provider: saved.provider, enabled: Boolean(saved.enabled) },
      });
    }

    // action === "test": send a sample flag.created event through the connector.
    const integration = await store.getFirmIntegration(db, b.firm_id, b.provider);
    if (!integration) return NextResponse.json({ error: "not configured" }, { status: 404 });
    const res = await dispatch({
      integration,
      event: "flag.created",
      payload: {
        call: { id: "test", external_call_id: "test" },
        flag: { qualification_score: 90, is_leaked_signable: 1, reason: "Test event from Intake QA" },
      },
    });
    return NextResponse.json({ ok: true, result: res });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "settings action failed";
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await store.closePipelineDb(db).catch(() => {});
  }
}
