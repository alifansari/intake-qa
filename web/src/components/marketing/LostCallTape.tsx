// "The Tape" — the site's most visceral proof: a signable case walking, in the
// intake's own words. Renders the transcript + the flip-fact today; when a
// synthesized audio file is added at /public/tape/lost-case.mp3 and passed as
// `audioSrc`, the player lights up (see ops/drafts/tape-elevenlabs-script.md).
//
// COMPLIANCE: labeled clearly as an ILLUSTRATIVE, SYNTHESIZED reconstruction of
// a common lost-case pattern, not a real caller (§V truthfulness; no real call
// is used, so §II stays clean). No dollar figure is asserted here.

type Line = { who: "INTAKE" | "CALLER"; name?: string; line: string; flip?: boolean };

const DIALOGUE: Line[] = [
  { who: "INTAKE", name: "Dana", line: "Thanks for calling Morgan and Associates, this is Dana." },
  { who: "CALLER", line: "Hi, um… I was in a car accident a couple days ago and I wasn’t really sure who to call." },
  { who: "INTAKE", line: "Okay. Were you the driver?" },
  { who: "CALLER", line: "Yeah. I was stopped at a red light and a truck rear-ended me. The other driver got a ticket." },
  { who: "INTAKE", line: "Got it. Do you have the police report number?" },
  { who: "CALLER", line: "Not yet. They said it’d be ready next week." },
  { who: "INTAKE", line: "Okay, why don’t you get that and give us a call back once you have it." },
  {
    who: "CALLER",
    line: "Oh. Okay. Um… is there anything else I should be doing? My neck and my back have been really bad since it happened.",
    flip: true,
  },
  { who: "INTAKE", line: "We’ll take a look once you’ve got the report. Have a good one." },
  { who: "CALLER", line: "…Okay. Thanks." },
];

export function LostCallTape({ audioSrc }: { audioSrc?: string }) {
  return (
    <div className="rounded-card border border-hairline bg-surface p-6 sm:p-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="eyebrow text-red">Hear a case walk</p>
          <h3 className="mt-1 font-display text-2xl font-semibold text-ink text-balance">
            Clean liability. A stated injury. Nobody ever called back.
          </h3>
        </div>
        <span className="rounded-pill bg-canvas px-2.5 py-0.5 text-xs font-medium text-faint">
          Illustrative synthesized reconstruction — not a real caller
        </span>
      </div>

      {audioSrc ? (
        <audio controls preload="none" src={audioSrc} className="mt-5 w-full">
          Your browser doesn’t support audio playback.
        </audio>
      ) : null}

      <ol className="mt-6 flex flex-col gap-3">
        {DIALOGUE.map((d, i) => (
          <li
            key={i}
            className={`max-w-[46ch] rounded-card px-4 py-2.5 text-sm leading-relaxed ${
              d.who === "INTAKE"
                ? "self-start bg-canvas text-ink"
                : "self-end bg-surface border border-hairline text-ink"
            } ${d.flip ? "ring-2 ring-red/40" : ""}`}
          >
            <span className="mr-2 text-[11px] font-semibold uppercase tracking-wide text-faint">
              {d.who === "INTAKE" ? d.name ?? "Intake" : "Caller"}
            </span>
            {d.line}
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-card border border-red/30 bg-red-tint/40 p-5">
        <p className="eyebrow text-red">The one question that would have kept it</p>
        <p className="mt-2 text-ink">
          The caller said the injury out loud, with clean liability behind it, and the intake never
          asked a single question about it, then sent them away to “call back.” Nobody did. That case
          signs with the firm that asked: <b>“Tell me about your injuries. Have you seen a doctor?”</b>
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          An independent ear catches the signable case your intake let walk, and names the one move
          that would have kept it. That’s the whole product, in forty seconds.
        </p>
      </div>
    </div>
  );
}
