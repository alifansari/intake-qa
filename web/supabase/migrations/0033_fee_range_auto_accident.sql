-- Intake QA — fee range for the 'Auto accident' label (0033).
--
-- WHY: the score→flag pipeline now stores a human case-type label so real-firm
-- cards aren't blank. Auto codes (mva_standard/mva_commercial/motorcycle) map to
-- 'Auto accident', but the fee_value_ranges seed only had the narrower
-- 'Auto — rear-end'. Add 'Auto accident' with the SAME vetted range + source
-- (the existing row's own note already describes it as a general auto BI range),
-- so common auto cases show a dollar range. 'Slip & fall' and 'Dog bite' labels
-- already exist. Idempotent.

insert into fee_value_ranges (firm_id, case_type, low_cents, high_cents, basis, source, notes)
select null, 'Auto accident', 1800000, 4500000, 'published',
       'IRC "Paid in Full" (2023); JVR Personal Injury Valuation Handbooks',
       'General auto BI settlement range; excludes policy limits and comparative fault.'
where not exists (
  select 1 from fee_value_ranges where firm_id is null and case_type = 'Auto accident'
);
