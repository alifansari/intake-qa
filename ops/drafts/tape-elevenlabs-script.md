# "The Tape" — ElevenLabs generation script (for the website)

Goal: a ~40-second, believably human intake call where a **signable case walks**. This is the site's most visceral proof asset. The transcript is already wired into the site (`LostCallTape` component); this file is how you generate the **audio** that makes it land. Label everywhere: an **illustrative, synthesized reconstruction of a common lost-case pattern — not a real caller** (compliance §V, and it keeps §II clean because no real call is used).

## How to generate it

1. In **ElevenLabs**, use two distinct voices:
   - **INTAKE (Dana)** — a warm-but-rushed front-desk voice (e.g. "Jessica" / "Matilda"). Slightly hurried, a little transactional near the end.
   - **CALLER** — a hesitant, in-pain everyday voice (e.g. "Sam" / "Charlie"). Uncertain, trailing off.
2. Model: **Eleven Multilingual v2** (most human). Stability ~40–50%, Similarity ~75%, Style exaggeration low. Add the `[hesitant]`, `[trailing off]` cues below as delivery notes (say them naturally, don't read the brackets).
3. Generate each line separately per voice, then stitch in any audio editor with ~0.4s gaps (or use ElevenLabs' dialogue/Studio mode). Add faint phone-line room tone if you have it — it sells "this is a real call."
4. Export as **MP3**, place at **`web/public/tape/lost-case.mp3`**, then set `audioSrc="/tape/lost-case.mp3"` on the `<LostCallTape>` in `web/src/app/(marketing)/page.tsx`. The player lights up automatically. Until then the site shows the transcript-only version (still compelling).

## The script (~40s)

> INTAKE (Dana): Thanks for calling Morgan and Associates, this is Dana.
>
> CALLER: [hesitant] Hi, um... I was in a car accident a couple days ago and I wasn't really sure who to call.
>
> INTAKE: Okay. Were you the driver?
>
> CALLER: Yeah. I was stopped at a red light and a truck rear-ended me. The other driver got a ticket.
>
> INTAKE: Got it. Do you have the police report number?
>
> CALLER: Not yet. They said it'd be ready next week.
>
> INTAKE: Okay, why don't you get that and give us a call back once you have it.
>
> CALLER: [uncertain] Oh. Okay. Um... is there anything else I should be doing? My neck and my back have been really bad since it happened.
>
> INTAKE: [rushed] We'll take a look once you've got the report. Have a good one.
>
> CALLER: [trailing off] ...Okay. Thanks.

## Why this call is the proof

- **Liability is clean:** stopped at a red light, rear-ended by a truck, other driver ticketed. This is a signable case.
- **The injury is stated:** "my neck and my back have been really bad since." A real, ongoing injury, said out loud.
- **The flip-fact (what walked it):** the intake person **never asked a single question about the injury or treatment**, and sent the caller away to "call back with the report." Nobody called back. That case signs with the firm that asked "tell me about your injuries — have you seen a doctor?"
- The on-site callout names exactly that one question. That is the entire product in 40 seconds: an independent ear catches the signable case your intake let walk, and tells you the one move that would have kept it.
