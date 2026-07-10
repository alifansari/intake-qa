"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  getNode,
  startConversation,
  answerNode,
  promptFor,
  applyInterpretation,
  recordDeflection,
  CASE_VALUE_DEFLECTION,
  LEGAL_ADVICE_DEFLECTION,
  FEE_DEFLECTION,
  type IntakeRecord,
} from "@/lib/intake";

// The guardrail showcase: off-script questions a real visitor asks, each
// answered by its FIXED deflection (guardrails.mjs) — never an improvised
// reply, never a tree jump. Firms can poke these and watch the rails hold.
const OFF_SCRIPT = [
  { key: "case_value", label: "“What's my case worth?”", reply: CASE_VALUE_DEFLECTION },
  { key: "legal_advice", label: "“Should I talk to the insurance company?”", reply: LEGAL_ADVICE_DEFLECTION },
  { key: "fees", label: "“How much do you charge?”", reply: FEE_DEFLECTION },
];

// ---------------------------------------------------------------------------
// The paced chat client. It walks the FIXED tree locally (no LLM decides what
// to ask — see guardrails.mjs) and posts a snapshot of the canonical record
// to /api/intake/lead after every answer, so an abandoned tab is still a
// captured lead. The one optional LLM call (narrative interpretation) happens
// fire-and-forget after the free-text node and only adds data fields.
// ---------------------------------------------------------------------------

interface Msg {
  role: "agent" | "visitor";
  text: string;
}

// What actually happened, in the words a firm would use — the plain-language
// summary leads; the raw record stays one click away for the compliance-minded.
const BUCKET_ACTION: Record<string, string> = {
  book: "Booked a consultation",
  escalate: "Escalated to a human now",
  human_handoff: "Handed to the office",
  decline: "Politely declined (outside practice areas)",
};

function prettyMatter(matter: string): string {
  const words = matter.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : "Not captured";
}

const BUCKET_LABEL: Record<string, { label: string; tone: string }> = {
  book: { label: "BOOK — consultation gets scheduled", tone: "text-accent border-accent/40 bg-accent-tint" },
  escalate: { label: "ESCALATE — immediate attorney attention", tone: "text-red border-red/40 bg-red-tint" },
  human_handoff: { label: "HUMAN HANDOFF — a person reviews", tone: "text-amber border-amber/40 bg-amber-tint" },
  decline: { label: "DECLINE (BY DESIGN) — polite close, captured", tone: "text-muted border-line-strong bg-paper" },
};

export function IntakeChat() {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [record, setRecord] = React.useState<IntakeRecord | null>(null);
  const [nodeId, setNodeId] = React.useState<string | null>(null);
  const [typing, setTyping] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [input, setInput] = React.useState("");
  const [showRecord, setShowRecord] = React.useState(false);
  const leadIdRef = React.useRef<string | null>(null);
  // Snapshots are serialized through this chain so the FIRST save returns the
  // lead id before the next fires — otherwise two racing saves both insert.
  const persistChain = React.useRef<Promise<void>>(Promise.resolve());
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Start (and restart) the conversation.
  const start = React.useCallback(() => {
    const sessionId = crypto.randomUUID();
    const { record: r, nodeId: n } = startConversation(sessionId);
    leadIdRef.current = null;
    setRecord(r);
    setNodeId(n);
    setDone(false);
    setShowRecord(false);
    setMessages([]);
    setTyping(true);
    // Paced delivery of the first (disclosure) message.
    setTimeout(() => {
      setMessages([{ role: "agent", text: promptFor(n, r) ?? "" }]);
      setTyping(false);
    }, 700);
  }, []);

  React.useEffect(() => {
    start();
  }, [start]);

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing, done]);

  // Persist a snapshot (best-effort; the demo works even if this fails).
  // Serialized via persistChain — see the ref comment above.
  function persist(r: IntakeRecord) {
    const snapshot = JSON.parse(JSON.stringify(r)) as IntakeRecord;
    persistChain.current = persistChain.current.then(async () => {
      try {
        const res = await fetch("/api/intake/lead", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ lead_id: leadIdRef.current, record: snapshot }),
        });
        const data = await res.json().catch(() => null);
        if (data?.lead_id) leadIdRef.current = data.lead_id;
      } catch {
        // persistence is best-effort in the demo
      }
    });
  }

  // Optional narrative interpretation (data fields only; never visitor-facing).
  async function interpret(r: IntakeRecord, narrative: string) {
    try {
      const res = await fetch("/api/intake/interpret", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ narrative }),
      });
      const data = await res.json().catch(() => null);
      if (data?.interpreted && data.interpretation) {
        applyInterpretation(r, data.interpretation);
        void persist(r);
      }
    } catch {
      // verbatim narrative already captured
    }
  }

  function advance(answer: unknown, displayText: string) {
    if (!record || !nodeId || done) return;
    const node = getNode(nodeId);
    const result = answerNode(record, nodeId, answer);
    if (result.invalid) return;

    setMessages((m) => [...m, { role: "visitor", text: displayText }]);
    setRecord(result.record);
    setNodeId(result.nodeId);
    setInput("");
    void persist(result.record);

    // Fire the optional interpreter after the narrative node.
    if (node?.field === "incident.narrative" && typeof answer === "string") {
      void interpret(result.record, answer);
    }

    setTyping(true);
    const delay = 650 + Math.min(600, (promptFor(result.nodeId, result.record)?.length ?? 0) * 3);
    setTimeout(() => {
      setMessages((m) => [
        ...m,
        { role: "agent", text: promptFor(result.nodeId, result.record) ?? "" },
      ]);
      setTyping(false);
      if (result.done) setDone(true);
    }, delay);
  }

  // Off-script question → fixed deflection. The tree does not move; the
  // deflection is recorded on the event trail (provable: never improvised).
  function askOffScript(item: (typeof OFF_SCRIPT)[number]) {
    if (!record || done || typing) return;
    recordDeflection(record, item.label, item.key);
    setMessages((m) => [...m, { role: "visitor", text: item.label.replace(/[“”]/g, "") }]);
    void persist(record);
    setTyping(true);
    setTimeout(() => {
      setMessages((m) => [...m, { role: "agent", text: item.reply }]);
      setTyping(false);
    }, 900);
  }

  async function attachFile(file: File) {
    if (!record || !nodeId) return;
    let path: string | null = null;
    try {
      if (leadIdRef.current) {
        const res = await fetch("/api/intake/upload-url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            lead_id: leadIdRef.current,
            filename: file.name,
            content_type: file.type,
            size_bytes: file.size,
          }),
        });
        const data = await res.json().catch(() => null);
        if (data?.configured && data.signedUrl) {
          await fetch(data.signedUrl, {
            method: "PUT",
            headers: { "content-type": file.type || "application/octet-stream" },
            body: file,
          });
          path = data.path;
        }
      }
    } catch {
      // attachment upload is best-effort; the answer still advances
    }
    advance({ filename: file.name, path }, `📎 ${file.name}`);
  }

  const node = nodeId ? getNode(nodeId) : null;
  const bucket = done && record?.bucket ? BUCKET_LABEL[record.bucket] : null;

  return (
    <div className="rounded-card border border-line bg-paper">
      {/* Transcript */}
      <div className="flex max-h-[55vh] min-h-[320px] flex-col gap-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={[
              "max-w-[85%] rounded-card px-3 py-2 text-sm leading-relaxed",
              m.role === "agent"
                ? "self-start border border-line bg-canvas text-ink"
                : "self-end bg-accent text-white",
            ].join(" ")}
          >
            {m.text}
          </div>
        ))}
        {typing ? (
          <div className="self-start rounded-card border border-line bg-canvas px-3 py-2">
            <span className="typing-dots" aria-label="agent is typing">
              <i /><i /><i />
            </span>
            <style>{`
              .typing-dots { display: inline-flex; gap: 4px; align-items: center; height: 1em; }
              .typing-dots i { width: 6px; height: 6px; border-radius: 50%;
                background: var(--color-faint); animation: td-bounce 1.2s infinite ease-in-out; }
              .typing-dots i:nth-child(2) { animation-delay: 0.15s; }
              .typing-dots i:nth-child(3) { animation-delay: 0.3s; }
              @keyframes td-bounce { 0%, 60%, 100% { transform: translateY(0); opacity: .5; }
                30% { transform: translateY(-4px); opacity: 1; } }
            `}</style>
          </div>
        ) : null}

        {/* Terminal state: bucket + the structured record */}
        {done && record && bucket ? (
          <div className="mt-2 flex flex-col gap-3">
            <div className={`rounded-card border px-3 py-2 text-xs font-medium ${bucket.tone}`}>
              Routing decision: {bucket.label}
              <div className="mt-1 font-normal text-faint">
                Confidence {record.confidence != null ? Math.round(record.confidence * 100) : "—"}%
                {Array.isArray(record.routing.reasons)
                  ? ` · ${(record.routing.reasons as string[]).join(", ")}`
                  : ""}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowRecord((s) => !s)}>
                {showRecord ? "Hide" : "Show"} the structured record
              </Button>
              <Button variant="outline" size="sm" onClick={start}>
                Restart demo
              </Button>
            </div>
            {showRecord ? (
              <div className="flex flex-col gap-2">
                {/* Plain-language summary of the same canonical record. */}
                <div className="rounded-card border border-line bg-canvas p-3 text-sm text-ink">
                  <dl className="grid gap-1.5">
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-muted">Caller</dt>
                      <dd className="font-medium">{record.contact.first_name ?? "Not captured"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-muted">Phone</dt>
                      <dd className="font-medium">{record.contact.phone ?? "Not captured"}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-muted">Matter type</dt>
                      <dd className="font-medium">{prettyMatter(record.matter_type)}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-28 shrink-0 text-muted">What happened</dt>
                      <dd className="font-medium">
                        {(record.bucket && BUCKET_ACTION[record.bucket]) ?? "Captured for review"}
                      </dd>
                    </div>
                    {record.consent_at ? (
                      <div className="flex gap-2">
                        <dt className="w-28 shrink-0 text-muted">Consent</dt>
                        <dd className="font-medium">
                          Disclosure acknowledged
                          {record.consent_version ? ` (${record.consent_version})` : ""}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
                {/* The raw record, one click away — nothing hidden. */}
                <details className="rounded-card border border-line bg-canvas">
                  <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-muted">
                    Full structured record (what the firm&apos;s CRM receives)
                  </summary>
                  <pre className="max-h-72 overflow-auto border-t border-line p-3 text-[11px] leading-snug text-muted">
                    {JSON.stringify(
                      {
                        channel: record.channel,
                        matter_type: record.matter_type,
                        bucket: record.bucket,
                        confidence: record.confidence,
                        contact: record.contact,
                        incident: record.incident,
                        path_data: record.path_data,
                        routing: record.routing,
                        consent: { version: record.consent_version, at: record.consent_at },
                        events: record.events.length,
                      },
                      null,
                      2,
                    )}
                  </pre>
                </details>
              </div>
            ) : null}
            <p className="text-[11px] text-faint">
              Demo only: the record above was captured and stored for demonstration — nothing was
              booked, no one was alerted, and no message was sent.
            </p>
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {/* Guardrail showcase: poke the rails, watch them hold. */}
      {!done && messages.length > 1 ? (
        <div className="border-t border-line bg-canvas px-3 py-2">
          <div className="mb-1 text-[10px] font-medium uppercase tracking-wide text-faint">
            Try going off-script — the agent never evaluates, quotes, or advises
          </div>
          <div className="flex flex-wrap gap-1.5">
            {OFF_SCRIPT.map((o) => (
              <button
                key={o.key}
                type="button"
                disabled={typing}
                onClick={() => askOffScript(o)}
                className="rounded-full border border-line-strong bg-paper px-2.5 py-1 text-[11px] text-muted hover:border-accent hover:text-ink"
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* Input row */}
      {!done && node && !typing ? (
        <div className="border-t border-line p-3">
          {node.kind === "choice" ? (
            <div className="flex flex-wrap gap-2">
              {(node.options ?? []).map((o) => (
                <Button key={o.key} variant="outline" size="sm" onClick={() => advance(o.key, o.label)}>
                  {o.label}
                </Button>
              ))}
            </div>
          ) : node.kind === "upload" ? (
            <div className="flex flex-wrap items-center gap-2">
              <label className="cursor-pointer rounded-sm border border-line-strong bg-paper px-3 py-1.5 text-sm text-ink hover:border-accent">
                Attach a photo
                <input
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void attachFile(f);
                  }}
                />
              </label>
              <Button variant="outline" size="sm" onClick={() => advance(null, "Skip for now")}>
                Skip for now
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (input.trim()) advance(input.trim(), input.trim());
              }}
              className="flex gap-2"
            >
              <input
                type={node.kind === "date" ? "date" : node.kind === "phone" ? "tel" : "text"}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                autoFocus
                placeholder={
                  node.kind === "date"
                    ? ""
                    : node.kind === "phone"
                      ? "(916) 555-0100"
                      : "Type your answer…"
                }
                className="flex-1 rounded-sm border border-line-strong bg-paper p-2 text-sm text-ink focus:border-accent focus:outline-none"
              />
              <Button variant="primary" type="submit" disabled={!input.trim()}>
                Send
              </Button>
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
