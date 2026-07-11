# GOLD 6 — The Genuine High-Value Case Met With "Someone Will Call You Back" (trucking; urgency real)

FIRM CONFIG (PART A)
FIRM CONFIG — PART A (facts only)
firm_name: Meridian Injury Law
state: CA
case_types_accepted: mva_standard, mva_commercial, motorcycle, premises, dog_bite
case_types_declined: med_mal, workers_comp, government_entity
languages_supported: en, es (bilingual staff)
END FIRM CONFIG — PART A

TRANSCRIPT
[00:00] INTAKE: Meridian Injury Law.
[00:03] CALLER: Hi — I'm calling from a hospital bed, so bear with me. Twelve days ago a semi jackknifed right across the 5 near Coalinga and I went into it. There was nowhere to go.
[00:15] INTAKE: Oh — I'm sorry. Are you okay to talk?
[00:18] CALLER: For a bit. I've had two surgeries already — they put hardware in my pelvis and a rod in my right femur. They're saying at least another week in here, then rehab.
[00:29] INTAKE: That's a lot. Was it a company truck?
[00:32] CALLER: Yeah — it said something Logistics on the door, and the highway patrol officer wrote down the DOT number off the cab. CHP shut the freeway and worked the scene for hours. My wife has the officer's card.
[00:44] INTAKE: Okay. And, um — do you know why it jackknifed?
[00:48] CALLER: No idea. It was raining a little. He just lost it and came across three lanes.
[00:53] INTAKE: Okay. Well — let me take your name and number, and someone will call you back about whether this is something we can help with.
[01:01] CALLER: Oh. Okay. It's Ray Delgado, 559-555-0142. When would they call? The truck company's insurance already had someone come by the hospital yesterday, they left a card and want a statement.
[01:14] INTAKE: Yeah, someone will get back to you. Probably in a day or two. Thanks for calling, Ray. Feel better.
[01:20] [CALL ENDS]

GOLD-STANDARD OUTPUT
<analysis>
New PI inquiry, scoreable — short but dense. Mechanism: a commercial semi
jackknifed across three lanes of an interstate; loss-of-control archetype
with heavy corroboration stated (CHP closed the freeway, worked the scene for
hours, officer recorded the carrier's DOT number). No factual self-fault span
— "there was nowhere to go". Damages: two surgeries already performed,
pelvic hardware and a femoral rod, still admitted — the strongest
objective-anchor class a call can state. Coverage/collectability: an
interstate motor carrier with a DOT number is a federally-insured commercial
defendant — strong path, strong pocket. Urgency: this is the trucking
profile where the decisive evidence — ELD/hours-of-service/telematics data
on the tractor, the vehicles themselves — can lawfully be overwritten or
released on short cycles; the perishable-evidence signal is grounded in the
observed carrier facts (marked logistics tractor, DOT number recorded).
Additionally the adverse carrier is ALREADY in the hospital seeking a
recorded statement from a post-surgical patient — extracted as adjuster
contact; the rep gave no caution. Client-risk: none — a cooperative caller
volunteering adverse-carrier contact from a hospital bed. Rep actions: no
ask, no attorney escalation, no evidence-preservation step, no adjuster
warning, vague "day or two" callback. I record all of that as fact. The
reads speak; the pipeline does the shouting.
</analysis>
{
  "engine": "scoring-v2",
  "schema_version": "2.0",
  "call_id": "gold-6",
  "transcript_quality": { "scoreable": true, "language": "en", "issues": [] },
  "call_type": "new_pi_inquiry",
  "extracted_facts": {
    "case_type_primary": { "value": "mva_commercial", "evidence": { "quote": "a semi jackknifed right across the 5 near Coalinga and I went into it", "timestamp": "00:03", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "case_type_secondary": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "incident_date_stated": { "value": "twelve days ago (exact date not pinned)", "evidence": { "quote": "Twelve days ago a semi jackknifed right across the 5 near Coalinga", "timestamp": "00:03", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "medium" },
    "incident_age_signal": { "value": "twelve days ago", "evidence": { "quote": "Twelve days ago", "timestamp": "00:03", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "government_entity_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "sol_adjacent_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "perishable_evidence_signal": { "value": { "present": true, "description": "interstate carrier tractor — ELD/hours-of-service/telematics data and the vehicles themselves are on short retention/release cycles; preservation demand time-sensitive" }, "evidence": { "quote": "it said something Logistics on the door, and the highway patrol officer wrote down the DOT number off the cab", "timestamp": "00:32", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "caller_role": { "value": "driver_owner", "evidence": { "quote": "I went into it. There was nowhere to go.", "timestamp": "00:03", "speaker": "CALLER" }, "observability": "inferred", "confidence": "medium" },
    "caller_insured_status": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "liability_admission_span": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_fault_indicators": { "value": { "description": "semi jackknifed across three lanes (loss of control); CHP closed freeway, worked scene for hours; DOT number recorded by officer", "dui_indicator": false }, "evidence": { "quote": "He just lost it and came across three lanes.", "timestamp": "00:48", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "police_report": { "value": "CHP scene investigation — report implied, officer's card with the family", "evidence": { "quote": "CHP shut the freeway and worked the scene for hours. My wife has the officer's card.", "timestamp": "00:32", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "independent_witnesses": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "injury_claims": { "value": "pelvic fracture with hardware; femoral rod; hospitalized twelve days and counting (stated, unverified)", "evidence": { "quote": "they put hardware in my pelvis and a rod in my right femur", "timestamp": "00:18", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "imaging_or_surgery_signal": { "value": { "present": true, "description": "two surgeries performed — pelvic hardware, femoral rod; still admitted, rehab ahead" }, "evidence": { "quote": "I've had two surgeries already", "timestamp": "00:18", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_status": { "value": "inpatient, post-surgical, at least another week admitted then rehab", "evidence": { "quote": "They're saying at least another week in here, then rehab.", "timestamp": "00:18", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_gap_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "work_impact": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_insurance_signal": { "value": { "carrier": null, "minimal_limits_signal": false, "commercial": true, "uninsured": false }, "evidence": { "quote": "The truck company's insurance already had someone come by the hospital yesterday", "timestamp": "01:01", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "commercial_or_deep_pocket_signal": { "value": "interstate motor carrier — marked logistics tractor with DOT number recorded by CHP", "evidence": { "quote": "it said something Logistics on the door, and the highway patrol officer wrote down the DOT number off the cab", "timestamp": "00:32", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "caller_um_uim_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "lien_treatment_signal": { "value": { "treating_on_lien": false, "no_health_insurance": false, "solicited_clinic_referral": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "prior_injury_disclosure": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "adjuster_contact": { "value": "adverse carrier's representative visited the hospital in person, left a card, wants a statement; rep gave NO caution", "evidence": { "quote": "The truck company's insurance already had someone come by the hospital yesterday, they left a card and want a statement.", "timestamp": "01:01", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "retained_or_prior_attorney": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "client_risk_markers": { "value": { "fee_negotiation_attempt": false, "attorney_shopping_signal": false, "value_obsession_signal": false, "noncooperation_signal": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "trial_posture_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "rep_committing_action": { "value": "no ask, no attorney escalation, no preservation step, no adjuster caution — name and number taken only", "evidence": { "quote": "let me take your name and number, and someone will call you back about whether this is something we can help with", "timestamp": "00:53", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "rep_next_step": { "value": "vague — 'probably in a day or two', no owner, no time", "evidence": { "quote": "Yeah, someone will get back to you. Probably in a day or two.", "timestamp": "01:14", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "property_damage_stated": { "value": { "described": "drove into a jackknifed semi at freeway speed", "minimal_impact_signal": false }, "evidence": { "quote": "a semi jackknifed right across the 5 near Coalinga and I went into it", "timestamp": "00:03", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "medium" }
  },
  "question_capture": {
    "q1_exact_incident_date": { "asked": false, "answer_summary": "'twelve days ago' volunteered; exact date never pinned", "evidence": "checked, absent" },
    "q2_prop213_insured_status": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q3_priors_same_body_part": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q4_citation_ticket": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q5_independent_witnesses": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q6_defendant_scope_rideshare": { "asked": true, "answer_summary": "company truck confirmed — marked logistics tractor, DOT number recorded", "evidence": "Was it a company truck?" },
    "q7_coverage_um": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q8_treatment_gap_lien": { "asked": false, "answer_summary": "surgical course volunteered; payment path never raised", "evidence": "checked, absent" },
    "q9_mist_guard": { "asked": false, "answer_summary": "impact severity self-evident from the account; not asked", "evidence": "checked, absent" },
    "q10_retained_elsewhere": { "asked": false, "answer_summary": null, "evidence": "checked, absent" }
  },
  "dimension_reads": {
    "liability_comparative_fault": {
      "evidence": [
        { "quote": "He just lost it and came across three lanes.", "timestamp": "00:48", "speaker": "CALLER" },
        { "quote": "CHP shut the freeway and worked the scene for hours.", "timestamp": "00:32", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Jackknife loss-of-control across three lanes with a full CHP scene investigation stated — decisive archetype with corroboration; no self-fault span ('there was nowhere to go')."
    },
    "damages_credibility": {
      "evidence": [
        { "quote": "I've had two surgeries already — they put hardware in my pelvis and a rod in my right femur.", "timestamp": "00:18", "speaker": "CALLER" },
        { "quote": "They're saying at least another week in here, then rehab.", "timestamp": "00:18", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Two performed surgeries with implanted hardware while still admitted — the strongest objective-anchor class statable on a call."
    },
    "coverage_path": {
      "evidence": [
        { "quote": "it said something Logistics on the door, and the highway patrol officer wrote down the DOT number off the cab", "timestamp": "00:32", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Interstate motor carrier with a DOT number — federally-mandated commercial coverage path as stated."
    },
    "collectability_deep_pocket": {
      "evidence": [
        { "quote": "The truck company's insurance already had someone come by the hospital yesterday", "timestamp": "01:01", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Commercial carrier actively working the claim — a stated deep pocket already at the table."
    },
    "procedural_urgency": {
      "evidence": [
        { "quote": "it said something Logistics on the door, and the highway patrol officer wrote down the DOT number off the cab", "timestamp": "00:32", "speaker": "CALLER" },
        { "quote": "they left a card and want a statement", "timestamp": "01:01", "speaker": "CALLER" }
      ],
      "level": "thin",
      "basis": "No statute-aging facts (twelve days), but trucking electronic evidence is on short lawful retention cycles and the adverse carrier is already ahead — perishable-evidence urgency, flagged on facts only."
    },
    "client_risk_markers": {
      "evidence": [
        { "quote": "The truck company's insurance already had someone come by the hospital yesterday, they left a card and want a statement.", "timestamp": "01:01", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Cooperative and candid (volunteers adverse contact unprompted); call too short for affirmative-strong, zero risk-marker behaviors."
    },
    "case_type_fit": {
      "evidence": [
        { "quote": "a semi jackknifed right across the 5", "timestamp": "00:03", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "mva_commercial — squarely accepted, and the highest-value archetype in the firm's book."
    }
  },
  "resource_tiers": {
    "effort_tier": { "evidence": [ { "quote": "it said something Logistics on the door", "timestamp": "00:32", "speaker": "CALLER" } ], "tier": "heavy_lit", "basis": "Commercial motor-carrier defense, accident reconstruction, preservation litigation — expert-dependent even on great facts." },
    "carry_tier": { "evidence": [ { "quote": "at least another week in here, then rehab", "timestamp": "00:18", "speaker": "CALLER" } ], "tier": "long_tail", "basis": "Surgical/catastrophic injury course must mature; commercial defense timeline." },
    "capital_tier": { "evidence": [ { "quote": "I've had two surgeries already", "timestamp": "00:18", "speaker": "CALLER" } ], "tier": "heavy", "basis": "Reconstruction, trucking-safety and medical experts, preservation motion practice — heavy costs class." }
  }
}

EXPECTED PIPELINE VERDICT (harness-only — never shown to the LLM)
{
  "gates": {
    "g1_underwater": false,
    "g2_deadline_trap": true,
    "g3_client_risk": false,
    "g4_trial_capital": false
  },
  "g2_trigger_quote": "it said something Logistics on the door, and the highway patrol officer wrote down the DOT number off the cab",
  "recommended_disposition": "sign_now",
  "value_tier": "high",
  "posture_applied": "selective",
  "confidence_tier": "medium",
  "abstained": false,
  "urgency_flags": ["perishable_evidence"],
  "attorney_review_required": false,
  "mist_flag": false,
  "refer_comparison_expected": true
}

CALIBRATION NOTES (never shown to the LLM)
- Anchor: the single highest-value PI call archetype met with "someone will
  call you back." The v2 LLM output carries no alert — it records the rep
  facts (no ask, no escalation, no preservation, no adjuster caution, vague
  callback) and the strong reads; the divergence between the pipeline's
  sign_now and the rep's deferral is downstream analytics' business,
  aggregate and privileged per the compliance rails.
- G2 fires on the OBSERVED perishable-evidence fact (carrier ELD/telematics
  retention, grounded in the quoted DOT/logistics spans) and caps out
  develop: this file cannot sit. Profile is strong → forced exercise is
  sign_now, urgency flag perishable_evidence.
- The decision table also surfaces the refer-out comparison (value high,
  effort heavy_lit → refer-out is the per-hour arithmetic winner) — surfaced
  honestly, but the recommendation stays sign_now under a moderate capital
  budget with no trial-capital gate; the attorney ratifies the keep-or-refer
  call. Nothing here is terminal.
- Confidence medium, deliberately: the reads rest on strong volunteered
  facts, but the rep asked 1/10 checklist questions — capture failure caps
  read-confidence even on an obviously huge case. Not ending the gold set on
  a decline (order rule): this file ends on the highest-value sign profile.
