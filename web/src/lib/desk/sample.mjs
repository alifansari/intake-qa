// A realistic, clearly-labeled SAMPLE of what the desk looks like once a firm's
// calls are flowing — so a live demo (or a brand-new firm's first login) sees a
// dollar figure and a call-ready queue in seconds instead of an empty "connect
// your calls" panel. Research (time-to-value): the first-run dashboard is the
// highest-stakes empty state; seed it so value is legible immediately.
//
// HONESTY (compliance-invariants §IV/§V): every surface that renders this MUST
// label it "Sample" so it is never mistaken for the firm's real book. The fee
// ranges use the same estimated-range methodology as real cards (never a point
// estimate, never a guarantee). No real caller PII — invented initials + a
// non-routable 555 number.

import { callUrgency } from "./queue-view.mjs";

const DAY = 86_400_000;

// Case-type fee ranges (cents) — estimated FEE (case value × contingency),
// realistic for California pre-litigation PI. Ranges only.
function make(now) {
  const rows = [
    {
      id: "sample-1",
      caseType: "Auto accident",
      daysAgo: 2,
      initials: "M.R.",
      displayId: "#A-1042",
      tier: "strong",
      feeLowCents: 25_000_00,
      feeHighCents: 60_000_00,
      reason:
        "Rear-ended on the 405, treating with a chiropractor, no attorney yet — clearly signable and no sign of a signed agreement.",
      quote:
        "I got hit from behind on the freeway and my back's been killing me — I haven't signed with anybody, I just want to know what to do.",
      phone: "(555) 010-2042",
      saveStatus: "needs_callback",
      attempts: 0,
    },
    {
      id: "sample-2",
      caseType: "Slip and fall",
      daysAgo: 4,
      initials: "J.T.",
      displayId: "#A-1039",
      tier: "moderate",
      feeLowCents: 15_000_00,
      feeHighCents: 37_000_00,
      reason:
        "Fell on an unmarked wet floor at a grocery store, went to the ER — qualifying facts mostly there, worth a human look.",
      quote:
        "There was no wet-floor sign anywhere and I went down hard — the store manager took a report, I have pictures.",
      phone: "(555) 010-2039",
      saveStatus: "reached_out",
      attempts: 1,
    },
    {
      id: "sample-3",
      caseType: "Dog bite",
      daysAgo: 6,
      initials: "P.S.",
      displayId: "#A-1031",
      tier: "strong",
      feeLowCents: 10_000_00,
      feeHighCents: 23_000_00,
      reason:
        "Neighbor's dog bit her hand, required stitches, animal control was called — strong liability, not signed.",
      quote:
        "The dog got out and bit me, I needed seven stitches — I filed a report with animal control the same day.",
      phone: "(555) 010-2031",
      saveStatus: "needs_callback",
      attempts: 0,
    },
  ];

  return rows.map((r) => {
    const callDate = new Date(now - r.daysAgo * DAY).toISOString();
    const feeRange = `$${dollars(r.feeLowCents).toLocaleString("en-US")} to $${dollars(
      r.feeHighCents,
    ).toLocaleString("en-US")}`;
    return {
      id: r.id,
      caseType: r.caseType,
      callDate,
      initials: r.initials,
      displayId: r.displayId,
      score: null,
      tier: r.tier,
      feeRange,
      feeLowCents: r.feeLowCents,
      feeHighCents: r.feeHighCents,
      citationCount: 1,
      reason: r.reason,
      quote: r.quote,
      phone: r.phone,
      saveStatus: r.saveStatus,
      attempts: r.attempts,
      urgency: callUrgency(callDate, now),
    };
  });
}

function dollars(cents) {
  return Math.round(Number(cents) / 100);
}

// The demo scenario: three winnable cases on the table, one already won back
// this month — enough to show both halves of the hero honestly.
export function sampleDesk(now = Date.now()) {
  const leaks = make(now);
  // One prior win this month (signed), so "won back" isn't zero in the demo.
  const wonBack = {
    id: "sample-0",
    caseType: "Auto accident",
    saveStatus: "signed",
    feeLowCents: 20_000_00,
    feeHighCents: 45_000_00,
  };
  return { leaks, wonBack };
}
