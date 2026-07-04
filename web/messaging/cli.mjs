// Approval-queue + kill-switch CLI (operator use). This is the human-in-the-loop
// control surface: review drafts, approve/reject/edit them, run the gated sender,
// and throw the kill switch. NOTHING sends without an explicit `approve` then
// `send`, and while TEST_MODE=true every send is simulated (logged, not sent).
//
//   node messaging/cli.mjs list
//     Show all outbound messages awaiting approval (status 'drafted').
//
//   node messaging/cli.mjs approve <messageId> [approvedBy]
//     Approve a drafted message (drafted -> approved). It becomes send-eligible.
//
//   node messaging/cli.mjs reject <messageId>
//     Reject a drafted message (kept out of the sender).
//
//   node messaging/cli.mjs edit <messageId> "<new text>"
//     Rewrite a drafted message body (stays drafted; re-validated).
//
//   node messaging/cli.mjs send [messageId|all]
//     Run the compliance chokepoint over approved messages. TEST_MODE mocks.
//
//   node messaging/cli.mjs kill on|off [firmId]
//     Flip the per-firm kill switch (all firms, or one). Halts sending.
//
//   node messaging/cli.mjs handoff <conversationId> esign
//     Start an e-sign handoff (Dropbox Sign, always test mode). Sets the
//     conversation handed_off; prints the signing URL.
//
//   node messaging/cli.mjs handoff <conversationId> callback "<ISO time>"
//     Book a callback at the given time. Records a 'booked_callback' outcome.
//
//   node messaging/cli.mjs signed <conversationId>
//     Manually mark a conversation as signed -> outcome + recovery.
//
//   node messaging/cli.mjs outcome <conversationId> <no_response|lost|booked_callback|opted_out>
//     Record a non-signed outcome.
//
//   node messaging/cli.mjs report <firmId> [ISO date]
//     Generate the weekly reconciliation report for a firm (week defaults to
//     today). In TEST_MODE it renders to an HTML file; otherwise it emails.
//
//   node messaging/cli.mjs digest <firmId>
//     Generate the daily approval-queue digest for a firm (drafts awaiting
//     approval, overdue ones first). In TEST_MODE it renders to an HTML file.

import { openPipelineDb, closePipelineDb } from "../ingest/store.mjs";
import {
  getDraftedMessages,
  getApprovedMessages,
  approveMessage,
  rejectMessage,
  editDraftMessage,
  getMessage,
  setFirmKillSwitch,
} from "../ingest/store.mjs";
import { sendMessage } from "./send.mjs";
import { validateDraft } from "./draft.mjs";
import { initiateHandoff } from "./handoff.mjs";
import { recordOutcome } from "./outcome.mjs";
import { sendWeeklyReport } from "./weekly-report.mjs";
import { sendDailyDigest } from "./digest.mjs";

const [cmd, ...args] = process.argv.slice(2);
let db;

async function main() {
  db = await openPipelineDb();
  if (cmd === "list") {
    const rows = await getDraftedMessages(db);
    if (!rows.length) {
      console.log("No drafted messages awaiting approval.");
      return;
    }
    console.log(`${rows.length} message(s) awaiting approval:\n`);
    for (const m of rows) {
      console.log(
        `  msg #${String(m.id).padStart(3)}  ${(m.caller_name ?? "").padEnd(16)} ${
          m.caller_phone ?? ""
        }`
      );
      console.log(`      ${m.body}\n`);
    }
  } else if (cmd === "approve") {
    const [id, approvedBy] = args;
    requireId(id, "approve <messageId> [approvedBy]");
    await approveMessage(db, id, approvedBy);
    console.log(`Approved msg #${id}. Run "send ${id}" to send (mocked in TEST_MODE).`);
  } else if (cmd === "reject") {
    const [id] = args;
    requireId(id, "reject <messageId>");
    await rejectMessage(db, id);
    console.log(`Rejected msg #${id}.`);
  } else if (cmd === "edit") {
    const [id, ...rest] = args;
    requireId(id, 'edit <messageId> "<new text>"');
    const body = rest.join(" ");
    if (!body) throw new Error('usage: edit <messageId> "<new text>"');
    const errors = validateDraft(body, { firstMessage: false });
    if (errors.length) {
      throw new Error(`Edited text violates constraints: ${errors.join("; ")}`);
    }
    await editDraftMessage(db, id, body);
    console.log(`Updated msg #${id}.`);
  } else if (cmd === "send") {
    const target = args[0] ?? "all";
    const messages =
      target === "all"
        ? await getApprovedMessages(db)
        : [await getMessage(db, target)].filter(Boolean);
    if (!messages.length) {
      console.log("No approved messages to send.");
      return;
    }
    for (const m of messages) {
      const res = await sendMessage({ db, messageId: m.id });
      const tag = res.sent ? (res.mode === "test" ? "SIMULATED" : "SENT") : "BLOCKED";
      console.log(`  msg #${m.id}: ${tag} (${res.reason})`);
    }
  } else if (cmd === "kill") {
    const [state, firmIdArg] = args;
    if (state !== "on" && state !== "off") {
      throw new Error("usage: kill on|off [firmId]");
    }
    const firmId = firmIdArg ?? null;
    await setFirmKillSwitch(db, firmId, state === "on");
    console.log(
      `Kill switch ${state.toUpperCase()} for ${firmId ? `firm #${firmId}` : "ALL firms"}.`
    );
  } else if (cmd === "handoff") {
    const [id, kind, ...rest] = args;
    requireId(id, 'handoff <conversationId> esign | callback "<ISO time>"');
    if (kind === "esign") {
      const res = await initiateHandoff({
        db,
        conversationId: id,
        kind: "esign",
      });
      console.log(
        `E-sign handoff #${res.handoffId} for conversation #${id} (${
          res.embedded ? "embedded" : "plain link"
        }).`
      );
      console.log(`  sign_url: ${res.sign_url}`);
    } else if (kind === "callback") {
      const callbackAt = rest.join(" ");
      if (!callbackAt) throw new Error('usage: handoff <conversationId> callback "<ISO time>"');
      const res = await initiateHandoff({
        db,
        conversationId: id,
        kind: "callback",
        callbackAt,
      });
      console.log(
        `Callback booked (handoff #${res.handoffId}) for conversation #${id} at ${res.callbackAt}.`
      );
    } else {
      throw new Error('usage: handoff <conversationId> esign | callback "<ISO time>"');
    }
  } else if (cmd === "signed") {
    const [id] = args;
    requireId(id, "signed <conversationId>");
    const res = await recordOutcome({ db, conversationId: id, result: "signed" });
    console.log(
      `Recorded SIGNED for conversation #${id}: outcome #${res.outcomeId}, recovery #${res.recoveryId}.`
    );
  } else if (cmd === "outcome") {
    const [id, result] = args;
    requireId(id, "outcome <conversationId> <no_response|lost|booked_callback|opted_out>");
    const allowed = ["no_response", "lost", "booked_callback", "opted_out"];
    if (!allowed.includes(result)) {
      throw new Error(`usage: outcome <conversationId> <${allowed.join("|")}>`);
    }
    const res = await recordOutcome({ db, conversationId: id, result });
    console.log(`Recorded ${result} for conversation #${id}: outcome #${res.outcomeId}.`);
  } else if (cmd === "report") {
    const [firmId, dateArg] = args;
    requireId(firmId, "report <firmId> [ISO date]");
    const weekDate = dateArg ? new Date(dateArg) : new Date();
    if (Number.isNaN(weekDate.getTime())) throw new Error(`Invalid date: ${dateArg}`);
    const res = await sendWeeklyReport({ db, firmId, weekDate });
    if (res.mode === "test") {
      console.log(
        `Weekly report for firm #${firmId} (week of ${res.data.weekOf}): ${res.data.recoveredFees} recovered. Rendered to ${res.file}`
      );
    } else {
      console.log(`Weekly report for firm #${firmId} emailed (id ${res.id}).`);
    }
  } else if (cmd === "digest") {
    const [firmId] = args;
    requireId(firmId, "digest <firmId>");
    const res = await sendDailyDigest({ db, firmId });
    if (res.mode === "test") {
      console.log(
        `Daily digest for firm #${firmId}: ${res.data.pendingCount} pending (${res.data.staleCount} overdue). Rendered to ${res.file}`
      );
    } else {
      console.log(`Daily digest for firm #${firmId} emailed (id ${res.id}).`);
    }
  } else {
    console.log(
      [
        "usage:",
        "  node messaging/cli.mjs list",
        "  node messaging/cli.mjs approve <messageId> [approvedBy]",
        "  node messaging/cli.mjs reject <messageId>",
        '  node messaging/cli.mjs edit <messageId> "<new text>"',
        "  node messaging/cli.mjs send [messageId|all]",
        "  node messaging/cli.mjs kill on|off [firmId]",
        "  node messaging/cli.mjs handoff <conversationId> esign",
        '  node messaging/cli.mjs handoff <conversationId> callback "<ISO time>"',
        "  node messaging/cli.mjs signed <conversationId>",
        "  node messaging/cli.mjs outcome <conversationId> <no_response|lost|booked_callback|opted_out>",
        "  node messaging/cli.mjs report <firmId> [ISO date]",
        "  node messaging/cli.mjs digest <firmId>",
      ].join("\n")
    );
    process.exitCode = 1;
  }
}

function requireId(id, usage) {
  // IDs are numeric on local SQLite and UUID strings on Postgres — accept both.
  if (!id) {
    throw new Error(`usage: ${usage}`);
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => closePipelineDb(db));
