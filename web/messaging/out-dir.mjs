// Where the "render to file instead of sending" fallback writes its HTML.
//
// The email modules render a message to disk whenever a real send is suppressed
// (KILL_SWITCH engaged, EMAIL_ENABLED off, or no Resend key). That path MUST
// write to a WRITABLE directory. On Vercel (and any Lambda-style serverless
// host) the app bundle lives at a READ-ONLY path (e.g. /var/task), so the old
// default — a repo-relative `../output` — made `mkdirSync` throw
// `ENOENT: mkdir '/var/task/output'`. That crashed the hourly founder-alert
// sweep and the daily digest cron on every run (the alert sweep is the
// "you can't run a beta blind" watchdog, so its silent death was the worst
// possible failure).
//
// Fix: use the OS temp dir (writable on Vercel) on serverless hosts, and keep
// the repo-local `messaging/../output` for local dev so rendered files stay
// easy to find. The rendered file is a debugging/simulation artifact only — it
// is never served to a user — so /tmp is a perfectly good home for it.
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export function defaultOutDir(env = process.env) {
  if (env.VERCEL || env.AWS_LAMBDA_FUNCTION_NAME) {
    return join(tmpdir(), "intakeqa-output");
  }
  return join(dirname(fileURLToPath(import.meta.url)), "..", "output");
}
