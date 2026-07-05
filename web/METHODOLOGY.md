# Appendix A — How we estimate missed signable fee value

What this is. This is a transparent, conservative way to put a dollar range on the fee your firm
likely missed when a qualified prospective new client (PNC) called, was not signed, and was not
recovered. It is an estimate expressed as a range — never a single number, and never a guarantee.

Sources, in order of priority.
1. Your firm's own historical outcomes. Once you share historical signed-case fees by case type,
   we use YOUR numbers first. Your data always beats any published average.
2. Named published sources, used only until your historicals are available:
   • Jury Verdict Research (JVR), Personal Injury Valuation Handbooks — injury-type award and
     settlement distributions. Limitation: aggregates skew toward litigated/larger cases.
   • Insurance Research Council (IRC), "Paid in Full: Compensation Under Auto Insurance Bodily
     Injury Coverage" (2023). Limitation: auto BI focus; national, not venue-specific.
   • RAND, "Trends in Civil Jury Verdicts." Limitation: verdicts, not settlements; small sample by
     type.
   • National Practitioner Data Bank — medical-malpractice payout data. Limitation: reported
     payments only.

How we build a range. We take the case-type range from the best available source, then apply your
firm's fee agreement percentage (TODO(Ali): your standard contingency %). The result is shown as a
low–high range.

What we exclude, on purpose. We do not attempt to price things we cannot see from a call:
policy limits, comparative fault, prior injuries, liens, or a PNC who signed elsewhere. Because we
exclude these, our ranges are deliberately conservative.

The range-not-point rule. We never present a single-dollar estimate. Every figure is a range with
this methodology attached.

Worked example. An auto rear-end PNC with treatment described on the call goes unsigned. Published
auto BI settlement data suggests a case value range of $18,000–$45,000 for this profile. At a 33.3%
fee agreement, the estimated missed fee value is $6,000–$15,000. If your own historical auto fees
are higher or lower, we use yours instead.

---

Implementation notes (not part of the client-facing appendix):
- The case-type → value ranges live in the `fee_value_ranges` table (migration 0014), seeded with
  published sources; firm-historical rows (basis = 'firm_historical') override published rows for
  that firm. See `getFeeValueRange(caseType, firmId)`.
- TODO(Ali): (1) confirm each firm's standard contingency %; (2) load firm-historical fee ranges
  by case type as they become available; (3) confirm the published source figures before relying
  on them in a client deliverable.
