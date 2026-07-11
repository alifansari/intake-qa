-- Fee range for the 'Auto accident' label (sqlite twin of supabase 0033).
-- Real-firm auto codes map to 'Auto accident'; give it the same vetted range as
-- the demo's 'Auto — rear-end' row so those cards show a dollar figure.

INSERT INTO fee_value_ranges (firm_id, case_type, low_cents, high_cents, basis, source, notes)
SELECT NULL, 'Auto accident', 1800000, 4500000, 'published',
       'IRC "Paid in Full" (2023); JVR Personal Injury Valuation Handbooks',
       'General auto BI settlement range; excludes policy limits and comparative fault.'
WHERE NOT EXISTS (
  SELECT 1 FROM fee_value_ranges WHERE firm_id IS NULL AND case_type = 'Auto accident'
);
