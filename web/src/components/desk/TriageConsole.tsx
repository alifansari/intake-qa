"use client";

// LIVE TRIAGE CONSOLE — the day-to-day surface, in the house design system.
//   Triage mode: a short intake form (left) -> instant verdict (right) ->
//     prioritized "call these first" queue (below) with disposition tracking.
//   Calibrate mode: deal a deck of representative California calls, mark each
//     Sign / Maybe / Pass, and the firm's appetite is read off the choices.
//
// Everything is deterministic and instant (no LLM). Recommendation only: the
// verdict carries its SOL disclaimer and an attorney-ratification note.
//
// Brand rules honored: emerald (accent) = positive / primary CTA; amber =
// caution; navy = "handled elsewhere" (refer); a calm neutral for a clean
// decline; and muted alert-red ONLY for genuine risk (expired deadline,
// attorney-review flag).

import { useMemo, useState } from "react";
import {
  STATUS_LABEL,
  STATUS_NEXT,
  isTerminalStatus,
  solTone,
  urgencyReason,
  dispositionPlain,
  valueTierPlain,
} from "@/lib/desk/triage-view.mjs";
import { CALIBRATION_SAMPLES, calibrateProfile } from "@/lib/desk/calibration.mjs";

type CaseType = { id: string; label: string };
type Profile = {
  posture?: string;
  accepted_case_types?: string[] | null;
  take_mist?: boolean | null;
  cost_fronting?: string;
  trial_capital?: boolean;
  min_policy_limits?: string | null;
  red_flag_strictness?: string;
};
type QueueRow = Record<string, unknown>;

// disposition -> badge + accent classes (design-token driven).
function dispoStyle(disposition: string) {
  switch (disposition) {
    case "sign_now":
      return { badge: "bg-accent text-white", tint: "bg-accent-tint text-accent" };
    case "develop":
      return { badge: "bg-amber text-white", tint: "bg-amber-tint text-amber" };
    case "refer_out":
      return { badge: "bg-navy text-white", tint: "bg-navy-tint text-navy" };
    default: // decline_with_grace — calm, not an alarm
      return { badge: "bg-line-strong text-ink", tint: "bg-canvas text-ink-muted" };
  }
}
// SOL / risk tone -> chip classes.
function toneChip(tone: string) {
  if (tone === "bad") return "bg-red-tint text-alert";
  if (tone === "warn") return "bg-amber-tint text-amber";
  if (tone === "good") return "bg-accent-tint text-accent";
  return "bg-canvas text-faint";
}

const field =
  "w-full rounded-base border border-line-strong bg-surface px-3 py-2 text-sm text-ink focus:outline-none";
const label = "block text-xs font-medium text-ink-muted mb-1";
const card = "rounded-card border border-hairline bg-surface p-5 shadow-card";
const eyebrow = "eyebrow";

export function TriageConsole({
  caseTypes,
  profile: initialProfile,
  initialQueue,
  disabled = false,
}: {
  caseTypes: CaseType[];
  profile: Profile;
  initialQueue: QueueRow[];
  disabled?: boolean;
}) {
  const [mode, setMode] = useState<"triage" | "calibrate">("triage");
  const [form, setForm] = useState<Record<string, unknown>>({
    case_type: "mva_standard",
    liability: "clear",
    injury: "moderate",
    coverage: "unknown",
    red_flags: {},
  });
  const [verdict, setVerdict] = useState<Record<string, unknown> | null>(null);
  const [queue, setQueue] = useState<QueueRow[]>(initialQueue);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profile, setProfile] = useState<Profile>(initialProfile || {});

  const ct = String(form.case_type || "");
  const isWork = ct === "work_injury";
  const isDram = ct === "dram_shop";
  const isElder = ct === "nursing_home";

  function set(key: string, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }
  function setFlag(key: string, value: boolean) {
    setForm((f) => ({ ...f, red_flags: { ...(f.red_flags as object), [key]: value } }));
  }

  async function grade() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/desk/triage", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data?.error || "Could not grade this case.");
        return;
      }
      setVerdict(data.verdict);
      const v = data.verdict;
      setQueue((q) => [
        {
          id: data.id,
          created_at: new Date().toISOString(),
          caller_name: form.caller_name ?? null,
          caller_phone: form.caller_phone ?? null,
          case_type: v.case_type,
          grade_letter: v.grade.letter,
          grade_color: v.grade.color,
          headline: v.grade.headline,
          disposition: v.disposition,
          driving_reason: v.driving_reason,
          flip_fact: v.flip_fact,
          sol_urgency: v.sol.urgency,
          sol_days_remaining: v.sol.days_remaining,
          attorney_review: v.attorney_review_required ? 1 : 0,
          status: "new",
        },
        ...q,
      ]);
    } catch {
      setErr("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(id: unknown, status: string, signedWhere?: "us" | "elsewhere") {
    setQueue((q) => q.map((r) => (r.id === id ? { ...r, status } : r)));
    try {
      await fetch("/api/desk/triage", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status, signed_where: signedWhere ?? null }),
      });
    } catch {
      /* optimistic */
    }
  }

  async function saveProfile(next: Profile) {
    setProfile(next);
    try {
      await fetch("/api/desk/triage", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(next),
      });
    } catch {
      /* ignore */
    }
  }

  const open = useMemo(() => queue.filter((r) => !isTerminalStatus(String(r.status))), [queue]);

  return (
    <div>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">Live triage</h1>
          <p className="mt-1 max-w-2xl text-sm text-ink-muted">
            Grade a new call in seconds. Enter what you heard; get the disposition, the one reason,
            and the one fact that would change it. California statutes are applied automatically.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            onClick={() => setMode((m) => (m === "calibrate" ? "triage" : "calibrate"))}
            className={`rounded-base border px-3 py-2 text-sm ${
              mode === "calibrate" ? "border-navy bg-navy text-white" : "border-line-strong text-ink hover:bg-canvas"
            }`}
          >
            Calibrate
          </button>
          <button
            onClick={() => setShowProfile((s) => !s)}
            className="rounded-base border border-line-strong px-3 py-2 text-sm text-ink hover:bg-canvas"
          >
            Firm appetite
          </button>
        </div>
      </header>

      {showProfile && (
        <ProfileEditor
          profile={profile}
          caseTypes={caseTypes}
          onSave={(p) => {
            saveProfile(p);
            setShowProfile(false);
          }}
          onClose={() => setShowProfile(false)}
        />
      )}

      {mode === "calibrate" ? (
        <CalibrationDeck
          caseTypes={caseTypes}
          base={profile}
          onApply={(p) => {
            saveProfile(p);
            setMode("triage");
          }}
        />
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            {/* ---- the form ---- */}
            <section className={card}>
              <h2 className={`${eyebrow} mb-4`}>New call</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-1">
                  <label className={label}>Caller name</label>
                  <input className={field} onChange={(e) => set("caller_name", e.target.value)} placeholder="Optional" />
                </div>
                <div className="col-span-1">
                  <label className={label}>Phone</label>
                  <input className={field} onChange={(e) => set("caller_phone", e.target.value)} placeholder="For callback" />
                </div>
                <div className="col-span-2">
                  <label className={label}>Case type</label>
                  <select className={field} value={ct} onChange={(e) => set("case_type", e.target.value)}>
                    {caseTypes.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className={label}>Date of incident</label>
                  <input type="date" className={field} onChange={(e) => set("incident_date", e.target.value)} />
                </div>
                <div className="col-span-1 flex items-end gap-4 pb-2">
                  <Check label="Gov. defendant" onChange={(v) => set("government_defendant", v)} />
                  <Check label="Minor" onChange={(v) => set("minor", v)} />
                </div>

                <div className="col-span-1">
                  <label className={label}>Who is at fault?</label>
                  <select className={field} defaultValue="clear" onChange={(e) => set("liability", e.target.value)}>
                    <option value="clear">Clearly the other side</option>
                    <option value="disputed">Disputed</option>
                    <option value="unclear">Not yet clear</option>
                    <option value="client_mostly_at_fault">Mostly our caller</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className={label}>Injury</label>
                  <select className={field} defaultValue="moderate" onChange={(e) => set("injury", e.target.value)}>
                    <option value="none">None / property only</option>
                    <option value="soft_tissue">Soft tissue only</option>
                    <option value="moderate">Moderate, ongoing treatment</option>
                    <option value="hard">Fracture / surgery / TBI</option>
                    <option value="catastrophic">Catastrophic</option>
                    <option value="death">Death</option>
                  </select>
                </div>
                <div className="col-span-2 flex flex-wrap gap-4 py-1">
                  <Check label="Police report blames other side" onChange={(v) => set("police_report_favorable", v)} />
                  <Check label="Independent witnesses" onChange={(v) => set("independent_witnesses", v)} />
                </div>
                <div className="col-span-2 flex flex-wrap gap-4 py-1">
                  <Check label="Imaging / surgery / ER" onChange={(v) => set("objective_findings", v)} />
                  <Check label="Ambulance / ER transport" onChange={(v) => set("ambulance_transport", v)} />
                  <Check label="Gap in treatment" onChange={(v) => set("treatment_gap", v)} />
                  <Check label="Minor impact / low damage" onChange={(v) => set("minimal_impact", v)} />
                  <Check label="Significant property damage" onChange={(v) => set("significant_property_damage", v)} />
                </div>

                <div className="col-span-1">
                  <label className={label}>Other side&rsquo;s coverage</label>
                  <select className={field} defaultValue="unknown" onChange={(e) => set("coverage", e.target.value)}>
                    <option value="unknown">Unknown</option>
                    <option value="none_uninsured">Uninsured</option>
                    <option value="minimal">Minimal (~$15-25k)</option>
                    <option value="moderate">Moderate (~$50-100k)</option>
                    <option value="high">High ($100k+)</option>
                    <option value="commercial_deep">Commercial / deep pocket</option>
                  </select>
                </div>
                <div className="col-span-1">
                  <label className={label}>Liens</label>
                  <select className={field} defaultValue="none" onChange={(e) => set("liens", e.target.value)}>
                    <option value="none">None known</option>
                    <option value="medi_cal">Medi-Cal</option>
                    <option value="medicare">Medicare</option>
                    <option value="health_insurance">Health insurance</option>
                    <option value="erisa_selffunded">ERISA (self-funded)</option>
                    <option value="erisa_unknown">ERISA (unknown)</option>
                    <option value="hospital">Hospital lien</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div className="col-span-2 flex items-center gap-4 py-1">
                  <Check label="Caller has UM / UIM" onChange={(v) => set("client_has_um", v)} />
                </div>

                <div className="col-span-2">
                  <label className={label}>Was the caller insured at the time? (Prop 213)</label>
                  <select
                    className={field}
                    defaultValue="unknown"
                    onChange={(e) => set("client_insured_status", e.target.value)}
                  >
                    <option value="unknown">Unknown / not asked</option>
                    <option value="insured">Yes &mdash; caller had their own insurance</option>
                    <option value="uninsured_driver_of_insured_vehicle">Drove someone else&rsquo;s insured car</option>
                    <option value="passenger">Was a passenger</option>
                    <option value="uninsured_owner_operator">No &mdash; own vehicle, uninsured</option>
                    <option value="uninsured_driver_of_uninsured_vehicle">No &mdash; drove an uninsured vehicle</option>
                  </select>
                </div>

                {isWork && (
                  <div className="col-span-2 rounded-base bg-amber-tint p-3">
                    <label className={label}>Was anyone other than the employer at fault?</label>
                    <div className="flex gap-4">
                      <Radio name="wc" label="Yes (third party)" onChange={() => set("work_injury_third_party", true)} />
                      <Radio name="wc" label="No (comp only)" onChange={() => set("work_injury_third_party", false)} />
                    </div>
                  </div>
                )}
                {isDram && (
                  <div className="col-span-2 space-y-1 rounded-base bg-amber-tint p-3">
                    <Check label="Served by a licensed vendor (bar/restaurant)" onChange={(v) => set("dram_shop_licensed_vendor", v)} />
                    <Check label="Person served was an obviously intoxicated minor" onChange={(v) => set("dram_shop_obviously_intoxicated_minor", v)} />
                  </div>
                )}
                {isElder && (
                  <div className="col-span-2 rounded-base bg-amber-tint p-3">
                    <Check label="Pattern of reckless neglect (bedsores, dehydration, repeated falls)" onChange={(v) => set("elder_abuse_reckless_neglect", v)} />
                  </div>
                )}

                <div className="col-span-2 mt-1">
                  <label className={label}>Red flags heard on the call</label>
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <Check label="Already has a lawyer" onChange={(v) => setFlag("already_represented", v)} />
                    <Check label="Fired / multiple prior attorneys" onChange={(v) => setFlag("multiple_prior_attorneys", v)} />
                    <Check label="Haggling over fee" onChange={(v) => setFlag("fee_haggling", v)} />
                    <Check label="Unrealistic expectations" onChange={(v) => setFlag("unrealistic_expectations", v)} />
                    <Check label="Story keeps changing" onChange={(v) => setFlag("inconsistent_story", v)} />
                  </div>
                </div>
              </div>

              <button
                onClick={grade}
                disabled={busy || disabled}
                className="mt-5 w-full rounded-base bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover disabled:opacity-50"
              >
                {busy ? "Grading…" : "Grade this call"}
              </button>
              {disabled && <p className="mt-2 text-xs text-amber">Connect a database to save triage cases.</p>}
              {err && <p className="mt-2 text-xs text-alert">{err}</p>}
            </section>

            {/* ---- the verdict ---- */}
            <section className={card}>
              <h2 className={`${eyebrow} mb-4`}>Verdict</h2>
              {!verdict ? (
                <p className="text-sm text-faint">
                  Fill in what you heard and press <span className="font-medium text-ink-muted">Grade this call</span>. The read appears here in an instant.
                </p>
              ) : (
                <Verdict verdict={verdict} />
              )}
            </section>
          </div>

          {/* ---- the queue ---- */}
          <section className="mt-8">
            <h2 className={`${eyebrow} mb-3`}>
              Call these first {open.length ? `· ${open.length} open` : ""}
            </h2>
            {open.length === 0 ? (
              <p className="text-sm text-faint">No open triage cases. Graded calls land here, most urgent first.</p>
            ) : (
              <div className="space-y-3">
                {open.map((row) => (
                  <QueueCard key={String(row.id)} row={row} onStatus={setStatus} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Verdict({ verdict }: { verdict: Record<string, unknown> }) {
  const grade = verdict.grade as { letter: string; color: string; headline: string };
  const sol = verdict.sol as Record<string, unknown>;
  const gates = verdict.ca_gates as { fired: Array<Record<string, string>>; review: Array<Record<string, string>> };
  const style = dispoStyle(String(verdict.disposition));
  const st = solTone(String(sol.urgency));
  return (
    <div>
      <div className="flex items-center gap-4">
        <div className={`flex h-16 w-16 items-center justify-center rounded-card font-display text-3xl font-bold ${style.badge}`}>
          {grade.letter}
        </div>
        <div>
          <div className="font-display text-lg font-semibold text-ink">{grade.headline}</div>
          <div className={`mt-0.5 inline-block rounded-pill px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${style.tint}`}>
            {dispositionPlain(String(verdict.disposition))} · {valueTierPlain(String(verdict.value_tier))}
          </div>
        </div>
      </div>

      <Line title="Driving it">{String(verdict.driving_reason || "")}</Line>
      {verdict.flip_fact ? (
        <Line title="Would change it">
          <span className={`mr-2 rounded-base px-1.5 py-0.5 text-[11px] font-medium ${toneChip("warn")}`}>Ask</span>
          {String(verdict.flip_fact)}
        </Line>
      ) : null}
      <Line title="Filing clock">
        <span className={`mr-2 rounded-base px-1.5 py-0.5 text-[11px] font-medium ${toneChip(st.tone)}`}>{st.label}</span>
        <span className="tnum">
          {sol.deadline_date
            ? <>est. {String(sol.deadline_date)}{sol.days_remaining != null ? ` (${String(sol.days_remaining)} days)` : ""}</>
            : "needs the incident date"}
        </span>
        {sol.statute ? <span className="text-faint"> · {String(sol.statute)}</span> : null}
      </Line>

      {gates?.fired?.length ? (
        <Line title="California gate">
          {gates.fired.map((g, i) => (
            <div key={i} className="text-sm">
              <span className="font-medium text-ink">{g.name?.replaceAll("_", " ")}</span>
              <span className="text-faint"> · {g.citation}</span>
              <div className="text-ink-muted">{g.reason}</div>
            </div>
          ))}
        </Line>
      ) : null}
      {gates?.review?.length ? (
        <Line title="Confirm">
          {gates.review.map((g, i) => (
            <div key={i} className="text-sm text-ink-muted">{g.reason} <span className="text-faint">({g.citation})</span></div>
          ))}
        </Line>
      ) : null}

      {Array.isArray(verdict.next_questions) && (verdict.next_questions as string[]).length ? (
        <Line title="Ask next">
          <ul className="list-disc pl-4 text-sm text-ink-muted">
            {(verdict.next_questions as string[]).map((q, i) => <li key={i}>{q}</li>)}
          </ul>
        </Line>
      ) : null}

      <p className="mt-4 border-t border-hairline pt-3 text-[11px] leading-relaxed text-faint">
        Recommendation for attorney review, not a final decision or legal advice. {String(sol.disclaimer || "")}
      </p>
    </div>
  );
}

function QueueCard({ row, onStatus }: { row: QueueRow; onStatus: (id: unknown, s: string, signedWhere?: "us" | "elsewhere") => void }) {
  const status = String(row.status || "new");
  const style = dispoStyle(String(row.disposition));
  const reason = urgencyReason(row);
  const st = solTone(String(row.sol_urgency));
  return (
    <div className="rounded-card border border-hairline bg-surface p-4">
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-base font-display text-lg font-bold ${style.badge}`}>
          {String(row.grade_letter || "?")}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-ink">{String(row.caller_name || "Unnamed caller")}</span>
            {row.caller_phone ? <a href={`tel:${row.caller_phone}`} className="text-sm text-accent tnum">{String(row.caller_phone)}</a> : null}
            {row.attorney_review ? <span className={`rounded-base px-1.5 py-0.5 text-[11px] ${toneChip("bad")}`}>attorney review</span> : null}
          </div>
          <div className="text-sm text-ink-muted">{String(row.headline || row.disposition)}</div>
          {reason ? <div className="mt-0.5 text-xs text-faint">{reason}</div> : null}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`rounded-base px-1.5 py-0.5 font-medium ${toneChip(st.tone)}`}>{st.label}</span>
            <span className="rounded-base bg-canvas px-1.5 py-0.5 text-ink-muted">{(STATUS_LABEL as Record<string, string>)[status] || status}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {((STATUS_NEXT as Record<string, Array<{ label: string; to: string }>>)[status] || []).map((n) =>
          n.to === "signed" ? (
            // "Signed" splits into with-us vs elsewhere — the one distinction the
            // calibration loop needs to tell a real save from a case we lost.
            <span key={n.to} className="inline-flex overflow-hidden rounded-base border border-line-strong">
              <button
                onClick={() => onStatus(row.id, "signed", "us")}
                className="px-2.5 py-1 text-xs font-semibold text-accent hover:bg-canvas"
              >
                Signed · with us
              </button>
              <button
                onClick={() => onStatus(row.id, "signed", "elsewhere")}
                className="border-l border-line-strong px-2.5 py-1 text-xs text-ink-muted hover:bg-canvas"
              >
                elsewhere
              </button>
            </span>
          ) : (
            <button
              key={n.to}
              onClick={() => onStatus(row.id, n.to)}
              className="rounded-base border border-line-strong px-2.5 py-1 text-xs text-ink hover:bg-canvas"
            >
              {n.label}
            </button>
          ),
        )}
      </div>
    </div>
  );
}

// -------- calibration deck --------
function CalibrationDeck({
  caseTypes,
  base,
  onApply,
}: {
  caseTypes: CaseType[];
  base: Profile;
  onApply: (p: Profile) => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<{ profile: Profile; rationale: string[] } | null>(null);
  const allTypes = caseTypes.map((c) => c.id);

  function pick(id: string, choice: string) {
    setAnswers((a) => ({ ...a, [id]: choice }));
    setResult(null);
  }
  function compute() {
    const r = calibrateProfile(answers, { base, allTypes });
    setResult({ profile: r.profile, rationale: r.rationale });
  }
  const answered = Object.keys(answers).length;

  return (
    <div className={card}>
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className={eyebrow}>Calibrate your appetite</h2>
        <span className="text-xs text-faint tnum">{answered}/{CALIBRATION_SAMPLES.length}</span>
      </div>
      <p className="mb-5 max-w-2xl text-sm text-ink-muted">
        Mark each call the way you actually would. We read your appetite off what you keep, not what you say,
        then set the grades to match. Change any answer and recompute.
      </p>

      <div className="space-y-3">
        {CALIBRATION_SAMPLES.map((s) => {
          const choice = answers[s.id];
          return (
            <div key={s.id} className="rounded-card border border-hairline p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-ink">{s.label}</div>
                  <div className="text-sm text-ink-muted">{s.blurb}</div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {[
                    { key: "pass", label: "Pass" },
                    { key: "maybe", label: "Maybe" },
                    { key: "sign", label: "Sign" },
                  ].map((opt) => {
                    const on = choice === opt.key;
                    const tone =
                      opt.key === "sign" ? "bg-accent text-white border-accent"
                        : opt.key === "maybe" ? "bg-amber text-white border-amber"
                          : "bg-line-strong text-ink border-line-strong";
                    return (
                      <button
                        key={opt.key}
                        onClick={() => pick(s.id, opt.key)}
                        className={`rounded-base border px-3 py-1.5 text-sm ${on ? tone : "border-line-strong bg-surface text-ink-muted hover:bg-canvas"}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          onClick={compute}
          disabled={answered === 0}
          className="rounded-base bg-navy px-4 py-2 text-sm font-semibold text-white hover:bg-navy-deep disabled:opacity-50"
        >
          See my appetite
        </button>
        {answered < CALIBRATION_SAMPLES.length && (
          <span className="text-xs text-faint">Answer more for a sharper read.</span>
        )}
      </div>

      {result && (
        <div className="mt-5 rounded-card border border-hairline bg-canvas p-4">
          <div className="mb-2 font-display text-base font-semibold text-ink">Your appetite, read from your choices</div>
          <div className="mb-3 flex flex-wrap gap-2 text-[11px]">
            <Tag>{result.profile.posture === "volume" ? "Volume" : "Selective"}</Tag>
            <Tag>MIST: {result.profile.take_mist == null ? "case by case" : result.profile.take_mist ? "take" : "pass"}</Tag>
            <Tag>Min limits: {result.profile.min_policy_limits || "none"}</Tag>
            <Tag>Cost: {result.profile.cost_fronting || "moderate"}</Tag>
            <Tag>{(result.profile.accepted_case_types || allTypes).length} case types</Tag>
          </div>
          <ul className="list-disc space-y-1 pl-4 text-sm text-ink-muted">
            {result.rationale.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
          <button
            onClick={() => onApply(result.profile)}
            className="mt-4 rounded-base bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
          >
            Save this appetite
          </button>
        </div>
      )}
    </div>
  );
}

function ProfileEditor({
  profile,
  caseTypes,
  onSave,
  onClose,
}: {
  profile: Profile;
  caseTypes: CaseType[];
  onSave: (p: Profile) => void;
  onClose: () => void;
}) {
  const [p, setP] = useState<Profile>(profile);
  const accepted = p.accepted_case_types ?? caseTypes.map((c) => c.id);
  function toggleType(id: string) {
    const has = accepted.includes(id);
    setP({ ...p, accepted_case_types: has ? accepted.filter((t) => t !== id) : [...accepted, id] });
  }
  return (
    <div className={`${card} mb-5`}>
      <div className="mb-3 flex items-center justify-between">
        <h2 className={eyebrow}>Firm appetite</h2>
        <button onClick={onClose} className="text-sm text-faint hover:text-ink">Close</button>
      </div>
      <p className="mb-4 text-xs text-faint">
        This shapes the grades. Turn off case types you never take (they refer out automatically), and set how selective you are.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={label}>How selective?</label>
          <select className={field} value={p.posture || "selective"} onChange={(e) => setP({ ...p, posture: e.target.value })}>
            <option value="selective">Selective (higher value)</option>
            <option value="volume">Volume (sign more, develop more)</option>
          </select>
        </div>
        <div>
          <label className={label}>Minor-impact soft tissue?</label>
          <select
            className={field}
            value={p.take_mist == null ? "" : p.take_mist ? "yes" : "no"}
            onChange={(e) => setP({ ...p, take_mist: e.target.value === "" ? null : e.target.value === "yes" })}
          >
            <option value="">Develop / case by case</option>
            <option value="yes">Take them</option>
            <option value="no">Pass on them</option>
          </select>
        </div>
        <div>
          <label className={label}>Cost you will front</label>
          <select className={field} value={p.cost_fronting || "moderate"} onChange={(e) => setP({ ...p, cost_fronting: e.target.value })}>
            <option value="minimal">Minimal</option>
            <option value="moderate">Moderate</option>
            <option value="deep">Deep</option>
          </select>
        </div>
        <div className="flex items-end">
          <Check label="We carry trial capital" checked={p.trial_capital} onChange={(v) => setP({ ...p, trial_capital: v })} />
        </div>
      </div>
      <div className="mt-4">
        <label className={label}>Case types we take</label>
        <div className="flex flex-wrap gap-2">
          {caseTypes.map((c) => {
            const on = accepted.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleType(c.id)}
                className={`rounded-pill border px-3 py-1 text-xs ${on ? "border-navy bg-navy text-white" : "border-line-strong bg-surface text-faint hover:bg-canvas"}`}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>
      <button onClick={() => onSave(p)} className="mt-4 rounded-base bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover">
        Save appetite
      </button>
    </div>
  );
}

function Line({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3 border-t border-hairline pt-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-faint">{title}</div>
      <div className="mt-1 text-sm text-ink">{children}</div>
    </div>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded-pill bg-surface px-2 py-0.5 text-ink-muted ring-1 ring-hairline">{children}</span>;
}

function Check({ label: text, checked, onChange }: { label: string; checked?: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-ink">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 rounded border-line-strong text-accent" />
      {text}
    </label>
  );
}

function Radio({ name, label: text, onChange }: { name: string; label: string; onChange: () => void }) {
  return (
    <label className="inline-flex items-center gap-1.5 text-sm text-ink">
      <input type="radio" name={name} onChange={onChange} className="h-4 w-4 border-line-strong text-accent" />
      {text}
    </label>
  );
}
