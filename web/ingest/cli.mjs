// CLI for the ingest → score → flag pipeline (local dev / operator use).
//
//   node ingest/cli.mjs score [firmId]
//     Score every un-scored call (optionally scoped to a firm) with the real
//     Claude engine, creating a flag per call. Needs ANTHROPIC_API_KEY.
//
//   node ingest/cli.mjs manual <transcript.txt> <firmId> [callerName] [callerPhone]
//     Create a manual `calls` row from a transcript text file.
//
// TEST_MODE stays on: this pipeline never sends SMS or hits any send path.

import { openMigratedDb } from "../db/connection.mjs";
import { ingestManual } from "./manual.mjs";
import { scoreUnscored } from "./score-worker.mjs";

const [cmd, ...args] = process.argv.slice(2);
const db = openMigratedDb();

async function main() {
  if (cmd === "score") {
    const firmId = args[0] ? Number(args[0]) : null;
    const flags = await scoreUnscored({ db, firmId });
    if (!flags.length) {
      console.log("No un-scored calls — nothing to do.");
      return;
    }
    console.log(`Scored ${flags.length} call(s):\n`);
    printFlags(flags);
  } else if (cmd === "manual") {
    const [transcriptPath, firmIdArg, callerName, callerPhone] = args;
    if (!transcriptPath || !firmIdArg) {
      throw new Error(
        "usage: node ingest/cli.mjs manual <transcript.txt> <firmId> [callerName] [callerPhone]"
      );
    }
    const { id, created } = ingestManual({
      db,
      firmId: Number(firmIdArg),
      transcriptPath,
      callerName: callerName ?? null,
      callerPhone: callerPhone ?? null,
    });
    console.log(
      `${created ? "Created" : "Updated"} manual call #${id}. Run "score" to flag it.`
    );
  } else {
    console.log(
      "usage:\n  node ingest/cli.mjs score [firmId]\n  node ingest/cli.mjs manual <transcript.txt> <firmId> [callerName] [callerPhone]"
    );
    process.exitCode = 1;
  }
}

function printFlags(flags) {
  for (const f of flags) {
    const tag = f.is_leaked_signable ? "LEAKED-SIGNABLE" : "ok";
    console.log(
      `  call #${f.call_id} ${(f.caller_name ?? "").padEnd(16)} score=${String(
        f.qualification_score
      ).padStart(3)}  [${tag}]  ${f.reason ?? ""}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => db.close());
