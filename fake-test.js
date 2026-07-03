#!/usr/bin/env node
// Fake test (Step F): runs a hardcoded transcript through scoring + report,
// skipping AssemblyAI entirely. Verifies the scoring call and the HTML report
// work before you spend any transcription time. Needs only ANTHROPIC_API_KEY.
//
//   node fake-test.js

import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { scoreCall } from "./lib/score-call.js";
import { writeReport } from "./lib/report.js";

const ROOT = new URL(".", import.meta.url).pathname;
const OUTPUT_DIR = join(ROOT, "output");
const CONFIG = join(ROOT, "config", "test-firm.md");

function loadEnv() {
  const p = join(ROOT, ".env");
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    if (k && !(k in process.env)) process.env[k] = t.slice(i + 1).trim();
  }
}

const FAKE_TRANSCRIPT = `[00:00] INTAKE: Meridian Injury Law, this is Danielle, how can I help you?
[00:04] CALLER: Hi, um, I got rear-ended yesterday on the freeway and my neck really hurts. Someone said I should call a lawyer.
[00:12] INTAKE: I'm sorry that happened — are you okay right now? Have you seen a doctor?
[00:17] CALLER: I went to urgent care last night, they said whiplash and told me to follow up with my regular doctor. I've got an appointment Thursday.
[00:26] INTAKE: Okay, good that you're getting looked at. Where exactly did this happen, and do you remember what time?
[00:32] CALLER: On the 580 around 5pm yesterday. Traffic slowed and the guy behind me just didn't stop. There was a witness who pulled over.
[00:41] INTAKE: Did the police come out and make a report?
[00:44] CALLER: Yeah, CHP came. I have the report number. The other driver admitted he was looking at his phone.
[00:51] INTAKE: That's helpful. Do you know if the other driver has insurance, and do you have your own coverage?
[00:57] CALLER: He gave me his insurance card, it's State Farm. I have insurance too but I'm not sure what kind.
[01:04] INTAKE: Okay. And are you missing work because of the injury?
[01:08] CALLER: Yeah, I couldn't go in today, I do delivery driving so I'm on my feet and driving all day.
[01:14] INTAKE: Understood. Here's what I'd like to do — this sounds like exactly the kind of case we handle. Can I get your name and best number, and I'll set you up with an attorney?
[01:23] CALLER: Sure, it's Sam Ortiz, 510-555-0199.
[01:28] INTAKE: Thanks Sam. Someone from our office will give you a call back soon to go over next steps.
[01:34] CALLER: Okay, do you know when? The other insurance already left me a voicemail.
[01:39] INTAKE: Don't give them a recorded statement or sign anything before you talk to us. We'll be in touch. Take care.
[01:46] [CALL ENDS]`;

async function main() {
  loadEnv();
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is missing from .env — create .env first.");
    process.exit(1);
  }
  mkdirSync(OUTPUT_DIR, { recursive: true });

  console.log("Scoring the fake transcript (no audio, ~$0.30)...");
  const score = await scoreCall({
    transcript: FAKE_TRANSCRIPT,
    callId: "faketest",
    firmConfigPath: CONFIG,
    outPath: join(OUTPUT_DIR, "faketest.score.json"),
    rawOutPath: join(OUTPUT_DIR, "faketest.score.raw.txt"),
  });
  console.log(
    `Scored: call_type=${score.call_type}, overall=${score.scores && score.scores.overall}`
  );

  writeReport(score, join(OUTPUT_DIR, "faketest.report.html"), {
    firmName: "Meridian Injury Law",
  });
  console.log(`Report: ${join(OUTPUT_DIR, "faketest.report.html")}`);
  console.log("Open that HTML file in your browser to verify the report looks right.");
}

main().catch((e) => {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
});
