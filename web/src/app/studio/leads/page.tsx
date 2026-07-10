import Link from "next/link";
import { Pool } from "pg";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { requireFounderPage, isStudioConfigured } from "@/lib/studio/guard";

export const dynamic = "force-dynamic";

// The captured-leads browser: every canonical intake record the chat produced,
// newest first — including abandoned sessions (that's the point: an abandoned
// chat is still a lead). Founder-only; read-only; the review flag reminds that
// AI-captured data stays visually distinct until a human verifies it.
let _pool: Pool | null = null;
function pool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 2,
    });
  }
  return _pool;
}

interface LeadRow {
  id: string;
  matter_type: string;
  bucket: string | null;
  status: string;
  confidence: string | null;
  first_name: string | null;
  phone: string | null;
  narrative: string | null;
  reasons: unknown;
  next_action: string | null;
  consent_version: string | null;
  created_at: string;
  escalation_count: string;
}

const BUCKET_TONE: Record<string, string> = {
  book: "border-accent/40 bg-accent-tint text-accent",
  escalate: "border-red/40 bg-red-tint text-red",
  human_handoff: "border-amber/40 bg-amber-tint text-amber",
  decline: "border-line-strong bg-paper text-muted",
};

export default async function LeadsPage() {
  if (!isStudioConfigured()) {
    return (
      <PageShell>
        <PageHeader kicker="Intake System" title="Leads — not configured" />
      </PageShell>
    );
  }
  await requireFounderPage();

  let rows: LeadRow[] = [];
  if (process.env.DATABASE_URL) {
    const r = await pool().query(
      `select l.id, l.matter_type, l.bucket, l.status, l.confidence,
              l.contact->>'first_name' as first_name, l.contact->>'phone' as phone,
              l.incident->>'narrative' as narrative,
              l.routing->'reasons' as reasons, l.routing->>'next_action' as next_action,
              l.consent_version, l.created_at,
              (select count(*) from escalations e where e.lead_id = l.id) as escalation_count
       from intake_leads l
       order by l.created_at desc
       limit 100`,
    );
    rows = r.rows as LeadRow[];
  }

  return (
    <PageShell>
      <PageHeader kicker="Intake System" title="Leads">
        <Link href="/studio" className="text-xs text-accent underline hover:text-accent-hover">
          Studio home
        </Link>
      </PageHeader>

      <p className="mb-4 max-w-[70ch] text-sm text-muted">
        Every canonical record the intake agent produced — including abandoned sessions,
        which is the point: contact is captured early, so a closed tab is still a lead.
        Everything here is AI-captured and unverified until a person confirms it.
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-6 text-sm text-muted">
            No leads yet. Run the <Link href="/intake-demo" className="text-accent underline">intake demo</Link>.
          </CardContent>
        </Card>
      ) : (
        <ul className="divide-y divide-line rounded-card border border-line bg-paper">
          {rows.map((l) => (
            <li key={l.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {l.bucket ? (
                    <span
                      className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${BUCKET_TONE[l.bucket] ?? ""}`}
                    >
                      {l.bucket.replace("_", " ")}
                    </span>
                  ) : (
                    <span className="rounded-sm border border-line-strong bg-paper px-1.5 py-0.5 text-[10px] font-semibold uppercase text-faint">
                      {l.status === "in_progress" ? "abandoned / open" : l.status}
                    </span>
                  )}
                  <span className="text-sm font-medium text-ink">
                    {l.first_name ?? "—"}
                  </span>
                  <span className="text-xs text-muted tnum">{l.phone ?? "no phone"}</span>
                  <span className="text-xs text-faint">{l.matter_type}</span>
                </div>
                <span className="text-[11px] text-faint tnum">
                  {new Date(l.created_at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {Number(l.escalation_count) > 0 ? ` · ${l.escalation_count} escalation(s)` : ""}
                  {l.consent_version ? " · consented" : ""}
                </span>
              </div>
              {l.narrative ? (
                <p className="mt-1 line-clamp-2 max-w-[80ch] text-xs text-muted">
                  “{l.narrative}”
                </p>
              ) : null}
              {l.next_action ? (
                <p className="mt-0.5 text-[11px] text-faint">Next: {l.next_action}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
