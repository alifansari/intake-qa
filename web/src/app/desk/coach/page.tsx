"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect, useCallback } from "react";

/* =============================================================================
   INTAKE QA — LIVE IN-CALL COACH (v1)

   A heads-up display beside a PI intake specialist during a live call. It
   transcribes with the browser's SpeechRecognition and runs the Intake QA rubric
   continuously against the rolling transcript, surfacing the single highest-value
   next move. Two hard constraints, honored:
     1. The numeric score is computed live but NEVER shown; it only modulates the
        ambient color. The full score is revealed AFTER the call ends.
     2. The next-move engine is dynamic (driven by which factors are still open),
        not a fixed script.

   The model calls go through the server proxy at /api/coach so the ANTHROPIC key
   never touches the browser and nothing third-party loads on this page. Fonts are
   the app's self-hosted next/font families via CSS variables.
============================================================================= */

const T = {
  canvas: "#fbfaf7", paper: "#ffffff", ink: "#12161c", inkMuted: "#5b6270",
  faint: "#8a919e", line: "#e7e3da", lineStrong: "#d8d2c6",
  navy: "#14233b", navyDeep: "#0e1a2e", navyTint: "#e8ebf1",
  accent: "#0e7c5a", accentTint: "#e6f1ec",
  alert: "#b23a2e", alertTint: "#f6e7e4",
  amber: "#a6791e", amberTint: "#f6efdd", gold: "#b08324",
  bandExemplary: "#0e7c5a", bandStrong: "#14233b", bandDeveloping: "#a6791e",
  bandCoaching: "#b26a2e", bandIntervention: "#b23a2e",
  serif: "var(--font-serif), Georgia, serif",
  sans: "var(--font-sans), system-ui, sans-serif",
  mono: "var(--font-mono), ui-monospace, monospace",
};

const FACTORS = [
  { key: "liability", label: "Liability", hint: "how it happened · police report · fault" },
  { key: "injury", label: "Injury & treatment", hint: "injuries · ER/surgery · work missed" },
  { key: "insurance", label: "Recovery source", hint: "defendant insurance · UM/UIM · commercial" },
  { key: "statute", label: "Date of loss", hint: "actual date · gov't / med-mal clock" },
];
const LOGISTICS = [
  { key: "contact", label: "Contact info" },
  { key: "represented", label: "Prior-attorney check" },
  { key: "next_step", label: "Specific next step" },
];
const PHASES = ["Rapport", "Incident", "Injuries", "Treatment", "Damages", "Qualify", "Close"];

const STATE_COLOR = {
  on_track: { dot: T.accent, wash: T.accentTint, label: "On track" },
  watch: { dot: T.amber, wash: T.amberTint, label: "Watch" },
  at_risk: { dot: T.alert, wash: T.alertTint, label: "At risk" },
  idle: { dot: T.faint, wash: T.canvas, label: "Ready" },
};

export default function IntakeCoach() {
  type Turn = { who: string; text: string; t: number };
  const [status, setStatus] = useState("idle"); // idle | live | ended
  const [micState, setMicState] = useState("unknown"); // unknown | ok | denied | unsupported
  const [transcript, setTranscript] = useState<Turn[]>([]);
  const [interim, setInterim] = useState("");
  const [speaker, setSpeaker] = useState("CALLER");
  const [live, setLive] = useState<any>(null);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [elapsed, setElapsed] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [err, setErr] = useState("");

  const recogRef = useRef<any>(null);
  const startedAt = useRef<number>(0);
  const lastAnalyzedLen = useRef(0);
  const transcriptRef = useRef<Turn[]>(transcript);
  transcriptRef.current = transcript;
  const speakerRef = useRef(speaker);
  speakerRef.current = speaker;
  const statusRef = useRef(status);
  statusRef.current = status;

  const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, [status]);

  const formatTranscript = useCallback((rows: Turn[]) => {
    return rows.map((r) => `[${mmss(r.t)}] ${r.who}: ${r.text}`).join("\n");
  }, []);

  const runLiveAnalysis = useCallback(async () => {
    const rows = transcriptRef.current;
    if (rows.length === 0) return;
    const body = formatTranscript(rows);
    if (body.length - lastAnalyzedLen.current < 40 && live) return;
    lastAnalyzedLen.current = body.length;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "live", transcript: body, elapsed: mmss(elapsed) }),
      });
      const data = await res.json();
      if (!res.ok || data?.error) {
        setErr("Coach paused. The analysis service is unreachable; transcription continues.");
      } else {
        setLive(data);
        setErr("");
      }
    } catch {
      setErr("Coach paused. The analysis service is unreachable; transcription continues.");
    } finally {
      setAnalyzing(false);
    }
  }, [elapsed, formatTranscript, live]);

  useEffect(() => {
    if (status !== "live") return;
    const id = setInterval(runLiveAnalysis, 4500);
    return () => clearInterval(id);
  }, [status, runLiveAnalysis]);

  const startCall = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setMicState("unsupported"); return; }
    const recog = new SR();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = "en-US";
    recog.onresult = (ev: any) => {
      let interimText = "";
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (text) {
            const t = Math.floor((Date.now() - startedAt.current) / 1000);
            setTranscript((prev) => [...prev, { who: speakerRef.current, text, t }]);
            setInterim("");
            setTimeout(runLiveAnalysis, 250);
          }
        } else {
          interimText += r[0].transcript;
        }
      }
      setInterim(interimText);
    };
    recog.onerror = (e: any) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") setMicState("denied");
    };
    recog.onend = () => { if (statusRef.current === "live") { try { recog.start(); } catch {} } };
    try {
      recog.start();
      recogRef.current = recog;
      startedAt.current = Date.now();
      setMicState("ok");
      setStatus("live");
      setTranscript([]); setLive(null); setFinalReport(null); setElapsed(0);
      lastAnalyzedLen.current = 0;
    } catch { setMicState("denied"); }
  };

  const endCall = async () => {
    if (recogRef.current) { try { recogRef.current.stop(); } catch {} }
    setStatus("ended");
    const rows = transcriptRef.current;
    if (rows.length === 0) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "final", transcript: formatTranscript(rows), elapsed: mmss(elapsed) }),
      });
      const data = await res.json();
      if (res.ok && !data?.error) setFinalReport(data);
      else setErr("Could not assemble the final scorecard. The transcript is preserved below.");
    } catch {
      setErr("Could not assemble the final scorecard. The transcript is preserved below.");
    } finally {
      setAnalyzing(false);
    }
  };

  const ambient = (() => {
    if (status !== "live" || !live) return STATE_COLOR.idle;
    if (live.risk?.active || live.health <= 45) return STATE_COLOR.at_risk;
    if (live.leak?.forming || live.health < 62) return STATE_COLOR.watch;
    return STATE_COLOR.on_track;
  })();

  const bandColor = (band: string) => (({
    exemplary: T.bandExemplary, strong: T.bandStrong, developing: T.bandDeveloping,
    needs_coaching: T.bandCoaching, intervention: T.bandIntervention,
  } as Record<string, string>)[band] || T.navy);

  const factorState = (k: string) => live?.factors?.[k] || "open";
  const factorDot = (st: string) => (st === "captured" ? T.accent : st === "partial" ? T.amber : T.lineStrong);

  return (
    <div style={{ fontFamily: T.sans, color: T.ink, background: T.canvas, borderRadius: 12,
      border: `1px solid ${T.line}`, overflow: "hidden", minHeight: 560 }}>
      <style>{`
        .coach-eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:600;color:${T.inkMuted}}
        .coach-serif{font-family:${T.serif};letter-spacing:-.01em}
        .tnum{font-variant-numeric:tabular-nums;font-family:${T.mono}}
        @keyframes pulseDot{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes riseIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .rise{animation:riseIn .28s ease both}
        .coach-btn{cursor:pointer;border:none;font-family:${T.sans};font-weight:600;font-size:14px;border-radius:999px;padding:11px 22px;transition:background .16s ease,opacity .16s ease}
        .coach-btn:focus-visible{outline:2px solid ${T.navy};outline-offset:2px}
        @media (prefers-reduced-motion: reduce){.rise{animation:none}.pulse{animation:none!important}}
      `}</style>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 22px", borderBottom: `1px solid ${T.line}`, background: T.paper }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: 6, background: T.navy, color: "#fff",
            display: "grid", placeItems: "center", fontFamily: T.serif, fontWeight: 600, fontSize: 15 }}>Q</div>
          <div>
            <div className="coach-eyebrow">Intake QA · live coach</div>
            <div className="coach-serif" style={{ fontSize: 15, fontWeight: 600, marginTop: 1 }}>In-call assist</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 12px",
            borderRadius: 999, background: ambient.wash, border: `1px solid ${T.line}` }}>
            <span className="pulse" style={{ width: 9, height: 9, borderRadius: 999, background: ambient.dot,
              animation: status === "live" ? "pulseDot 1.8s ease-in-out infinite" : "none" }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>{ambient.label}</span>
          </div>
          <span className="tnum" style={{ fontSize: 15, color: T.inkMuted }}>{mmss(elapsed)}</span>
        </div>
      </div>

      {/* IDLE */}
      {status === "idle" && (
        <div style={{ padding: "48px 22px", maxWidth: 620, margin: "0 auto", textAlign: "center" }}>
          <h1 className="coach-serif" style={{ fontSize: 30, fontWeight: 600, margin: "0 0 12px", lineHeight: 1.15 }}>
            The coach listens so you can focus on the caller.
          </h1>
          <p style={{ color: T.inkMuted, fontSize: 15, lineHeight: 1.55, margin: "0 0 28px" }}>
            It stays quiet while the call goes well and surfaces one move when it matters, driven by
            your firm&apos;s scoring rubric. The grade is kept off-screen during the call; you&apos;ll
            see the full scorecard the moment you hang up.
          </p>
          <button className="coach-btn" style={{ background: T.accent, color: "#fff" }} onClick={startCall}>
            Start call
          </button>
          {micState === "unsupported" && (
            <p style={{ color: T.alert, fontSize: 13, marginTop: 18 }}>
              This browser doesn&apos;t support live speech recognition. Use Chrome or Edge on desktop.
            </p>
          )}
          {micState === "denied" && (
            <p style={{ color: T.alert, fontSize: 13, marginTop: 18 }}>
              Microphone access was blocked. Allow the mic in your browser&apos;s site settings, then start again.
            </p>
          )}
          <p style={{ color: T.faint, fontSize: 12, marginTop: 26, lineHeight: 1.5 }}>
            Speaker tagging is manual in this preview. Tap the toggle to mark who&apos;s talking. In
            production the phone system feeds diarized audio automatically.
          </p>
        </div>
      )}

      {/* LIVE */}
      {status === "live" && (
        <div style={{ display: "grid", gridTemplateColumns: "1.35fr 1fr", gap: 0, minHeight: 460 }}>
          <div style={{ padding: "24px 26px", borderRight: `1px solid ${T.line}`, background: ambient.wash,
            transition: "background .5s ease", display: "flex", flexDirection: "column" }}>
            {live?.risk?.active ? (
              <div className="rise" key={"risk-" + live.risk.code} style={{ background: T.paper,
                border: `2px solid ${T.alert}`, borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: T.alert,
                    textTransform: "uppercase" }}>Compliance · {live.risk.code}</span>
                </div>
                <div className="coach-serif" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.3, color: T.ink }}>
                  {live.risk.message}
                </div>
              </div>
            ) : live?.leak?.forming ? (
              <div className="rise" key={"leak-" + (live.leak.message || "").slice(0, 12)} style={{ background: T.paper,
                border: `2px solid ${T.amber}`, borderRadius: 10, padding: "18px 20px" }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: T.amber,
                  textTransform: "uppercase", marginBottom: 8 }}>Leak forming · save it</div>
                <div className="coach-serif" style={{ fontSize: 19, fontWeight: 600, lineHeight: 1.32, color: T.ink }}>
                  {live.leak.message}
                </div>
              </div>
            ) : (
              <>
                <div className="coach-eyebrow" style={{ marginBottom: 10 }}>Next move</div>
                {live?.next_move?.say ? (
                  <div className="rise" key={live.next_move.say.slice(0, 20)}>
                    <div className="coach-serif" style={{ fontSize: 23, fontWeight: 600, lineHeight: 1.32,
                      color: T.ink, marginBottom: 12 }}>
                      {live.next_move.say}
                    </div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: T.paper,
                      border: `1px solid ${T.line}`, borderRadius: 999, padding: "4px 12px" }}>
                      <span style={{ width: 6, height: 6, borderRadius: 999,
                        background: live.next_move.kind === "ask" || live.next_move.kind === "close"
                          ? T.accent : live.next_move.kind === "connection" ? T.navy : T.amber }} />
                      <span style={{ fontSize: 12, color: T.inkMuted }}>{live.next_move.why}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ color: T.inkMuted, fontSize: 16, marginTop: 4 }}>On track. Listening.</div>
                )}
              </>
            )}
            <div style={{ marginTop: "auto", paddingTop: 20 }}>
              {live?.confidence === "low" && (
                <div style={{ fontSize: 12, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: T.faint }} />
                  Reading is tentative. Verify before acting on it.
                </div>
              )}
              {err && <div style={{ fontSize: 12, color: T.alert, marginTop: 6 }}>{err}</div>}
            </div>
          </div>

          <div style={{ padding: "22px 22px", background: T.paper, display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div className="coach-eyebrow" style={{ marginBottom: 9 }}>Where the call is</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {PHASES.map((p) => {
                  const on = live?.phase === p;
                  return (
                    <span key={p} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 999,
                      background: on ? T.navy : "transparent", color: on ? "#fff" : T.faint,
                      border: `1px solid ${on ? T.navy : T.line}`, fontWeight: on ? 600 : 400,
                      transition: "all .3s ease" }}>{p}</span>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="coach-eyebrow" style={{ marginBottom: 10 }}>Must capture</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {FACTORS.map((f) => {
                  const st = factorState(f.key);
                  return (
                    <div key={f.key} style={{ display: "flex", alignItems: "flex-start", gap: 9 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 999, marginTop: 3,
                        background: factorDot(st), flexShrink: 0, transition: "background .3s ease",
                        boxShadow: st === "captured" ? `0 0 0 3px ${T.accentTint}` : "none" }} />
                      <div>
                        <div style={{ fontSize: 13.5, fontWeight: 500, color: st === "open" ? T.inkMuted : T.ink }}>{f.label}</div>
                        <div style={{ fontSize: 11.5, color: T.faint, marginTop: 1 }}>{f.hint}</div>
                      </div>
                      {st === "partial" && (
                        <span style={{ marginLeft: "auto", fontSize: 10.5, color: T.amber,
                          fontWeight: 600, textTransform: "uppercase", letterSpacing: ".04em" }}>partial</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="coach-eyebrow" style={{ marginBottom: 10 }}>Before you hang up</div>
              <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
                {LOGISTICS.map((l) => {
                  const done = live?.logistics?.[l.key];
                  return (
                    <span key={l.key} style={{ fontSize: 12, padding: "5px 11px", borderRadius: 999,
                      background: done ? T.accentTint : T.canvas, color: done ? T.accent : T.inkMuted,
                      border: `1px solid ${done ? T.accent : T.line}`, fontWeight: done ? 600 : 400,
                      transition: "all .3s ease" }}>
                      {done ? "✓ " : ""}{l.label}
                    </span>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: "auto", fontSize: 11, color: T.faint, display: "flex", alignItems: "center", gap: 6 }}>
              <span className="pulse" style={{ width: 6, height: 6, borderRadius: 999,
                background: analyzing ? T.accent : T.lineStrong,
                animation: analyzing ? "pulseDot 1s ease-in-out infinite" : "none" }} />
              {analyzing ? "Reading the call…" : "Listening"}
            </div>
          </div>
        </div>
      )}

      {/* LIVE: speaker toggle + transcript */}
      {status === "live" && (
        <div style={{ borderTop: `1px solid ${T.line}`, background: T.paper, padding: "14px 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
            <span className="coach-eyebrow">Speaking now</span>
            <div style={{ display: "flex", gap: 6 }}>
              {["CALLER", "INTAKE"].map((who) => (
                <button key={who} className="coach-btn" onClick={() => setSpeaker(who)}
                  style={{ padding: "6px 14px", fontSize: 12.5,
                    background: speaker === who ? T.navy : T.canvas,
                    color: speaker === who ? "#fff" : T.inkMuted,
                    border: `1px solid ${speaker === who ? T.navy : T.line}` }}>
                  {who === "CALLER" ? "Caller" : "You"}
                </button>
              ))}
            </div>
            <button className="coach-btn" onClick={endCall}
              style={{ marginLeft: "auto", background: T.alert, color: "#fff", padding: "8px 18px", fontSize: 13 }}>
              End call
            </button>
          </div>
          <div style={{ maxHeight: 92, overflowY: "auto", fontSize: 13, lineHeight: 1.5 }}>
            {transcript.slice(-6).map((r, i) => (
              <div key={i} style={{ marginBottom: 3 }}>
                <span className="tnum" style={{ color: T.faint, fontSize: 11, marginRight: 7 }}>{mmss(r.t)}</span>
                <span style={{ fontWeight: 600, color: r.who === "CALLER" ? T.navy : T.accent, fontSize: 12 }}>
                  {r.who === "CALLER" ? "Caller" : "You"}:
                </span>{" "}
                <span style={{ color: T.ink }}>{r.text}</span>
              </div>
            ))}
            {interim && (
              <div style={{ color: T.faint, fontStyle: "italic" }}>
                <span style={{ fontWeight: 600, fontSize: 12 }}>{speaker === "CALLER" ? "Caller" : "You"}:</span> {interim}
              </div>
            )}
            {transcript.length === 0 && !interim && (
              <div style={{ color: T.faint }}>Waiting for the first words…</div>
            )}
          </div>
        </div>
      )}

      {/* ENDED: scorecard */}
      {status === "ended" && (
        <div style={{ padding: "26px 22px", maxWidth: 760, margin: "0 auto" }}>
          {analyzing && !finalReport && (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.inkMuted }}>
              <div className="pulse" style={{ width: 10, height: 10, borderRadius: 999, background: T.accent,
                margin: "0 auto 14px", animation: "pulseDot 1s ease-in-out infinite" }} />
              Assembling the scorecard from the full call…
            </div>
          )}

          {finalReport && (
            <div className="rise">
              <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
                <div className="coach-serif tnum" style={{ fontSize: 46, fontWeight: 600,
                  color: bandColor(finalReport.band), lineHeight: 1 }}>{finalReport.overall}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: bandColor(finalReport.band),
                    textTransform: "capitalize" }}>{(finalReport.band || "").replace("_", " ")}</div>
                  <div style={{ fontSize: 12, color: T.faint }}>confidence: {finalReport.confidence}</div>
                </div>
                <span style={{ marginLeft: "auto", fontSize: 12.5, padding: "5px 12px", borderRadius: 999,
                  background: finalReport.signability === "likely_signable" ? T.accentTint : T.canvas,
                  color: finalReport.signability === "likely_signable" ? T.accent : T.inkMuted,
                  border: `1px solid ${T.line}`, fontWeight: 600 }}>
                  {(finalReport.signability || "unknown").replace(/_/g, " ")}
                </span>
              </div>

              {finalReport.lost_signable_case && (
                <div style={{ background: T.alertTint, border: `1px solid ${T.alert}`, borderRadius: 10,
                  padding: "12px 16px", margin: "12px 0", color: T.alert, fontSize: 14, fontWeight: 600 }}>
                  Lost signable case. This qualified and no confident ask secured the sign.
                </div>
              )}

              {(finalReport.critical_fails || []).length > 0 && (
                <div style={{ margin: "16px 0" }}>
                  <div className="coach-eyebrow" style={{ marginBottom: 8, color: T.alert }}>Critical fails</div>
                  {finalReport.critical_fails.map((cf: any, i: number) => (
                    <div key={i} style={{ border: `1px solid ${T.alert}`, borderRadius: 8, padding: "10px 14px",
                      marginBottom: 8, background: T.paper }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.alert }}>{cf.code} · {cf.name}</div>
                      {cf.quote && <div style={{ fontSize: 12.5, color: T.inkMuted, fontStyle: "italic", margin: "4px 0" }}>&ldquo;{cf.quote}&rdquo;</div>}
                      <div style={{ fontSize: 12.5, color: T.ink }}>{cf.why}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, margin: "16px 0" }}>
                <div style={{ background: T.accentTint, borderRadius: 10, padding: "14px 16px" }}>
                  <div className="coach-eyebrow" style={{ color: T.accent, marginBottom: 6 }}>What worked</div>
                  <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.45 }}>{finalReport.top_strength?.behavior}</div>
                </div>
                <div style={{ background: T.navyTint, borderRadius: 10, padding: "14px 16px" }}>
                  <div className="coach-eyebrow" style={{ color: T.navy, marginBottom: 6 }}>The one thing</div>
                  <div style={{ fontSize: 13.5, color: T.ink, lineHeight: 1.45 }}>{finalReport.one_thing?.behavior}</div>
                  {finalReport.one_thing?.model_utterance && (
                    <div style={{ fontSize: 12.5, color: T.inkMuted, fontStyle: "italic", marginTop: 8,
                      paddingTop: 8, borderTop: `1px solid ${T.lineStrong}` }}>
                      Try: &ldquo;{finalReport.one_thing.model_utterance}&rdquo;
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "14px 0" }}>
                {FACTORS.map((f) => {
                  const st = finalReport.captured?.[f.key] || "open";
                  return (
                    <span key={f.key} style={{ fontSize: 12, padding: "5px 11px", borderRadius: 999,
                      background: st === "captured" ? T.accentTint : st === "partial" ? T.amberTint : T.canvas,
                      color: st === "captured" ? T.accent : st === "partial" ? T.amber : T.inkMuted,
                      border: `1px solid ${T.line}`, fontWeight: 500 }}>
                      {f.label}: {st}
                    </span>
                  );
                })}
              </div>

              {(finalReport.open_questions || []).length > 0 && (
                <div style={{ margin: "16px 0" }}>
                  <div className="coach-eyebrow" style={{ marginBottom: 8 }}>Follow up on</div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: T.ink, lineHeight: 1.6 }}>
                    {finalReport.open_questions.map((q: any, i: number) => <li key={i}>{q}</li>)}
                  </ul>
                </div>
              )}

              <div style={{ background: T.paper, border: `1px solid ${T.line}`, borderRadius: 10,
                padding: "14px 16px", margin: "16px 0", fontSize: 13.5, lineHeight: 1.55, color: T.ink }}>
                {finalReport.summary}
              </div>

              <button className="coach-btn" style={{ background: T.navy, color: "#fff" }}
                onClick={() => { setStatus("idle"); setTranscript([]); setLive(null); setFinalReport(null); setErr(""); }}>
                New call
              </button>
            </div>
          )}

          {err && !finalReport && <div style={{ color: T.alert, fontSize: 13, marginTop: 12 }}>{err}</div>}
        </div>
      )}
    </div>
  );
}
