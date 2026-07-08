"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DIMENSIONS,
  CRITICAL_FAILS,
  computeSpotCheck,
  computeLeakage,
  AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER,
  type SpotCheckResult,
} from "@/lib/studio/rubric";
import type { SpotCheck } from "@/lib/studio/data";

const LEVELS = [
  { v: 100, label: "Good" },
  { v: 50, label: "Partial" },
  { v: 0, label: "Poor" },
];

export function ScorecardEditor({
  initial,
  firmName,
  hasEvidence,
}: {
  initial: SpotCheck;
  firmName: string;
  hasEvidence: boolean;
}) {
  const router = useRouter();
  const locked = initial.status === "final";

  const [dims, setDims] = React.useState<Record<string, number>>(
    initial.dimension_inputs ?? {},
  );
  const [fails, setFails] = React.useState<string[]>(initial.critical_fails ?? []);
  const [notes, setNotes] = React.useState(initial.notes ?? "");
  const leak0 = (initial.leakage_inputs as Record<string, number | null>) ?? {};
  const [fee, setFee] = React.useState<string>(
    leak0.average_signed_case_fee != null ? String(leak0.average_signed_case_fee) : "",
  );
  const [recurrence, setRecurrence] = React.useState<string>(
    leak0.illustrative_monthly_recurrence != null
      ? String(leak0.illustrative_monthly_recurrence)
      : "1",
  );
  const [narrFailure, setNarrFailure] = React.useState(initial.narrative_failure ?? "");
  const [narrFix, setNarrFix] = React.useState(initial.narrative_fix ?? "");
  const [reviewed, setReviewed] = React.useState(initial.narrative_reviewed);
  const [saving, setSaving] = React.useState(false);
  const [drafting, setDrafting] = React.useState(false);
  const [msg, setMsg] = React.useState<string | null>(null);

  // Live deterministic preview (identical math to the server; the server value is
  // authoritative and re-saved on every PATCH).
  const preview: SpotCheckResult = computeSpotCheck({
    dimensionInputs: dims,
    criticalFails: fails,
  });
  const leakPreview = computeLeakage({
    averageSignedCaseFee: fee.trim() === "" ? null : Number(fee),
    illustrativeMonthlyRecurrence: recurrence.trim() === "" ? 1 : Number(recurrence),
  });

  function setDim(key: string, v: number) {
    if (locked) return;
    setDims((d) => ({ ...d, [key]: v }));
  }
  function toggleFail(key: string) {
    if (locked) return;
    setFails((f) => (f.includes(key) ? f.filter((k) => k !== key) : [...f, key]));
  }

  async function save(extra?: Record<string, unknown>) {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/studio/scorecards/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          dimension_inputs: dims,
          critical_fails: fails,
          notes,
          leakage_inputs: {
            average_signed_case_fee: fee.trim() === "" ? null : Number(fee),
            illustrative_monthly_recurrence: recurrence.trim() === "" ? 1 : Number(recurrence),
          },
          narrative_failure: narrFailure,
          narrative_fix: narrFix,
          narrative_reviewed: reviewed,
          ...extra,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Save failed.");
      // Server may have reset the review flag (if narrative changed).
      if (data.spotCheck) setReviewed(data.spotCheck.narrative_reviewed);
      setMsg("Saved.");
      return true;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function draftNarrative() {
    setDrafting(true);
    setMsg(null);
    // Persist current inputs/notes first so the drafter sees them.
    await save();
    try {
      const r = await fetch(`/api/studio/scorecards/${initial.id}/draft-narrative`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Draft failed.");
      setNarrFailure(data.draft.narrative_failure ?? "");
      setNarrFix(data.draft.narrative_fix ?? "");
      setReviewed(false); // AI draft always needs review
      setMsg("AI draft ready — review and edit, then approve.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Draft failed.");
    } finally {
      setDrafting(false);
    }
  }

  async function finalize() {
    const ok = await save();
    if (!ok) return;
    const r = await fetch(`/api/studio/scorecards/${initial.id}/finalize`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) {
      setMsg(data.message ?? data.error ?? "Could not finalize.");
      return;
    }
    router.refresh();
    window.location.assign(`/studio/scorecards/${initial.id}/print`);
  }

  const canFinalize =
    !locked &&
    reviewed &&
    narrFailure.trim() !== "" &&
    narrFix.trim() !== "" &&
    preview.score != null;

  return (
    <div className="flex flex-col gap-6">
      {locked ? (
        <div className="rounded-sm border border-accent/30 bg-accent-tint px-3 py-2 text-xs text-accent">
          This scorecard is finalized and locked (ref {initial.ref_code}).
        </div>
      ) : null}

      {/* Live headline preview */}
      <Card>
        <CardContent className="flex items-center justify-between py-5">
          <div>
            <div className="eyebrow">Headline (deterministic — not AI)</div>
            <div className="tnum text-3xl font-bold text-ink">
              {preview.score}
              <span className="ml-2 text-xl text-muted">/ 100</span>
              <span
                className={`ml-3 text-2xl ${preview.grade === "F" ? "text-red" : "text-ink"}`}
              >
                {preview.grade}
              </span>
            </div>
          </div>
          {preview.criticalFailTriggered ? (
            <div className="max-w-[40ch] rounded-sm border border-red/30 bg-red-tint px-3 py-2 text-xs text-red">
              Critical fail active — grade capped at F regardless of the weighted score.
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Rubric inputs */}
      <Card>
        <CardContent className="py-5">
          <h2 className="eyebrow mb-4">Rubric inputs (you fill these from the call)</h2>
          <div className="flex flex-col gap-3">
            {DIMENSIONS.map((d) => (
              <div key={d.key} className="flex items-center justify-between gap-3">
                <div className="text-sm text-ink">
                  {d.label} <span className="text-xs text-faint">w{d.weight}</span>
                </div>
                <div className="flex gap-1">
                  {LEVELS.map((l) => (
                    <button
                      key={l.v}
                      type="button"
                      disabled={locked}
                      onClick={() => setDim(d.key, l.v)}
                      className={[
                        "rounded-sm border px-2 py-1 text-xs",
                        (dims[d.key] ?? 0) === l.v
                          ? "border-accent bg-accent-tint text-accent"
                          : "border-line-strong bg-paper text-muted hover:text-ink",
                      ].join(" ")}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Critical fails */}
      <Card>
        <CardContent className="py-5">
          <h2 className="eyebrow mb-3">Critical fails (any one caps the grade at F)</h2>
          <div className="flex flex-col gap-2">
            {CRITICAL_FAILS.map((c) => (
              <label key={c.key} className="flex items-center gap-2 text-sm text-ink">
                <input
                  type="checkbox"
                  disabled={locked}
                  checked={fails.includes(c.key)}
                  onChange={() => toggleFail(c.key)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Leakage */}
      <Card>
        <CardContent className="py-5">
          <h2 className="eyebrow mb-3">Leakage inputs (all shown on the report)</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-ink">
              Average signed case fee (USD)
              <input
                type="number"
                min={0}
                disabled={locked}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder={`e.g. ${AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER} (conservative placeholder — replace with the firm's number)`}
                className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink">
              Illustrative monthly recurrence
              <input
                type="number"
                min={0}
                disabled={locked}
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value)}
                className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-faint">
            Single-case value: {leakPreview.singleCase == null ? "—" : `$${leakPreview.singleCase.toLocaleString()}`} ·
            Illustrative annual:{" "}
            {leakPreview.illustrativeAnnual == null
              ? "—"
              : `$${leakPreview.illustrativeAnnual.toLocaleString()}`}{" "}
            (illustrative — not measured).
          </p>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardContent className="py-5">
          <h2 className="eyebrow mb-3">Notes (feed the AI draft; not printed verbatim)</h2>
          <textarea
            disabled={locked}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            className="w-full rounded-sm border border-line-strong bg-paper p-2 text-sm"
            placeholder="What you observed on the call."
          />
        </CardContent>
      </Card>

      {/* AI narrative + review gate */}
      <Card>
        <CardContent className="py-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow">Narrative (AI drafts; you approve)</h2>
            <Button
              variant="outline"
              size="sm"
              disabled={locked || drafting || !hasEvidence}
              onClick={draftNarrative}
            >
              {drafting ? "Drafting…" : "AI: draft narrative"}
            </Button>
          </div>
          {!hasEvidence ? (
            <p className="mb-3 text-xs text-faint">
              Attach a processed recording to enable AI drafting.
            </p>
          ) : null}

          <label className="mb-1 block text-xs font-medium text-muted">
            The one expensive failure {reviewed ? "" : "— DRAFT (unreviewed)"}
          </label>
          <textarea
            disabled={locked}
            value={narrFailure}
            onChange={(e) => {
              setNarrFailure(e.target.value);
              setReviewed(false);
            }}
            rows={3}
            className="mb-4 w-full rounded-sm border border-line-strong bg-paper p-2 text-sm"
          />

          <label className="mb-1 block text-xs font-medium text-muted">
            Recommended fix {reviewed ? "" : "— DRAFT (unreviewed)"}
          </label>
          <textarea
            disabled={locked}
            value={narrFix}
            onChange={(e) => {
              setNarrFix(e.target.value);
              setReviewed(false);
            }}
            rows={3}
            className="mb-4 w-full rounded-sm border border-line-strong bg-paper p-2 text-sm"
          />

          <label className="flex items-center gap-2 text-sm text-ink">
            <input
              type="checkbox"
              disabled={locked}
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I have reviewed and approve this narrative (required to finalize/print).
          </label>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => save()} disabled={locked || saving}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="primary" onClick={finalize} disabled={!canFinalize}>
          Finalize &amp; open print view
        </Button>
        {!canFinalize && !locked ? (
          <span className="text-xs text-faint">
            Finalize needs an approved narrative (both fields + the review box).
          </span>
        ) : null}
        {msg ? <span className="text-xs text-muted">{msg}</span> : null}
      </div>
      <p className="text-xs text-faint">Firm: {firmName}</p>
    </div>
  );
}
