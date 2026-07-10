import "server-only";
import { Pool } from "pg";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Canonical-record persistence (migration 0025). Server-only writes — the
// intake tables have NO public write policy; this module connects with
// DATABASE_URL (Postgres) which bypasses RLS the same way the service role
// does. When DATABASE_URL is absent the demo still runs — the chat works
// in-browser and persistence reports {stored:false} (graceful degradation,
// same stance as the rest of the repo).
//
// Zod validates the record at the boundary: the browser drives the tree, but
// the server never trusts the shape it receives.
// ---------------------------------------------------------------------------

const DATABASE_URL = process.env.DATABASE_URL;

export function isIntakeStoreConfigured(): boolean {
  return Boolean(DATABASE_URL);
}

let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 3,
    });
  }
  return _pool;
}

const EventSchema = z.object({
  seq: z.number().int().nonnegative(),
  kind: z.string().max(40),
  payload: z.record(z.string(), z.unknown()).default({}),
  at: z.string().max(40),
});

export const RecordSchema = z.object({
  channel: z.enum(["website_chat", "phone", "web_form", "manual"]).default("website_chat"),
  matter_type: z.enum(["mva", "premises", "dog_bite", "other", "unknown"]).default("unknown"),
  bucket: z.enum(["book", "escalate", "human_handoff", "decline"]).nullable().default(null),
  status: z.enum(["in_progress", "abandoned", "complete"]).default("in_progress"),
  confidence: z.number().min(0).max(1).nullable().default(null),
  contact: z.record(z.string(), z.unknown()).default({}),
  incident: z.record(z.string(), z.unknown()).default({}),
  path_data: z.record(z.string(), z.unknown()).default({}),
  routing: z.record(z.string(), z.unknown()).default({}),
  provenance: z.record(z.string(), z.unknown()).default({}),
  review: z.record(z.string(), z.unknown()).default({ verified: false }),
  consent_version: z.string().max(80).nullable().default(null),
  consent_at: z.string().max(40).nullable().default(null),
  events: z.array(EventSchema).max(300).default([]),
});

export type IntakeRecordInput = z.infer<typeof RecordSchema>;

// Upsert the lead row + append any new events. `leadId` null on first save.
// Returns the lead id. Events are append-only: (lead_id, seq) conflicts are
// ignored so re-sending a snapshot never duplicates or rewrites history.
export async function saveLeadSnapshot(
  leadId: string | null,
  record: IntakeRecordInput,
): Promise<{ leadId: string }> {
  const p = pool();
  const cols = {
    channel: record.channel,
    matter_type: record.matter_type,
    bucket: record.bucket,
    status: record.status,
    confidence: record.confidence,
    contact: JSON.stringify(record.contact),
    incident: JSON.stringify(record.incident),
    path_data: JSON.stringify(record.path_data),
    routing: JSON.stringify(record.routing),
    provenance: JSON.stringify(record.provenance),
    review: JSON.stringify(record.review),
    tree_version: (record.provenance as { tree_version?: string }).tree_version ?? null,
    consent_version: record.consent_version,
    consent_at: record.consent_at,
  };

  let id = leadId;
  if (id) {
    await p.query(
      `update intake_leads set
         channel=$2, matter_type=$3, bucket=$4, status=$5, confidence=$6,
         contact=$7::jsonb, incident=$8::jsonb, path_data=$9::jsonb, routing=$10::jsonb,
         provenance=$11::jsonb, review=$12::jsonb, tree_version=$13,
         consent_version=$14, consent_at=$15::timestamptz, updated_at=now()
       where id=$1`,
      [
        id,
        cols.channel, cols.matter_type, cols.bucket, cols.status, cols.confidence,
        cols.contact, cols.incident, cols.path_data, cols.routing,
        cols.provenance, cols.review, cols.tree_version,
        cols.consent_version, cols.consent_at,
      ],
    );
  } else {
    const r = await p.query(
      `insert into intake_leads
         (channel, matter_type, bucket, status, confidence, contact, incident,
          path_data, routing, provenance, review, tree_version, consent_version, consent_at)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,$10::jsonb,$11::jsonb,$12,$13,$14::timestamptz)
       returning id`,
      [
        cols.channel, cols.matter_type, cols.bucket, cols.status, cols.confidence,
        cols.contact, cols.incident, cols.path_data, cols.routing,
        cols.provenance, cols.review, cols.tree_version,
        cols.consent_version, cols.consent_at,
      ],
    );
    id = r.rows[0].id as string;
  }

  // Append-only event inserts; existing (lead_id, seq) rows are never touched.
  for (const e of record.events) {
    await p.query(
      `insert into intake_lead_events (lead_id, seq, kind, payload)
       values ($1,$2,$3,$4::jsonb)
       on conflict (lead_id, seq) do nothing`,
      [id, e.seq, e.kind, JSON.stringify(e.payload ?? {})],
    );
  }

  return { leadId: id };
}

export async function recordAttachment(
  leadId: string,
  input: { storage_path: string; original_filename: string; content_type?: string; size_bytes?: number },
): Promise<void> {
  await pool().query(
    `insert into intake_attachments (lead_id, storage_path, original_filename, content_type, size_bytes)
     values ($1,$2,$3,$4,$5)`,
    [leadId, input.storage_path, input.original_filename, input.content_type ?? null, input.size_bytes ?? null],
  );
}
