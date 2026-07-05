// Operator audit console — a read-only list of Leak Audit sessions so the
// operator can follow up on hot audits (who ran one, how many calls, how much
// leakage found, a link to the report). Matches the /admin/status style; reads
// through the facade, degrades gracefully with no DB.

import { PageShell, PageHeader, SectionTitle } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { money } from "@/lib/format";
import type { AuditReport } from "@/lib/audit-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Audit console — Intake QA" };

type SessionRow = {
  token: string;
  email: string | null;
  status: string;
  call_count: number | string;
  leakage: number | null;
  created_at: string;
};

async function loadSessions(): Promise<
  { connected: true; sessions: SessionRow[] } | { connected: false }
> {
  try {
    const store = await import("../../../../ingest/store.mjs");
    const { buildAuditReport } = await import("../../../../ingest/audit.mjs");
    if (!store.pipelineDbConfigured()) return { connected: false };
    const db = await store.openPipelineDb();
    try {
      const rows = await store.listRecentAuditSessions(db, 50);
      const sessions: SessionRow[] = await Promise.all(
        rows.map(
          async (r: {
            token: string;
            email: string | null;
            status: string;
            call_count: number | string;
            created_at: string;
          }) => {
            let leakage: number | null = null;
            try {
              const rep = (await buildAuditReport({ db, token: r.token })) as AuditReport;
              if (rep.ok && rep.summary) leakage = rep.summary.projectedMonthlyLeakage;
            } catch {
              /* leave null */
            }
            return {
              token: r.token,
              email: r.email ?? null,
              status: r.status,
              call_count: r.call_count,
              leakage,
              created_at: r.created_at,
            };
          },
        ),
      );
      return { connected: true, sessions };
    } finally {
      await store.closePipelineDb(db);
    }
  } catch {
    return { connected: false };
  }
}

export default async function AdminAuditsPage() {
  const state = await loadSessions();

  return (
    <PageShell>
      <PageHeader kicker="Operator" title="Leak Audit console" />
      <Card>
        <CardContent className="pt-5">
          <SectionTitle>Recent audits</SectionTitle>
          {!state.connected ? (
            <p className="text-sm text-muted">
              No database connected. Audit sessions appear here once a Supabase/Postgres
              connection is configured.
            </p>
          ) : state.sessions.length === 0 ? (
            <p className="text-sm text-muted">No audits run yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
                    <th className="py-2 pr-3">Created</th>
                    <th className="py-2 pr-3">Email</th>
                    <th className="py-2 pr-3">Calls</th>
                    <th className="py-2 pr-3">Est. leakage / mo</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2">Report</th>
                  </tr>
                </thead>
                <tbody>
                  {state.sessions.map((s) => (
                    <tr key={s.token} className="border-b border-line/60 align-top">
                      <td className="whitespace-nowrap py-2 pr-3 text-muted">
                        {s.created_at?.slice(0, 10)}
                      </td>
                      <td className="py-2 pr-3 text-ink">{s.email ?? "—"}</td>
                      <td className="py-2 pr-3 tabular-nums">{s.call_count}</td>
                      <td className="py-2 pr-3 font-semibold text-ink tabular-nums">
                        {s.leakage != null ? money(s.leakage) : "—"}
                      </td>
                      <td className="py-2 pr-3 text-muted">{s.status}</td>
                      <td className="py-2">
                        <a className="text-navy underline" href={`/audit/${s.token}`}>
                          open
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </PageShell>
  );
}
