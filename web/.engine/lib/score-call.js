// Scores a formatted transcript with the Claude scoring engine.
// System prompt = scoring/system-prompt.md (verbatim).
// User message  = firm config + three worked examples + the transcript.
// Prompt caching is applied to the stable parts (system prompt, and the
// firm-config + examples block) so repeat runs for the same firm are cheap.

import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "node:fs";
import { buildExampleBlock } from "./examples.js";

const MODEL = "claude-sonnet-4-6";
const ROOT = new URL("..", import.meta.url).pathname;

const SYSTEM_PROMPT_PATH = `${ROOT}scoring/system-prompt.md`;
// Few-shot order per the build spec: example 2 (strong), 1 (lost signable), 3 (critical fail).
const EXAMPLE_PATHS = [
  `${ROOT}scoring/gold-example-2.md`,
  `${ROOT}scoring/gold-example-1.md`,
  `${ROOT}scoring/gold-example-3.md`,
];

function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  const candidate = text.slice(start, end + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function buildCachedContext(firmConfigPath) {
  const firmConfig = readFileSync(firmConfigPath, "utf8");
  const examples = EXAMPLE_PATHS.map((p, i) => buildExampleBlock(p, i + 1)).join(
    "\n\n"
  );
  return `${firmConfig}\n\n${examples}`;
}

// Public: score one call. Returns the parsed JSON object.
// `callId` is stamped into the output. Writes score.json to `outPath`.
export async function scoreCall({
  transcript,
  callId,
  firmConfigPath,
  outPath,
  rawOutPath,
}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing from .env");

  const client = new Anthropic({ apiKey });
  const systemPrompt = readFileSync(SYSTEM_PROMPT_PATH, "utf8");
  const cachedContext = buildCachedContext(firmConfigPath);

  const system = [
    { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
  ];

  const baseUser = [
    {
      type: "text",
      text: cachedContext,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: `NOW SCORE THIS CALL (call_id: ${callId}):\n\n${transcript}`,
    },
  ];

  async function callModel(messages) {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 8000,
      temperature: 0,
      system,
      messages,
    });
    return resp.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
  }

  // First attempt.
  let text = await callModel([{ role: "user", content: baseUser }]);
  let parsed = extractJson(text);

  // Retry once, explicitly demanding valid JSON only.
  if (!parsed) {
    text = await callModel([
      { role: "user", content: baseUser },
      { role: "assistant", content: text },
      {
        role: "user",
        content:
          "That was not parseable as JSON. Return ONLY the JSON object defined in OUTPUT SCHEMA — no prose, no markdown fences.",
      },
    ]);
    parsed = extractJson(text);
  }

  if (!parsed) {
    writeFileSync(rawOutPath, text);
    throw new Error(
      `Model did not return valid JSON after 2 tries. Raw response saved to ${rawOutPath}`
    );
  }

  if (parsed.call_id == null || parsed.call_id === "<from input>") {
    parsed.call_id = callId;
  }
  writeFileSync(outPath, JSON.stringify(parsed, null, 2));
  return parsed;
}
