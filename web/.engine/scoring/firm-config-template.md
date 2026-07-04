FIRM CONFIG TEMPLATE v1.0
Product: PI Intake QA
Usage: Fill this out ONCE per client firm during onboarding. Prepend the
completed block to every transcript sent to the scoring engine (before the
transcript, in the same user message). Keep it under ~40 lines — it's
context, not a novel. Everything here changes how calls are scored, so
accuracy matters: wrong fee values = wrong revenue-at-risk numbers = lost
credibility with the managing partner.
Items marked [REQUIRED] must be filled. Items marked [DEFAULT OK] can ship
with the defaults shown. Collect this in a 20-minute onboarding call.

FIRM CONFIG
Identity
firm_name: [REQUIRED — e.g., "Varlack Legal Services"] state: [REQUIRED — two-letter code, e.g., "CA". Drives SOL rules. If the firm takes cases in multiple states, list primary first: "CA, NV"] firm_size: [DEFAULT OK — solo | small_2_10 | mid_11_50 | large_50_plus]
Case Acceptance Profile
What the firm actually signs. The engine uses this for the signability
assessment — a caller can be "likely_signable" only against THIS firm's
criteria, not a generic standard.
case_types_accepted: [REQUIRED — list from: mva_standard, mva_commercial, motorcycle, pedestrian_bicycle, rideshare, premises, dog_bite, product, med_mal, wrongful_death, government_entity, workers_comp_referral_only, other_pi]
case_types_declined: [REQUIRED — same list. Anything here → caller is routed to Decline Quality module, and a graceful referral is the expected behavior, not a sign attempt.]
minimum_case_criteria: [DEFAULT OK — default: "identifiable at-fault party; injury with medical treatment received or imminent; plausible recovery source (insured defendant, commercial defendant, or UM/UIM); within statute of limitations." Override with firm-specific floors, e.g., "no soft-tissue MVAs with < $5K in treatment", "no slip-and-falls without prior-notice facts", "no represented-party switches."]
auto_escalate_indicators: [DEFAULT OK — default list: commercial vehicle/ trucking, rideshare, DUI defendant, dram_shop, premises_security_failure, product_defect, government_entity, catastrophic_injury (fatality, TBI, spinal cord, amputation, severe burns), minor_plaintiff. Add firm- specific: e.g., "any case referred by Dr. Nguyen's office."]
Fee Values (drives revenue_at_risk — get real numbers)
Ask the managing partner: "What's your average FEE (not settlement) per
signed case, by type, over the last 1-2 years?" If they don't know, use
the fallback defaults below and mark estimated: true. Revisit at day 30.
average_fee_by_case_type: mva_standard: [$12,000 — fallback default] mva_commercial: [$45,000 — fallback default] motorcycle: [$25,000 — fallback default] pedestrian_bicycle: [$20,000 — fallback default] rideshare: [$18,000 — fallback default] premises: [$18,000 — fallback default] dog_bite: [$15,000 — fallback default] wrongful_death: [$150,000 — fallback default] other_pi: [$12,000 — fallback default] fee_values_estimated: [true | false — true if using fallbacks]
Conversion Capabilities
The engine can only expect behaviors the firm's tooling supports.
If e-sign on call isn't enabled, B1's 100-anchor becomes "sign
appointment set / e-sign committed within 24h" instead of "e-sign sent
on-call." Score what's possible, coach toward what's next.
esign_on_call_enabled: [REQUIRED — true | false] esign_tool: [OPTIONAL — e.g., "Lawmatics", "DocuSign", "none"] same_call_sign_policy: [DEFAULT OK — encouraged | attorney_review_first | prohibited. If attorney_review_first or prohibited, B1's 100-anchor is "attorney sign-call scheduled with specific time."] languages_supported: [DEFAULT OK — e.g., "en" or "en, es (interpreter)" or "en, es (native staff)". Drives expectations on interpreter-offer behavior for LEP callers.]
Intake Team (for per-rep reporting)
rep_roster: [OPTIONAL but recommended — names/IDs as they appear in the phone system, e.g., "Maria R., ext 102; Front desk shared line". Enables per-rep trending. If unknown, engine reports by speaker label only.]
Protocol Overrides
referral_out_protocol: [DEFAULT OK — default: "referral expected on declined callers; capture caller info if firm has referral-fee arrangements." Override: "no referral-fee program — graceful decline + bar referral service is the 100-anchor."] recorded_statement_policy: [DEFAULT OK — default: proactive warning expected whenever adjuster contact exists or is imminent.] sol_urgency_thresholds: [DEFAULT OK — defaults for CA: government claim 6 months (Gov. Code § 911.2); med-mal 1 year (CCP § 340.5); standard 2 years (CCP § 335.1); flag urgency at > 18 months on standard clock. For non-CA firms: engine applies the named state's equivalents; verify during onboarding and list any firm-specific escalation windows here.]
Notes
special_instructions: [OPTIONAL — anything else that changes scoring, e.g., "Spanish calls handled by bilingual staff — full scoring OK in Spanish starting v2"; "firm runs 24/7 answering service overnight — overnight calls are vendor calls, tag but don't score against firm reps."]
=========== END FIRM CONFIG

ONBOARDING SCRIPT (the 20-minute call that fills this out)
Ask in this order — it doubles as a discovery call that surfaces pain:
"Walk me through what happens when someone calls your office about a new injury case right now." (fills: rep_roster, esign, languages)
"What cases do you sign, and what do you turn away?" (case_types, minimum_case_criteria)
"What's your average fee per signed case — even roughly — for a standard auto case? Commercial? Premises?" (fee values; if they don't know, that IS the pitch: "most firms can't see this number — that's part of what we fix")
"Any case types where the clock is scary — government defendants, med-mal?" (sol_urgency_thresholds, auto_escalate)
"Can your intake person send a retainer during the call, or does an attorney review first?" (same_call_sign_policy)
"Who should never be scored — answering service, attorneys jumping on lines?" (special_instructions)
