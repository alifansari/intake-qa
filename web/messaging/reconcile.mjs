// Weekly reconciliation — gather one firm's week and compute the honest math.
//
// HONESTY RULE (non-negotiable): the recovered $ figure counts ONLY signed
// outcomes. A `recoveries` row exists solely for a `signed` outcome (see
// outcome.mjs), so summing signed recovery fees can never include an unsigned
// lead. Unsigned outcomes (booked_callback / no_response / lost / opted_out)
// appear only as funnel COUNTS, never as dollars.
//
// Nothing here renders or sends — reconcileWeek returns a plain data object that
// weekly-report.mjs turns into an email/HTML.

import {
  getFirm,
  countFlaggedInWeek,
  countConversationsInWeek,
  countRepliedInWeek,
  getSignedRecoveries,
  sumRecoveredMonthToDate,
} from "../ingest/store.mjs";
import { weekOf } from "./outcome.mjs";

// The [start, end) UTC instants of the week containing `weekOfMonday` (a Monday
// ISO date, YYYY-MM-DD). End is the following Monday 00:00Z.
function weekWindow(weekOfMonday) {
  const start = new Date(`${weekOfMonday}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 7);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

// Recovered / subscription as a multiple, rounded to 1 decimal. 0 when there is
// no subscription price or nothing recovered.
export function roundMultiple(recovered, subscriptionPrice) {
  if (!subscriptionPrice || subscriptionPrice <= 0) return 0;
  return Math.round((recovered / subscriptionPrice) * 10) / 10;
}

// Build the reconciliation data object for one firm + week.
export async function reconcileWeek({ db, firmId, weekDate = new Date() }) {
  const firm = await getFirm(db, firmId);
  if (!firm) throw new Error(`Firm not found: ${firmId}`);

  const mondayIso = weekOf(weekDate); // YYYY-MM-DD (Monday, UTC)
  const { startIso, endIso } = weekWindow(mondayIso);

  const flaggedCount = await countFlaggedInWeek(db, firmId, startIso, endIso);
  const reEngagedCount = await countConversationsInWeek(db, firmId, startIso, endIso);
  const repliedCount = await countRepliedInWeek(db, firmId, startIso, endIso);

  const signed = await getSignedRecoveries(db, firmId, mondayIso);
  const signedCases = signed.map((r) => ({
    conversationId: r.conversation_id,
    name: r.name ?? "Unknown caller",
    caseType: r.case_type ?? "",
    fee: r.fee_amount ?? 0,
  }));
  const recoveredFees = signedCases.reduce((sum, c) => sum + c.fee, 0);
  const signedCount = signedCases.length;

  const subscriptionPrice = firm.subscription_price ?? null;
  const multiple = roundMultiple(recoveredFees, subscriptionPrice);

  // Month-to-date: from the first of the report week's month through this week.
  const monthStartDate = `${mondayIso.slice(0, 7)}-01`;
  const monthToDateRecovered = await sumRecoveredMonthToDate(
    db,
    firmId,
    monthStartDate,
    mondayIso
  );

  // getSignedRecoveries already orders by fee desc, so [0] is the brag case.
  const caseOfWeek = signedCases.length ? signedCases[0] : null;

  return {
    firm,
    weekOf: mondayIso,
    weekStart: startIso,
    weekEnd: endIso,
    flaggedCount,
    reEngagedCount,
    repliedCount,
    signedCount,
    signedCases,
    recoveredFees,
    subscriptionPrice,
    multiple,
    monthToDateRecovered,
    caseOfWeek,
  };
}
