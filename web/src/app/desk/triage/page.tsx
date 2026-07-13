// /desk/triage — the LIVE triage screen. This is the day-to-day surface: an
// intake specialist enters what they heard on a call and gets an instant grade,
// the one reason, the one fact that would change it, and the filing-deadline
// clock. Cases save into a prioritized "call these first" queue with disposition
// tracking. Deterministic and instant (no LLM, no cost).
//
// Firm-scoped like every desk page. Degrades to a friendly panel with no DB.
import { resolveDeskFirm } from "@/lib/desk/firm";
import { triageQueueSort } from "@/lib/desk/triage-view.mjs";
import { TriageConsole } from "@/components/desk/TriageConsole";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Live triage — Intake QA" };

// The desk layout already provides <main> + width + padding; this is just a
// passthrough so the degraded branches and the happy path share one wrapper.
function Shell({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

export default async function TriagePage() {
  const store = await import("../../../../ingest/store.mjs");
  let db;
  try {
    db = await store.openPipelineDb();
  } catch {
    return (
      <Shell>
        <TriageConsole caseTypes={FALLBACK_TYPES} profile={{}} initialQueue={[]} disabled />
      </Shell>
    );
  }
  try {
    const firm = await resolveDeskFirm(db, store.listFirms);
    if (!firm) {
      return (
        <Shell>
          <TriageConsole caseTypes={FALLBACK_TYPES} profile={{}} initialQueue={[]} disabled />
        </Shell>
      );
    }
    let rows: Record<string, unknown>[] = [];
    let profile: Record<string, unknown> = {};
    try {
      rows = (await store.listTriageCases(db, firm.id, { limit: 100 })) as Record<string, unknown>[];
      const p = await store.getFirmTriageProfile(db, firm.id);
      profile = normalizeProfile(p as Record<string, unknown> | null);
    } catch {
      // tables not migrated yet — show the console empty rather than error.
    }
    const caseTypes = await loadCaseTypes();
    return (
      <Shell>
        <TriageConsole
          caseTypes={caseTypes}
          profile={profile}
          initialQueue={triageQueueSort(rows)}
        />
      </Shell>
    );
  } finally {
    await store.closePipelineDb(db);
  }
}

function normalizeProfile(row: Record<string, unknown> | null) {
  if (!row) return {};
  let accepted: string[] | null = null;
  if (typeof row.accepted_case_types === "string") {
    try {
      const v = JSON.parse(row.accepted_case_types);
      accepted = Array.isArray(v) ? v : null;
    } catch {
      accepted = null;
    }
  } else if (Array.isArray(row.accepted_case_types)) {
    accepted = row.accepted_case_types as string[];
  }
  return {
    posture: row.posture ?? "selective",
    accepted_case_types: accepted,
    take_mist: row.take_mist == null ? null : Boolean(row.take_mist),
    cost_fronting: row.cost_fronting ?? "moderate",
    trial_capital: Boolean(row.trial_capital),
    min_policy_limits: row.min_policy_limits ?? null,
    red_flag_strictness: row.red_flag_strictness ?? "balanced",
  };
}

async function loadCaseTypes(): Promise<Array<{ id: string; label: string }>> {
  try {
    const mod = await import("@/lib/desk/triage-engine.mjs");
    return await mod.triageCaseTypes();
  } catch {
    return FALLBACK_TYPES;
  }
}

const FALLBACK_TYPES: Array<{ id: string; label: string }> = [
  { id: "mva_standard", label: "Car accident" },
  { id: "motorcycle", label: "Motorcycle accident" },
  { id: "pedestrian_bicycle", label: "Pedestrian / bicycle" },
  { id: "trucking", label: "Truck / commercial vehicle" },
  { id: "rideshare", label: "Rideshare (Uber / Lyft)" },
  { id: "premises", label: "Slip / trip / premises" },
  { id: "dog_bite", label: "Dog bite" },
  { id: "product", label: "Defective product" },
  { id: "med_mal", label: "Medical malpractice" },
  { id: "nursing_home", label: "Nursing home / elder abuse" },
  { id: "work_injury", label: "Work injury" },
  { id: "dram_shop", label: "Bar / over-serving (dram shop)" },
  { id: "wrongful_death", label: "Wrongful death" },
  { id: "other_pi", label: "Other injury" },
];
