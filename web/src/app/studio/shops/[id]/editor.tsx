"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  SHOP_CHANNELS,
  SHOP_GRADES,
  ANSWERED_BY,
  SHOP_PROTOCOL_TEXT,
  computeShopSummary,
} from "@/lib/studio/shops";
import { AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER, computeLeakage } from "@/lib/studio/rubric";
import type { StudioShop, StudioShopChannel } from "@/lib/studio/shops-data";

// Per-channel editable state. `shopped=false` means the channel was not
// attempted (no row is stored) — distinct from shopped-and-lost.
interface ChannelState {
  shopped: boolean;
  grade: string | null;
  ring_count: string;
  response_latency_seconds: string;
  answered_by: string | null;
  notes: string;
}

function toState(rows: StudioShopChannel[]): Record<string, ChannelState> {
  const byChannel = new Map(rows.map((r) => [r.channel, r]));
  const out: Record<string, ChannelState> = {};
  for (const c of SHOP_CHANNELS) {
    const r = byChannel.get(c.key);
    out[c.key] = {
      shopped: Boolean(r),
      grade: r?.grade ?? null,
      ring_count: r?.ring_count != null ? String(r.ring_count) : "",
      response_latency_seconds:
        r?.response_latency_seconds != null ? String(r.response_latency_seconds) : "",
      answered_by: r?.answered_by ?? null,
      notes: r?.notes ?? "",
    };
  }
  return out;
}

function num(s: string): number | null {
  return s.trim() === "" ? null : Math.max(0, Math.floor(Number(s)));
}

export function ShopEditor({
  initial,
  initialChannels,
  firmName,
  knownMarkets,
}: {
  initial: StudioShop;
  initialChannels: StudioShopChannel[];
  firmName: string;
  knownMarkets: string[];
}) {
  const router = useRouter();
  const locked = initial.status === "final";

  const [channels, setChannels] = React.useState<Record<string, ChannelState>>(
    toState(initialChannels),
  );
  const [shoppedFrom, setShoppedFrom] = React.useState(initial.shopped_from ?? "");
  const [shoppedTo, setShoppedTo] = React.useState(initial.shopped_to ?? "");
  const [market, setMarket] = React.useState(initial.market ?? "");
  const [scenarioKey, setScenarioKey] = React.useState(initial.scenario_key ?? "");
  const [protocolAttested, setProtocolAttested] = React.useState(initial.protocol_attested);
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

  // Live deterministic preview (identical math to the server; the server value
  // is authoritative and re-saved on every PATCH).
  const shoppedRows = SHOP_CHANNELS.filter((c) => channels[c.key].shopped).map((c) => ({
    channel: c.key,
    grade: channels[c.key].grade,
  }));
  const summary = computeShopSummary(shoppedRows);
  const leakPreview = computeLeakage({
    averageSignedCaseFee: fee.trim() === "" ? null : Number(fee),
    illustrativeMonthlyRecurrence: recurrence.trim() === "" ? 1 : Number(recurrence),
  });

  function setChannel(key: string, patch: Partial<ChannelState>) {
    if (locked) return;
    setChannels((c) => ({ ...c, [key]: { ...c[key], ...patch } }));
  }

  async function save(extra?: Record<string, unknown>) {
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch(`/api/studio/shops/${initial.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          shopped_from: shoppedFrom || null,
          shopped_to: shoppedTo || null,
          market: market.trim() || null,
          scenario_key: scenarioKey.trim() || null,
          protocol_attested: protocolAttested,
          channels: SHOP_CHANNELS.filter((c) => channels[c.key].shopped).map((c) => ({
            channel: c.key,
            grade: channels[c.key].grade,
            ring_count: num(channels[c.key].ring_count),
            response_latency_seconds: num(channels[c.key].response_latency_seconds),
            answered_by: channels[c.key].answered_by,
            notes: channels[c.key].notes || null,
          })),
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
      // Server may have reset the review flag (if the narrative changed).
      if (data.shop) setReviewed(data.shop.narrative_reviewed);
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
    // Persist current channel facts first so the drafter sees them.
    await save();
    try {
      const r = await fetch(`/api/studio/shops/${initial.id}/draft-narrative`, {
        method: "POST",
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.message ?? data.error ?? "Draft failed.");
      setNarrFailure(data.draft.narrative_failure ?? "");
      setNarrFix(data.draft.narrative_fix ?? "");
      setReviewed(false); // a fresh draft always needs review
      setMsg("Draft ready — review and edit, then approve.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Draft failed.");
    } finally {
      setDrafting(false);
    }
  }

  async function finalize() {
    const ok = await save();
    if (!ok) return;
    const r = await fetch(`/api/studio/shops/${initial.id}/finalize`, { method: "POST" });
    const data = await r.json();
    if (!r.ok) {
      setMsg(data.message ?? data.error ?? "Could not finalize.");
      return;
    }
    router.refresh();
    window.location.assign(`/studio/shops/${initial.id}/report`);
  }

  const canFinalize =
    !locked &&
    reviewed &&
    protocolAttested &&
    narrFailure.trim() !== "" &&
    narrFix.trim() !== "" &&
    summary.graded > 0;

  return (
    <div className="flex flex-col gap-6">
      {locked ? (
        <div className="rounded-sm border border-accent/30 bg-accent-tint px-3 py-2 text-xs text-accent">
          This shop report is finalized and locked (ref {initial.ref_code}).
        </div>
      ) : null}

      {/* Live headline preview */}
      <Card>
        <CardContent className="flex items-center justify-between py-5">
          <div>
            <div className="eyebrow">Headline (deterministic — from the graded channels)</div>
            <div className="tnum text-3xl font-bold text-ink">
              {summary.notCaptured}
              <span className="ml-2 text-base font-normal text-muted">
                of {summary.graded} graded {summary.graded === 1 ? "channel" : "channels"} lost
                or fumbled
              </span>
            </div>
            <div className="mt-1 text-xs text-faint tnum">
              Captured {summary.captured} · Fumbled {summary.fumbled} · Lost {summary.lost}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Shop window / market / scenario */}
      <Card>
        <CardContent className="py-5">
          <h2 className="eyebrow mb-3">Shop window, market &amp; scenario</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-sm text-ink">
              Shopped from
              <input
                type="date"
                disabled={locked}
                value={shoppedFrom}
                onChange={(e) => setShoppedFrom(e.target.value)}
                className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink">
              Shopped to
              <input
                type="date"
                disabled={locked}
                value={shoppedTo}
                onChange={(e) => setShoppedTo(e.target.value)}
                className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink">
              Market (peer cohort)
              <input
                type="text"
                disabled={locked}
                value={market}
                onChange={(e) => setMarket(e.target.value)}
                list="known-markets"
                placeholder="e.g. sample-metro"
                className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              />
              <datalist id="known-markets">
                {knownMarkets.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </label>
            <label className="flex flex-col gap-1 text-sm text-ink">
              Approved scenario key
              <input
                type="text"
                disabled={locked}
                value={scenarioKey}
                onChange={(e) => setScenarioKey(e.target.value)}
                placeholder="e.g. mva-rear-end-v1"
                className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-faint">
            The market must match a peer-benchmark cohort for the ranked line to appear on the
            report. Until real cohort fieldwork lands, the only cohort is seed data and the
            report labels it as illustrative.
          </p>
        </CardContent>
      </Card>

      {/* Per-channel grading */}
      <Card>
        <CardContent className="py-5">
          <h2 className="eyebrow mb-4">
            Channels shopped (grades are your entered facts — never AI output)
          </h2>
          <div className="flex flex-col gap-5">
            {SHOP_CHANNELS.map((c) => {
              const st = channels[c.key];
              return (
                <div key={c.key} className="rounded-card border border-line p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-ink">
                      <input
                        type="checkbox"
                        disabled={locked}
                        checked={st.shopped}
                        onChange={(e) => setChannel(c.key, { shopped: e.target.checked })}
                      />
                      {c.label}
                    </label>
                    {st.shopped ? (
                      <div className="flex gap-1">
                        {SHOP_GRADES.map((g) => (
                          <button
                            key={g.key}
                            type="button"
                            disabled={locked}
                            onClick={() => setChannel(c.key, { grade: g.key })}
                            className={[
                              "rounded-sm border px-2 py-1 text-xs",
                              st.grade === g.key
                                ? g.key === "captured"
                                  ? "border-accent bg-accent-tint text-accent"
                                  : "border-red/40 bg-red-tint text-red"
                                : "border-line-strong bg-paper text-muted hover:text-ink",
                            ].join(" ")}
                          >
                            {g.label}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-faint">Not shopped</span>
                    )}
                  </div>
                  {st.shopped ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {c.kind === "call" ? (
                        <label className="flex flex-col gap-1 text-xs text-ink">
                          Ring count
                          <input
                            type="number"
                            min={0}
                            disabled={locked}
                            value={st.ring_count}
                            onChange={(e) => setChannel(c.key, { ring_count: e.target.value })}
                            className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
                          />
                        </label>
                      ) : null}
                      <label className="flex flex-col gap-1 text-xs text-ink">
                        Response latency (seconds)
                        <input
                          type="number"
                          min={0}
                          disabled={locked}
                          value={st.response_latency_seconds}
                          onChange={(e) =>
                            setChannel(c.key, { response_latency_seconds: e.target.value })
                          }
                          placeholder="blank = never answered"
                          className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-ink">
                        Answered by
                        <select
                          disabled={locked}
                          value={st.answered_by ?? ""}
                          onChange={(e) =>
                            setChannel(c.key, { answered_by: e.target.value || null })
                          }
                          className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
                        >
                          <option value="">—</option>
                          {ANSWERED_BY.map((a) => (
                            <option key={a.key} value={a.key}>
                              {a.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label className="flex flex-col gap-1 text-xs text-ink sm:col-span-3">
                        Field notes (the evidence the narrative traces to)
                        <textarea
                          disabled={locked}
                          value={st.notes}
                          onChange={(e) => setChannel(c.key, { notes: e.target.value })}
                          rows={2}
                          className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
                          placeholder="Contemporaneous notes from the attempt (what happened, verbatim where possible)."
                        />
                      </label>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* CIPA-safe protocol attestation (compliance-invariants §II) */}
      <Card>
        <CardContent className="py-5">
          <h2 className="eyebrow mb-3">Fieldwork protocol attestation</h2>
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              disabled={locked}
              checked={protocolAttested}
              onChange={(e) => setProtocolAttested(e.target.checked)}
              className="mt-1"
            />
            <span>{SHOP_PROTOCOL_TEXT}</span>
          </label>
          <p className="mt-2 text-xs text-faint">
            Required before the report can be finalized (enforced in the database as well).
          </p>
        </CardContent>
      </Card>

      {/* Leakage */}
      <Card>
        <CardContent className="py-5">
          <h2 className="eyebrow mb-3">
            Leakage (attorney-supplied fee — blank means no dollar figure is printed)
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 text-sm text-ink">
              Average signed case fee (USD)
              <input
                type="number"
                min={0}
                disabled={locked}
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder={`the firm's own number (e.g. ${AVERAGE_SIGNED_CASE_FEE_PLACEHOLDER})`}
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
            Single-case value:{" "}
            {leakPreview.singleCase == null
              ? "—"
              : `$${leakPreview.singleCase.toLocaleString()}`}{" "}
            · Illustrative annual:{" "}
            {leakPreview.illustrativeAnnual == null
              ? "—"
              : `$${leakPreview.illustrativeAnnual.toLocaleString()}`}{" "}
            (illustrative — not measured).
          </p>
        </CardContent>
      </Card>

      {/* Narrative + review gate */}
      <Card>
        <CardContent className="py-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="eyebrow">Narrative (drafted from your channel facts — edit freely)</h2>
            <Button
              variant="outline"
              size="sm"
              disabled={locked || drafting || summary.graded === 0}
              onClick={draftNarrative}
            >
              {drafting ? "Drafting…" : "Draft narrative"}
            </Button>
          </div>
          <p className="mb-3 text-xs text-faint">
            {summary.graded === 0
              ? "Grade at least one channel to enable drafting."
              : "Drafted only from the structured facts and field notes above. Any edit re-opens the approval box below."}
          </p>

          <label className="mb-1 block text-xs font-medium text-muted">
            The one expensive failure {reviewed ? "" : "— needs approval"}
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
            Recommended fix {reviewed ? "" : "— needs approval"}
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
            I have reviewed and approve this narrative.
          </label>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={() => save()} disabled={locked || saving}>
          {saving ? "Saving…" : "Save draft"}
        </Button>
        <Button variant="primary" onClick={finalize} disabled={!canFinalize}>
          Finalize &amp; open report
        </Button>
        {!canFinalize && !locked ? (
          <span className="text-xs text-faint">
            To finalize: grade a channel, attest the fieldwork protocol, and approve the
            narrative.
          </span>
        ) : null}
        {msg ? <span className="text-xs text-muted">{msg}</span> : null}
      </div>
      <p className="text-xs text-faint">Firm: {firmName}</p>
    </div>
  );
}
