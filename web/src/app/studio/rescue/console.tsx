"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// The Rescue desk console: import a dead-lead export, review what the triage
// surfaced (named confirm/reject), build today’s top-3 callback list, and hand
// it back to the CRM as a tagged CSV. All writes go through /api/rescue/run
// (founder-gated); the firm’s staff make every callback.

export interface FirmRow {
  id: string | number;
  name?: string;
}
export interface BatchRow {
  id: string | number;
  crm: string;
  filename: string | null;
  imported_by: string;
  row_count: number;
  surfaced_count: number;
  needs_info_count: number;
  screened_out_count: number;
  skipped_count: number;
  created_at: string;
}
export interface ReviewRow {
  review_item_id: string | number;
  flag_id: string | number;
  reason: string | null;
  case_type: string | null;
  caller_name: string | null;
  caller_phone: string | null;
  import_crm: string | null;
  external_lead_id: string | null;
  crm_status: string | null;
  crm_substatus: string | null;
  gap_kind: string | null;
  value_tier: string | null;
  value_tier_basis: string | null;
  sol_deadline: string | null;
  sol_days_remaining: number | null;
  sol_urgency: string | null;
  language: string | null;
}
export interface PacketItemView {
  flag_id: string | number;
  rank: number;
  prospect_name: string | null;
  prospect_phone: string | null;
  diagnosis: string | null;
  callback_script: string | null;
  sol_deadline: string | null;
  value_tier?: string | null;
  value_tier_basis?: string | null;
  gap_kind?: string | null;
  external_lead_id?: string | null;
}
export interface PacketView {
  packet_date: string;
  items: PacketItemView[];
}
export interface LeadRow {
  prospect_name: string | null;
  crm_status: string | null;
  screen_reason: string | null;
}
export interface LedgerView {
  total: number;
  recoveredCount: number;
  byStage: Record<string, number>;
}

const CRM_OPTIONS = [
  ["leaddocket", "Lead Docket"],
  ["cloudlex", "CloudLex"],
  ["litify", "Litify"],
  ["lawmatics", "Lawmatics"],
  ["lawruler", "Law Ruler"],
  ["cliogrow", "Clio Grow"],
  ["other", "Other / generic CSV"],
] as const;

const TIER_TONE: Record<string, string> = {
  high: "border-red/40 bg-red-tint text-red",
  elevated: "border-amber/40 bg-amber-tint text-amber",
  standard: "border-line-strong bg-paper text-muted",
};

const NAME_KEY = "operator-name";
// Safe on the server too (window is undefined -> caught -> ""), so it can seed
// useState lazily; the name inputs carry suppressHydrationWarning because the
// server always renders them empty.
function loadSavedName(): string {
  try {
    return window.localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}
function saveName(name: string) {
  try {
    window.localStorage.setItem(NAME_KEY, name);
  } catch {
    // localStorage unavailable — fine, it just won’t remember.
  }
}

const inputClass =
  "rounded-sm border border-line-strong bg-paper px-2 py-1 text-xs text-ink placeholder:text-faint focus:border-accent focus:outline-none";

function pretty(raw: string | null | undefined): string {
  if (!raw) return "—";
  const s = String(raw).replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

async function post(body: Record<string, unknown>): Promise<Response> {
  return fetch("/api/rescue/run", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

// --- import form ---------------------------------------------------------------

function ImportForm({ firmId }: { firmId: string }) {
  const router = useRouter();
  const [crm, setCrm] = React.useState<string>("leaddocket");
  const [csvText, setCsvText] = React.useState("");
  const [filename, setFilename] = React.useState<string | null>(null);
  const [by, setBy] = React.useState(loadSavedName);
  const [busy, setBusy] = React.useState(false);
  const [result, setResult] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFilename(f.name);
    setCsvText(await f.text());
  }

  async function runImport() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const r = await post({ action: "import", firmId, crm, csvText, filename, importedBy: by.trim() });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "import failed");
      saveName(by.trim());
      const reasons = (data.screenReasons as { reason: string; count: number }[])
        .map((s) => `${s.count} — ${s.reason}`)
        .join(" · ");
      setResult(
        `${data.rows} rows: ${data.surfaced} rescue candidate${data.surfaced === 1 ? "" : "s"} queued for your review, ` +
          `${data.screenedOut} stayed dead, ${data.needsInfo} need info, ${data.skipped} skipped.` +
          (reasons ? ` Stayed dead because: ${reasons}` : ""),
      );
      setCsvText("");
      setFilename(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "import failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <h2 className="text-sm font-semibold text-ink">1 · Import the cadence&rsquo;s dead leads</h2>
        <p className="max-w-[70ch] text-xs text-muted">
          In the firm&rsquo;s CRM, export the leads marked Lost / Rejected / chase-complete
          (Lead Docket: Reporting → Leads Report, filtered to those statuses, download CSV)
          and drop the file here. Columns are matched by name — Name, Phone, Status, Case
          Type, Incident Date, Notes and the like; anything unrecognized is kept, not lost.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Which CRM" value={crm} onChange={(e) => setCrm(e.target.value)} disabled={busy} className={inputClass}>
            {CRM_OPTIONS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <input type="file" accept=".csv,text/csv" onChange={onFile} disabled={busy} className="text-xs text-muted" />
          <input
            type="text"
            value={by}
            onChange={(e) => setBy(e.target.value)}
            disabled={busy}
            placeholder="Your name (required)"
            suppressHydrationWarning
            className={`${inputClass} w-40`}
          />
          <Button variant="primary" size="sm" disabled={busy || !csvText.trim() || !by.trim()} onClick={runImport}>
            {busy ? "Triaging…" : "Import & triage"}
          </Button>
        </div>
        <textarea
          value={csvText}
          onChange={(e) => setCsvText(e.target.value)}
          disabled={busy}
          placeholder="…or paste the CSV here (header row first)"
          rows={4}
          className={`${inputClass} w-full font-mono`}
        />
        {result ? <p className="text-xs text-ink">{result}</p> : null}
        {error ? <p className="text-xs text-red">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

// --- review queue ---------------------------------------------------------------

function ReviewQueue({ firmId, pending }: { firmId: string; pending: ReviewRow[] }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | number | null>(null);
  const [rejecting, setRejecting] = React.useState<string | number | null>(null);
  const [reason, setReason] = React.useState("");
  const [by, setBy] = React.useState(loadSavedName);
  const [error, setError] = React.useState<string | null>(null);

  async function decide(item: ReviewRow, decision: "confirm" | "reject") {
    setBusy(item.review_item_id);
    setError(null);
    try {
      const r = await post({
        action: "review",
        firmId,
        reviewItemId: item.review_item_id,
        decision,
        reviewer: by.trim(),
        reason: decision === "reject" ? reason.trim() || "not_a_real_case" : undefined,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "review failed");
      saveName(by.trim());
      setRejecting(null);
      setReason("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "review failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <h2 className="text-sm font-semibold text-ink">2 · Review what the triage surfaced</h2>
        <p className="max-w-[70ch] text-xs text-muted">
          Nothing reaches a callback list without your name on it. Confirm the real ones;
          reject the junk — a rejection teaches the firm&rsquo;s rules so the same junk
          doesn&rsquo;t come back.
        </p>
        {pending.length === 0 ? (
          <p className="text-sm text-faint">Nothing waiting for review.</p>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={by}
                onChange={(e) => setBy(e.target.value)}
                placeholder="Your name (required to sign off)"
                suppressHydrationWarning
                className={`${inputClass} w-56`}
              />
            </div>
            <ul className="divide-y divide-line rounded-card border border-line bg-paper">
              {pending.map((item) => (
                <li key={String(item.review_item_id)} className="space-y-1 px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {item.value_tier ? (
                      <span
                        className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${TIER_TONE[item.value_tier] ?? ""}`}
                        title={item.value_tier_basis ?? undefined}
                      >
                        {item.value_tier} value
                      </span>
                    ) : null}
                    <span className="text-sm font-medium text-ink">{item.caller_name ?? "Unknown"}</span>
                    <span className="text-xs text-muted tnum">{item.caller_phone ?? "no phone"}</span>
                    <span className="text-xs text-faint">{pretty(item.case_type)}</span>
                    {item.import_crm ? (
                      <span className="text-[11px] text-faint">
                        from {pretty(item.import_crm)}
                        {item.crm_status ? ` · was “${item.crm_status}${item.crm_substatus ? ` / ${item.crm_substatus}` : ""}”` : ""}
                      </span>
                    ) : null}
                    {item.sol_days_remaining != null && (item.sol_urgency === "critical" || item.sol_urgency === "soon") ? (
                      <span className="rounded-sm border border-red/40 bg-red-tint px-1.5 py-0.5 text-[10px] font-semibold uppercase text-red">
                        ~{item.sol_days_remaining}d to statute (est.)
                      </span>
                    ) : null}
                  </div>
                  {item.reason ? <p className="max-w-[90ch] text-xs text-muted">{item.reason}</p> : null}
                  {rejecting === item.review_item_id ? (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Why is this not a real case?"
                        className={`${inputClass} w-64`}
                      />
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busy === item.review_item_id || !by.trim()}
                        onClick={() => decide(item, "reject")}
                      >
                        Reject
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setRejecting(null)}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={busy === item.review_item_id || !by.trim()}
                        title={by.trim() ? "Confirms under your name" : "Enter your name above first"}
                        onClick={() => decide(item, "confirm")}
                      >
                        Confirm — real case
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={busy === item.review_item_id}
                        onClick={() => {
                          setRejecting(item.review_item_id);
                          setReason("");
                        }}
                      >
                        Not a real case…
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
        {error ? <p className="text-xs text-red">{error}</p> : null}
      </CardContent>
    </Card>
  );
}

// --- today’s rescue list -----------------------------------------------------------

function PacketPanel({ firmId, packet }: { firmId: string; packet: PacketView | null }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [logging, setLogging] = React.useState<string | number | null>(null);
  const [outcome, setOutcome] = React.useState("reached");
  const [by, setBy] = React.useState(loadSavedName);

  async function build() {
    setBusy(true);
    setError(null);
    try {
      const r = await post({ action: "packet", firmId });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "packet failed");
      if (data.empty) setError("No confirmed candidates yet — confirm something in step 2 first.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "packet failed");
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    setBusy(true);
    setError(null);
    try {
      const r = await post({ action: "export", firmId });
      if (!r.ok) {
        const data = await r.json();
        throw new Error(data.error ?? "export failed");
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rescue-list-${packet?.packet_date ?? "today"}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "export failed");
    } finally {
      setBusy(false);
    }
  }

  async function logCallback(item: PacketItemView) {
    setBusy(true);
    setError(null);
    try {
      const r = await post({
        action: "callback",
        firmId,
        flagId: item.flag_id,
        employeeName: by.trim(),
        outcome,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "callback log failed");
      saveName(by.trim());
      setLogging(null);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "callback log failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <h2 className="text-sm font-semibold text-ink">3 · Today&rsquo;s rescue list (top 3)</h2>
        <p className="max-w-[70ch] text-xs text-muted">
          Ranked by value tier × recoverability × statute urgency, capped at three so it
          actually gets done. Each has a ~2-minute callback script for the firm&rsquo;s staff —
          then hand the list back to the CRM as a tagged CSV so it lands where they already work.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" size="sm" disabled={busy} onClick={build}>
            {busy ? "Working…" : packet ? "Rebuild today’s list" : "Build today’s list"}
          </Button>
          {packet ? (
            <Button variant="outline" size="sm" disabled={busy} onClick={download}>
              Download CSV for the CRM
            </Button>
          ) : null}
        </div>
        {packet ? (
          <ul className="divide-y divide-line rounded-card border border-line bg-paper">
            {packet.items.map((item) => (
              <li key={String(item.flag_id)} className="space-y-1.5 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-semibold text-faint tnum">#{item.rank}</span>
                  <span className="text-sm font-medium text-ink">{item.prospect_name ?? "Unknown"}</span>
                  <span className="text-xs text-muted tnum">{item.prospect_phone ?? "no phone"}</span>
                  {item.value_tier ? (
                    <span
                      className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-semibold uppercase ${TIER_TONE[item.value_tier] ?? ""}`}
                      title={item.value_tier_basis ?? undefined}
                    >
                      {item.value_tier} value
                    </span>
                  ) : null}
                  {item.gap_kind ? <span className="text-[11px] text-faint">gap: {pretty(item.gap_kind)}</span> : null}
                  {item.sol_deadline ? (
                    <span className="text-[11px] text-amber" title="Estimated deadline only — an attorney must verify every statute date.">
                      SOL est. {item.sol_deadline}
                    </span>
                  ) : null}
                </div>
                {item.diagnosis ? <p className="max-w-[90ch] text-xs text-muted">{item.diagnosis}</p> : null}
                {item.callback_script ? (
                  <details className="text-xs text-muted">
                    <summary className="cursor-pointer text-accent">Callback script (~2 min)</summary>
                    <pre className="mt-1 whitespace-pre-wrap rounded-sm border border-line bg-canvas p-2 font-sans text-xs text-ink">
                      {item.callback_script}
                    </pre>
                  </details>
                ) : null}
                {logging === item.flag_id ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Callback outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} className={inputClass}>
                      <option value="reached">Reached them</option>
                      <option value="voicemail">Voicemail</option>
                      <option value="booked_consult">Booked a consult</option>
                      <option value="declined">They declined</option>
                      <option value="bad_number">Bad number</option>
                    </select>
                    <input
                      type="text"
                      value={by}
                      onChange={(e) => setBy(e.target.value)}
                      placeholder="Who called? (firm staff)"
                      suppressHydrationWarning
                      className={`${inputClass} w-44`}
                    />
                    <Button variant="primary" size="sm" disabled={busy || !by.trim()} onClick={() => logCallback(item)}>
                      Log it
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setLogging(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setLogging(item.flag_id)}>
                    Log the callback…
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-faint">No list built today.</p>
        )}
        {error ? <p className="text-xs text-red">{error}</p> : null}
        <p className="text-[11px] text-faint">
          Statute dates are estimates, never legal advice — an attorney must verify every
          deadline. In the CRM, file these under a dedicated &ldquo;Rescued — Review&rdquo;
          status so they leave the drip and get a human.
        </p>
      </CardContent>
    </Card>
  );
}

// --- the whole console -----------------------------------------------------------

export function RescueConsole({
  firms,
  firmId,
  batches,
  pending,
  screenedOut,
  packet,
  ledger,
}: {
  firms: FirmRow[];
  firmId: string;
  batches: BatchRow[];
  pending: ReviewRow[];
  screenedOut: LeadRow[];
  packet: PacketView | null;
  ledger: LedgerView | null;
}) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      {firms.length > 1 ? (
        <div className="flex items-center gap-2">
          <label htmlFor="rescue-firm" className="text-xs text-muted">
            Firm
          </label>
          <select
            id="rescue-firm"
            value={firmId}
            onChange={(e) => router.push(`/studio/rescue?firm=${encodeURIComponent(e.target.value)}`)}
            className={inputClass}
          >
            {firms.map((f) => (
              <option key={String(f.id)} value={String(f.id)}>
                {f.name ?? `Firm ${f.id}`}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <ImportForm firmId={firmId} />
      <ReviewQueue firmId={firmId} pending={pending} />
      <PacketPanel firmId={firmId} packet={packet} />

      {batches.length > 0 ? (
        <Card>
          <CardContent className="space-y-2 py-4">
            <h2 className="text-sm font-semibold text-ink">Import history</h2>
            <ul className="divide-y divide-line text-xs text-muted">
              {batches.map((b) => (
                <li key={String(b.id)} className="flex flex-wrap items-center justify-between gap-2 py-1.5">
                  <span>
                    {pretty(b.crm)}
                    {b.filename ? ` · ${b.filename}` : ""} · by {b.imported_by}
                  </span>
                  <span className="tnum">
                    {b.row_count} rows → {b.surfaced_count} surfaced · {b.screened_out_count} stayed dead ·{" "}
                    {b.needs_info_count} need info · {b.skipped_count} skipped
                  </span>
                </li>
              ))}
            </ul>
            {screenedOut.length > 0 ? (
              <details className="text-xs text-muted">
                <summary className="cursor-pointer text-accent">
                  Why the {screenedOut.length} stayed dead (the honest denominator)
                </summary>
                <ul className="mt-1 space-y-0.5">
                  {screenedOut.map((l, i) => (
                    <li key={i}>
                      <span className="text-ink">{l.prospect_name ?? "Unknown"}</span>
                      {l.crm_status ? ` (was “${l.crm_status}”)` : ""} — {l.screen_reason}
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {ledger && ledger.total > 0 ? (
        <Card>
          <CardContent className="space-y-1 py-4">
            <h2 className="text-sm font-semibold text-ink">Rescue ledger</h2>
            <p className="text-xs text-muted tnum">
              {ledger.total} rescued lead{ledger.total === 1 ? "" : "s"} tracked ·{" "}
              {Object.entries(ledger.byStage)
                .filter(([, n]) => n > 0)
                .map(([stage, n]) => `${n} ${stage}`)
                .join(" · ")}{" "}
              · {ledger.recoveredCount} recovered (signed + would have been lost)
            </p>
            <p className="text-[11px] text-faint">
              Full staged ledger with rescue tags lives in{" "}
              <a href="/studio/ledger" className="text-accent underline">
                Monthly results
              </a>
              .
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
