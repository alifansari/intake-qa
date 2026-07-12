#!/usr/bin/env node
// scoring-v2/score-v2.js — the Engine v2 harness.
//
//   node scoring-v2/score-v2.js <transcript.txt | *.transcript.json | audio>
//   node scoring-v2/score-v2.js --fixture            # built-in fake transcript
//   node scoring-v2/score-v2.js <input> --config <firm-config-v2.md>
//
// Pipeline: transcript → ONE LLM call (extraction + dimension reads, temp 0,
// pinned model, prompt caching) → code stages (gates → decision table →
// confidence/abstention) → full v2 verdict JSON in output/.
//
// v1 is reused by IMPORT only (lib/transcribe.js for audio inputs); nothing
// under scoring/ is read or written by this harness. Compliance rails are
// structural: no dollars, no computed dates, no terminal dispositions.

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { buildAllGoldBlocks } from "./lib/golds.mjs";
import { parseModelResponse } from "./lib/parse.mjs";
import { validateLlmOutput } from "./lib/validate.mjs";
import { evaluateGates } from "./lib/gates.mjs";
import { decideDisposition } from "./lib/decision-table.mjs";
import { assessConfidence } from "./lib/confidence.mjs";
import { splitFirmConfig, parsePartB, normalizeConfig } from "./lib/config.mjs";
import { classifyCallQuality } from "./lib/observability.mjs";

// Pinned model — same id v1 uses in lib/score-call.js. Changing it is a
// calibration change (full gold rerun + QWK check per README).
export const MODEL = "claude-sonnet-4-6";

const PKG_ROOT = fileURLToPath(new URL(".", import.meta.url)); // scoring-v2/
const REPO_ROOT = fileURLToPath(new URL("..", import.meta.url));
const GOLDS_DIR = join(PKG_ROOT, "golds");
const DEFAULT_CONFIG = join(PKG_ROOT, "firm-config-template.md");
const OUTPUT_DIR = join(REPO_ROOT, "output");
const AUDIO_EXTS = new Set([".mp3", ".m4a", ".wav"]);

// Same fixture transcript as the root `npm run fake-test` uses — no audio,
// no real caller, needs only ANTHROPIC_API_KEY.
export const FIXTURE_TRANSCRIPT = `[00:00] INTAKE: Meridian Injury Law, this is Danielle, how can I help you?
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

// Minimal .env loader (root .env), mirroring score.js — no dotenv dependency.
export function loadEnv() {
  const p = join(REPO_ROOT, ".env");
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

// ---------------------------------------------------------------------------
// Core: score one transcript through the full v2 pipeline.
export async function scoreV2({ transcript, callId, firmConfigPath, pkgRoot = PKG_ROOT }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing");

  // pkgRoot override lets a bundled runtime (Vercel) resolve the calibration
  // files by an explicit engine root instead of import.meta.url, which points
  // at the chunk when bundled (same reason web/src/engine-root.mjs exists).
  const cfgPath = firmConfigPath || join(pkgRoot, "firm-config-template.md");
  const systemPrompt = readFileSync(join(pkgRoot, "system-prompt.md"), "utf8");
  const configText = readFileSync(cfgPath, "utf8");
  const { partA, partBYaml } = splitFirmConfig(configText);
  if (!partA) throw new Error(`No PART A block found in ${cfgPath}`);
  const config = normalizeConfig(parsePartB(partBYaml));

  // THE WALL: only PART A + golds enter the prompt. PART B (posture,
  // thresholds, capital) stays code-side.
  const stablePrefix = `${partA}\n\n${buildAllGoldBlocks(join(pkgRoot, "golds"))}`;

  const client = new Anthropic({ apiKey });
  const system = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
  ];
  const baseUser = [
    { type: "text", text: stablePrefix, cache_control: { type: "ephemeral" } },
    {
      type: "text",
      text: `NOW ANALYZE THIS CALL (call_id: ${callId}). Free-text <analysis> first, then exactly one JSON object per the OUTPUT SCHEMA.\n\n${transcript}`,
    },
  ];

  async function callModel(messages) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 16000,
      temperature: 0,
      system,
      messages,
    });
    return resp.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  // First attempt, then one strict-JSON retry (v1 pattern).
  let text = await callModel([{ role: "user", content: baseUser }]);
  let { analysis, parsed } = parseModelResponse(text);
  if (!parsed) {
    text = await callModel([
      { role: "user", content: baseUser },
      { role: "assistant", content: text },
      {
        role: "user",
        content:
          "That was not parseable. Emit the <analysis> block, then ONE valid JSON object exactly per the OUTPUT SCHEMA — no markdown fences, no prose after the JSON.",
      },
    ]);
    ({ analysis, parsed } = parseModelResponse(text));
  }
  if (!parsed) {
    const err = new Error("Model did not return parseable v2 JSON after 2 tries.");
    err.raw = text;
    throw err;
  }

  const validation = validateLlmOutput(parsed);
  if (!validation.ok) {
    const err = new Error(
      `LLM output failed structural validation: ${validation.errors.join("; ")}`
    );
    err.raw = text;
    throw err;
  }
  if (parsed.call_id == null || String(parsed.call_id).startsWith("<")) {
    parsed.call_id = callId;
  }

  // Code stages — deterministic, versioned, unit-tested.
  const gates = evaluateGates(parsed.extracted_facts, config);
  const confidence = assessConfidence(parsed, config);
  const decision = decideDisposition({ llmOutput: parsed, gates, config });
  // v2.2: call-quality signal — was the rep's must-ask FLOOR captured? Distinct
  // from confidence: a caller not knowing policy limits is normal; a rep never
  // establishing the incident date is a call-quality problem (re-contact),
  // never a penalty against the caller.
  const call_quality = classifyCallQuality({
    facts: parsed.extracted_facts,
    question_capture: parsed.question_capture,
  });

  // Abstention withholds the recommendation entirely (no disposition leaves
  // the engine on an abstained call — it routes to attorney review).
  const recommendation = confidence.abstained
    ? {
        recommended_disposition: null,
        withheld: true,
        route: "attorney_review",
        reasons: confidence.reasons,
        compliance: decision.compliance,
      }
    : decision;

  // Citations index: every quote the model used, for the report layer.
  const citations = collectCitations(parsed);

  return {
    engine: "scoring-v2",
    schema_version: "2.2",
    call_id: parsed.call_id,
    model: MODEL,
    generated_at: new Date().toISOString(),
    transcript_quality: parsed.transcript_quality,
    call_type: parsed.call_type,
    facts: parsed.extracted_facts,
    question_capture: parsed.question_capture,
    dimension_reads: parsed.dimension_reads,
    resource_tiers: parsed.resource_tiers,
    gates: {
      g1_underwater: publicGate(gates.g1),
      g2_deadline_trap: publicGate(gates.g2),
      g3_client_risk: publicGate(gates.g3),
      g4_trial_capital: publicGate(gates.g4),
      allowed_dispositions: gates.allowed,
    },
    recommendation,
    tiers: {
      value_tier: confidence.abstained ? "indeterminate" : decision.value_tier,
      effort_tier: parsed.resource_tiers.effort_tier.tier,
      carry_tier: parsed.resource_tiers.carry_tier.tier,
      capital_tier: parsed.resource_tiers.capital_tier.tier,
    },
    confidence,
    call_quality,
    abstained: confidence.abstained,
    citations,
    analysis_excerpt: analysis.slice(0, 2000),
  };
}

function publicGate(g) {
  return {
    fired: g.fired,
    trigger_quote: g.trigger_quote,
    rationale: g.rationale,
    capped_dispositions: g.capped_dispositions,
    flags: g.flags,
  };
}

function collectCitations(parsed) {
  const out = [];
  const push = (source, e) => {
    if (e && typeof e === "object" && !Array.isArray(e) && e.quote)
      out.push({ source, quote: e.quote, timestamp: e.timestamp || null, speaker: e.speaker || null });
    if (Array.isArray(e)) for (const x of e) push(source, x);
  };
  for (const [id, f] of Object.entries(parsed.extracted_facts || {}))
    push(`fact:${id}`, f.evidence);
  for (const [id, d] of Object.entries(parsed.dimension_reads || {}))
    push(`dimension:${id}`, d.evidence);
  for (const [id, t] of Object.entries(parsed.resource_tiers || {}))
    push(`tier:${id}`, t.evidence);
  return out;
}

// ---------------------------------------------------------------------------
// Input handling: .txt / .transcript.json / audio (via v1 transcribe, by
// import) / --fixture.
export async function resolveTranscript(target, firmConfigPath) {
  if (target === "--fixture") return { transcript: FIXTURE_TRANSCRIPT, callId: "fixture-v2" };
  if (!existsSync(target)) throw new Error(`Not found: ${target}`);
  const ext = extname(target).toLowerCase();
  const callId = basename(target, ext);
  if (ext === ".json") {
    const j = JSON.parse(readFileSync(target, "utf8"));
    const t = j.formatted_transcript || j.transcript;
    if (!t) throw new Error(`${target} has no formatted_transcript/transcript field`);
    return { transcript: t, callId: callId.replace(/\.transcript$/, "") };
  }
  if (AUDIO_EXTS.has(ext)) {
    // Reuse v1's transcription BY IMPORT — never by modification.
    const { transcribeFile } = await import("../lib/transcribe.js");
    mkdirSync(OUTPUT_DIR, { recursive: true });
    const t = await transcribeFile(
      target,
      join(OUTPUT_DIR, `${callId}.transcript.json`),
      firmConfigPath
    );
    return { transcript: t.formatted_transcript, callId };
  }
  return { transcript: readFileSync(target, "utf8"), callId };
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const cfgIdx = args.indexOf("--config");
  const firmConfigPath = cfgIdx !== -1 ? args[cfgIdx + 1] : DEFAULT_CONFIG;
  const target = args.filter(
    (a, i) => a !== "--config" && (cfgIdx === -1 || i !== cfgIdx + 1)
  )[0];
  if (!target) {
    console.error(
      "Usage: node scoring-v2/score-v2.js <transcript.txt | x.transcript.json | audio | --fixture> [--config firm-config-v2.md]"
    );
    process.exit(1);
  }

  const { transcript, callId } = await resolveTranscript(target, firmConfigPath);
  console.log(`Engine v2 · scoring ${callId} (model ${MODEL}, temp 0, cached prefix)...`);
  const verdict = await scoreV2({ transcript, callId, firmConfigPath });

  mkdirSync(OUTPUT_DIR, { recursive: true });
  const outPath = join(OUTPUT_DIR, `${callId}.v2-verdict.json`);
  writeFileSync(outPath, JSON.stringify(verdict, null, 2));

  const r = verdict.recommendation;
  console.log(
    verdict.abstained
      ? `ABSTAINED → attorney review (${verdict.confidence.reasons.join(", ")})`
      : `recommendation: ${r.recommended_disposition} · value tier: ${verdict.tiers.value_tier} · confidence: ${verdict.confidence.tier}`
  );
  const fired = Object.entries(verdict.gates)
    .filter(([k, g]) => k.startsWith("g") && g.fired)
    .map(([k]) => k);
  if (fired.length) console.log(`gates fired: ${fired.join(", ")}`);
  console.log(`verdict: ${outPath}`);
}

// Run main() only when invoked directly (not when imported by compare/tests).
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((e) => {
    console.error(`\nError: ${e.message}`);
    if (e.raw) {
      const rawPath = join(OUTPUT_DIR, "v2-last-raw-response.txt");
      try {
        mkdirSync(OUTPUT_DIR, { recursive: true });
        writeFileSync(rawPath, e.raw);
        console.error(`Raw model response saved to ${rawPath}`);
      } catch {}
    }
    process.exit(1);
  });
}
