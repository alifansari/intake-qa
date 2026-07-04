FIRM CONFIG (DEMO — generic California PI firm, safe to edit)
Used only by public Demo Mode so a prospect can score one of their own calls
without any account or setup. Fee values are conservative DEMO ESTIMATES and are
labeled as such in the UI; a real firm's onboarding replaces them. Copied from
scoring/firm-config-template.md — the template in scoring/ is never edited (it is
a calibrated artifact).

firm_name: Demo Personal Injury Firm
state: CA
firm_size: small_2_10
case_types_accepted: mva_standard, mva_commercial, motorcycle, premises, dog_bite
case_types_declined: med_mal, workers_comp_referral_only
minimum_case_criteria: default
auto_escalate_indicators: default
average_fee_by_case_type: mva_standard $12,000; mva_commercial $45,000; motorcycle $25,000; premises $18,000; dog_bite $15,000; wrongful_death $150,000; other_pi $12,000
fee_values_estimated: true
esign_on_call_enabled: true
esign_tool: Dropbox Sign
same_call_sign_policy: encouraged
languages_supported: en
rep_roster: Intake team
referral_out_protocol: default
recorded_statement_policy: default
sol_urgency_thresholds: default (CA)
special_instructions: none
