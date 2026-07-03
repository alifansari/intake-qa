FIRM CONFIG (test firm — safe to edit)
Filled from the "Meridian Injury Law" firm used in the gold examples so the
pipeline is runnable tonight. Replace with a real client's values by copying
scoring/firm-config-template.md and filling it in. Do NOT edit the template
in scoring/ — that is a calibrated artifact.

firm_name: Meridian Injury Law
state: CA
firm_size: small_2_10
case_types_accepted: mva_standard, mva_commercial, motorcycle, premises, dog_bite
case_types_declined: med_mal, workers_comp_referral_only
minimum_case_criteria: default
auto_escalate_indicators: default
average_fee_by_case_type: mva_standard $12,000; mva_commercial $45,000; motorcycle $25,000; premises $18,000; dog_bite $15,000; wrongful_death $150,000; other_pi $12,000
fee_values_estimated: false
esign_on_call_enabled: true
esign_tool: Lawmatics
same_call_sign_policy: encouraged
languages_supported: en
rep_roster: Danielle (intake), ext 4; Rob (intake)
referral_out_protocol: default
recorded_statement_policy: default
sol_urgency_thresholds: default (CA)
special_instructions: none
