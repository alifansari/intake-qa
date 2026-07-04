// Case-Ready Summary — a SEPARATE analysis pass (scoring/ is never touched).
// Turns one transcript into an attorney-ready intake memo so a lawyer can triage
// in ~60 seconds. The summarizer is INJECTABLE (tests use a deterministic fake;
// the default lazily calls Claude via analysis/case-summary.md). A pure
// normalizer shapes/validates the memo and attaches the mandatory disclaimer.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { engineRoot } from "../engine-root.mjs";

// analysis/ lives at the repo root locally, vendored into web/.engine on Vercel.
const PROMPT_PATH = join(engineRoot(), "analysis", "case-summary.md");

export const SUMMARY_DISCLAIMER =
  "Auto-generated from the call transcript for triage only — not legal advice and not a " +
  "case evaluation. Verify all facts against the recording before acting.";

const STR_FIELDS = ["caller_name", "callback_number", "case_type", "incident_summary"];
const LIST_FIELDS = ["injuries", "treatment", "liability_notes", "key_facts", "open_questions", "urgency_flags"];

function cleanStr(v) {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s.length ? s : null;
}
function cleanList(v) {
  if (!Array.isArray(v)) return [];
  const out = [];
  for (const x of v) {
    const s = cleanStr(typeof x === "string" ? x : x?.text);
    if (s && !out.includes(s)) out.push(s);
  }
  return out;
}

// Pure: normalize a raw memo object into a stable, safe shape + disclaimer.
export function buildCaseSummary(raw = {}) {
  const memo = { disclaimer: SUMMARY_DISCLAIMER };
  for (const f of STR_FIELDS) memo[f] = cleanStr(raw?.[f]);
  for (const f of LIST_FIELDS) memo[f] = cleanList(raw?.[f]);
  return memo;
}

// Render the memo as plain text (for copy-to-clipboard / print). Pure.
export function renderCaseSummaryText(memo) {
  const lines = [];
  lines.push("INTAKE MEMO");
  if (memo.caller_name) lines.push(`Caller: ${memo.caller_name}`);
  if (memo.callback_number) lines.push(`Callback: ${memo.callback_number}`);
  if (memo.case_type) lines.push(`Case type: ${memo.case_type}`);
  lines.push("");
  if (memo.incident_summary) {
    lines.push("What happened:");
    lines.push(memo.incident_summary);
    lines.push("");
  }
  const section = (title, arr) => {
    if (arr && arr.length) {
      lines.push(`${title}:`);
      for (const b of arr) lines.push(`  - ${b}`);
      lines.push("");
    }
  };
  section("Injuries", memo.injuries);
  section("Treatment", memo.treatment);
  section("Liability notes", memo.liability_notes);
  section("Key facts", memo.key_facts);
  section("Open questions for follow-up", memo.open_questions);
  section("Urgency flags", memo.urgency_flags);
  lines.push(`— ${memo.disclaimer}`);
  return lines.join("\n");
}

// --- default (production) summarizer: Claude via analysis/case-summary.md -----
async function defaultSummarizer({ transcript }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is missing");
  const sdk = "@anthropic-ai/sdk";
  const { default: Anthropic } = await import(sdk);
  const client = new Anthropic({ apiKey });
  const system = readFileSync(PROMPT_PATH, "utf8");
  const resp = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    temperature: 0,
    system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: `TRANSCRIPT:\n\n${transcript}` }],
  });
  const text = resp.content.filter((b) => b.type === "text").map((b) => b.text).join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Case summary returned no JSON");
  return JSON.parse(text.slice(start, end + 1));
}

// Orchestrate: summarize (injectable) then normalize (pure).
export async function runCaseSummary({ transcript, summarizer = defaultSummarizer } = {}) {
  const raw = await summarizer({ transcript });
  return buildCaseSummary(raw);
}
