"use client";
import * as React from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

// Lenient readers over the frozen scoring object (same passthrough philosophy as
// the rest of the app — the score schema is not redesigned here).
type Json = Record<string, unknown>;
function obj(v: unknown): Json {
  return v && typeof v === "object" ? (v as Json) : {};
}
function num(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}
function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

interface Props {
  id: string;
  firmId: string;
  initialDone: boolean;
  initialTranscript: string | null;
  initialScoring: unknown;
}

export function RecordingAnalysis({
  id,
  firmId,
  initialDone,
  initialTranscript,
  initialScoring,
}: Props) {
  const [done, setDone] = React.useState(initialDone);
  const [transcript, setTranscript] = React.useState(initialTranscript);
  const [scoring, setScoring] = React.useState<unknown>(initialScoring);
  const [error, setError] = React.useState<string | null>(null);
  const [slow, setSlow] = React.useState(false);

  // Poll while processing. A failed pipeline or a very long run must never
  // leave the founder staring at an eternal spinner: an "error" status stops
  // the poll and says so, and past ~2 minutes we admit it's taking long.
  React.useEffect(() => {
    if (done) return;
    let stop = false;
    let polls = 0;
    const tick = async () => {
      try {
        const r = await fetch(`/api/studio/recordings/${id}`);
        const data = await r.json();
        if (stop) return;
        if (data.status === "done") {
          setTranscript(data.transcript);
          setScoring(data.scoring);
          setDone(true);
          return;
        }
        if (data.status === "error") {
          setError("Processing hit a snag on our side. Restart it below — the audio was not lost.");
          return; // stop polling; the restart button re-arms it
        }
      } catch {
        /* transient fetch hiccup — keep polling */
      }
      polls += 1;
      if (polls >= 40) setSlow(true); // ~2 minutes
      if (!stop) setTimeout(tick, 3000);
    };
    const t = setTimeout(tick, 3000);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [id, done]);

  async function retry() {
    setError(null);
    setSlow(false);
    try {
      await fetch(`/api/studio/recordings/${id}/process`, { method: "POST" });
      setDone(false);
    } catch {
      setError("Could not restart processing.");
    }
  }

  if (!done) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm font-medium text-ink">Transcribing &amp; scoring…</p>
          <p className="text-xs text-muted">
            Running the leak-audit pipeline. The audio is deleted the moment it is transcribed.
          </p>
          {slow && !error ? (
            <p className="text-xs text-muted">
              Taking longer than usual — long calls can. If it looks stuck, restart below;
              nothing is lost.
            </p>
          ) : null}
          {error ? <p className="text-xs text-red">{error}</p> : null}
          <Button variant="outline" size="sm" onClick={retry}>
            Restart processing
          </Button>
        </CardContent>
      </Card>
    );
  }

  const s = obj(scoring);
  const scores = obj(s.scores);
  const overall = num(scores.overall);
  const band = str(scores.band);
  const signability = str(s.case_signability);
  const alerts = obj(s.alerts);
  const lostSignable = alerts.lost_signable_case === true;
  const criticalFails = Array.isArray(s.critical_fails) ? (s.critical_fails as unknown[]) : [];
  const summary = str(s.summary);

  return (
    <div className="flex flex-col gap-6">
      {/* Analysis panel — the EVIDENCE the scorecard/AI narrative draws on. */}
      <Card>
        <CardContent className="py-6">
          <h2 className="eyebrow mb-4">Leak-audit analysis</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat
              label="Handling score (0–100)"
              value={overall == null ? "—" : String(overall)}
            />
            <Stat label="Overall read" value={band ?? "—"} />
            <Stat label="Case signability" value={signability ?? "—"} />
            <Stat
              label="Signable case walked?"
              value={lostSignable ? "Yes" : "No"}
              alert={lostSignable}
            />
          </div>

          {criticalFails.length > 0 ? (
            <div className="mt-4 rounded-sm border border-red/30 bg-red-tint p-3">
              <div className="text-xs font-semibold text-red">
                Critical fails flagged by the engine
              </div>
              <ul className="mt-1 list-disc pl-5 text-xs text-ink">
                {criticalFails.map((cf, i) => {
                  const c = obj(cf);
                  return (
                    <li key={i}>
                      {str(c.name) ?? str(c.code) ?? "critical fail"}
                      {str(c.quote) ? ` — “${str(c.quote)}”` : ""}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}

          {summary ? (
            <p className="mt-4 max-w-[70ch] text-sm text-ink">{summary}</p>
          ) : null}

          <p className="mt-4 text-xs text-faint">
            This engine analysis supplies the EVIDENCE (transcript, flagged failure, cited
            excerpt) for the scorecard. It does NOT set the headline grade — that is computed by
            the deterministic rubric from your structured inputs.
          </p>

          <div className="mt-4">
            <Link
              href={`/studio/scorecards/new?recording=${id}&firm=${firmId}`}
              className="inline-flex"
            >
              <Button variant="primary" size="sm">
                Build the Spot Check scorecard →
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Transcript viewer. */}
      <Card>
        <CardContent className="py-6">
          <h2 className="eyebrow mb-3">Transcript</h2>
          <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-sm border border-line bg-canvas p-4 text-xs leading-relaxed text-ink">
            {transcript ?? "No transcript."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, alert }: { label: string; value: string; alert?: boolean }) {
  return (
    <div>
      <div className="eyebrow">{label}</div>
      <div className={`tnum text-lg font-semibold ${alert ? "text-red" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}
