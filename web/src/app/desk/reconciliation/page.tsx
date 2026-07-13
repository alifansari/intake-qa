// The reconciliation table is now folded into the richer Calls ledger
// (/desk/calls), which shows EVERY call — read, won back, on the table, or set
// aside — with its grade and next action, plus the received = read + set aside
// + could-not-read balance banner at the top. Keep this route working (older
// links, the /funnel redirect) by sending it there.
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ReconciliationRedirect() {
  redirect("/desk/calls");
}
