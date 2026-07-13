"use client";

// Operator control: turn each per-firm feature flag on/off. Writes through the
// /api/admin/features endpoint (which goes through the pipeline facade). Default
// state comes from the server; each toggle updates optimistically-then-confirms
// from the server’s returned feature map.

import { useState } from "react";
import { ALL_FEATURES, FEATURE_LABELS } from "../../features.mjs";

type FirmRow = {
  id: number | string;
  name: string;
  features: Record<string, boolean>;
};

const FEATURES: string[] = ALL_FEATURES;
const LABELS: Record<string, string> = FEATURE_LABELS;

export function FeatureToggles({ firms }: { firms: FirmRow[] }) {
  const [state, setState] = useState<Record<string, Record<string, boolean>>>(
    () => Object.fromEntries(firms.map((f) => [String(f.id), f.features ?? {}])),
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(firmId: number | string, feature: string, next: boolean) {
    const key = `${firmId}:${feature}`;
    setBusy(key);
    setError(null);
    try {
      const res = await fetch("/api/admin/features", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firm_id: firmId, feature, enabled: next }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      setState((s) => ({ ...s, [String(firmId)]: j.features ?? {} }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  if (firms.length === 0) {
    return (
      <p className="text-sm text-muted">
        No firms onboarded yet. Add one with the onboarding wizard, then roll
        features out here.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-sm border border-red bg-red-tint p-2 text-sm text-ink">
          {error}
        </div>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs uppercase tracking-wide text-muted">
              <th className="py-2 pr-3">Firm</th>
              {FEATURES.map((f) => (
                <th key={f} className="px-2 py-2 font-semibold">
                  {LABELS[f] ?? f}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {firms.map((firm) => {
              const feats = state[String(firm.id)] ?? {};
              return (
                <tr key={String(firm.id)} className="border-b border-line/60">
                  <td className="py-2 pr-3 font-semibold text-ink">{firm.name}</td>
                  {FEATURES.map((f) => {
                    const on = Boolean(feats[f]);
                    const key = `${firm.id}:${f}`;
                    return (
                      <td key={f} className="px-2 py-2">
                        <button
                          type="button"
                          disabled={busy === key}
                          onClick={() => toggle(firm.id, f, !on)}
                          aria-pressed={on}
                          className={`rounded-full px-3 py-1 text-xs font-semibold transition disabled:opacity-50 ${
                            on
                              ? "bg-green text-white"
                              : "border border-line bg-canvas text-muted"
                          }`}
                        >
                          {busy === key ? "…" : on ? "On" : "Off"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted">
        All features default to <span className="font-semibold">off</span>. Turn
        them on firm-by-firm as pilots progress.
      </p>
    </div>
  );
}
