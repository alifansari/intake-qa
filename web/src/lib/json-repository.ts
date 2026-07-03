import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import {
  CallMeta,
  Outcome,
  ScoredCall,
  defaultOutcome,
} from "./schema";
import type { OutcomePatch, Repository } from "./repository";

// ---------------------------------------------------------------------------
// JsonFileRepository — the only adapter for the demo. Reads scored calls from
// local JSON, reads/writes outcomes to data/outcomes.json. No database, no auth.
//
// Sources of scored calls:
//   1. SEED   — web/data/scored-calls/*.json  (baked in, deploys to Vercel)
//   2. REAL   — <repo>/output/*.score.json    (the actual CLI output, if present
//               locally). Skipped silently in deploy where output/ doesn't ship.
//
// Every file is validated with Zod; anything that fails is skipped with a
// console warning rather than crashing the demo (it must never break live).
// ---------------------------------------------------------------------------

const DATA_DIR = path.join(process.cwd(), "data");
const SEED_CALLS_DIR = path.join(DATA_DIR, "scored-calls");
const OUTCOMES_FILE = path.join(DATA_DIR, "outcomes.json");
const META_FILE = path.join(DATA_DIR, "call-meta.json");
// The sibling CLI's output folder (web/ lives one level below the repo root).
const REAL_OUTPUT_DIR = path.join(process.cwd(), "..", "output");

async function readJsonFilesFrom(dir: string): Promise<unknown[]> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return []; // directory absent (e.g. output/ not deployed) — that's fine
  }
  const out: unknown[] = [];
  for (const name of names) {
    if (!name.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(dir, name), "utf8");
      out.push(JSON.parse(raw));
    } catch (err) {
      console.warn(`[JsonFileRepository] could not parse ${name}:`, err);
    }
  }
  return out;
}

export class JsonFileRepository implements Repository {
  async getScoredCalls(): Promise<ScoredCall[]> {
    const seed = await readJsonFilesFrom(SEED_CALLS_DIR);
    const real = await readJsonFilesFrom(REAL_OUTPUT_DIR);
    const byId = new Map<string, ScoredCall>();
    for (const candidate of [...seed, ...real]) {
      const parsed = ScoredCall.safeParse(candidate);
      if (!parsed.success) {
        console.warn("[JsonFileRepository] skipping invalid scored call:", parsed.error.issues[0]);
        continue;
      }
      byId.set(parsed.data.call_id, parsed.data); // real overrides seed on id clash
    }
    return [...byId.values()];
  }

  async getCallMeta(): Promise<CallMeta[]> {
    try {
      const raw = await fs.readFile(META_FILE, "utf8");
      const arr = JSON.parse(raw);
      return CallMeta.array().parse(arr);
    } catch {
      return [];
    }
  }

  async getOutcomes(): Promise<Outcome[]> {
    try {
      const raw = await fs.readFile(OUTCOMES_FILE, "utf8");
      const arr = JSON.parse(raw);
      // Parse leniently: skip any single malformed record.
      const out: Outcome[] = [];
      for (const item of Array.isArray(arr) ? arr : []) {
        const parsed = Outcome.safeParse(item);
        if (parsed.success) out.push(parsed.data);
      }
      return out;
    } catch {
      return [];
    }
  }

  async upsertOutcome(callId: string, patch: OutcomePatch): Promise<Outcome> {
    const outcomes = await this.getOutcomes();
    const idx = outcomes.findIndex((o) => o.call_id === callId);
    const prev = idx >= 0 ? outcomes[idx] : defaultOutcome(callId);

    const next: Outcome = {
      call_id: callId,
      outcome_code: patch.outcome_code,
      callback_made: patch.callback_made ?? prev.callback_made,
      callback_timestamp: patch.callback_timestamp ?? prev.callback_timestamp,
      time_to_callback_hours:
        patch.time_to_callback_hours ?? prev.time_to_callback_hours,
      who_called: patch.who_called ?? prev.who_called,
      realized_fee_recovered:
        patch.realized_fee_recovered ?? prev.realized_fee_recovered,
      outcome_entered_by: patch.outcome_entered_by ?? "demo-user",
      outcome_entered_at: new Date().toISOString(),
      outcome_version: prev.outcome_version + 1,
      // Keep prior snapshots for auditability.
      edits: [
        ...prev.edits,
        {
          outcome_code: prev.outcome_code,
          callback_made: prev.callback_made,
          outcome_entered_by: prev.outcome_entered_by,
          outcome_entered_at: prev.outcome_entered_at,
          outcome_version: prev.outcome_version,
        },
      ],
    };

    const updated = idx >= 0
      ? outcomes.map((o) => (o.call_id === callId ? next : o))
      : [...outcomes, next];

    // Best-effort persist. On a read-only serverless FS (Vercel) this throws;
    // we swallow it so the demo still returns the computed record and the UI
    // updates optimistically. The write works in local dev (acceptance #5).
    try {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(OUTCOMES_FILE, JSON.stringify(updated, null, 2) + "\n");
    } catch (err) {
      console.warn("[JsonFileRepository] outcome not persisted (read-only fs?):", err);
    }

    return next;
  }
}

// Single shared instance for the app.
export const repo: Repository = new JsonFileRepository();
