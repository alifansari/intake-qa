# GOLD 3 — The Correct Develop (unknowns named, information purchased, exit condition set)

FIRM CONFIG (PART A)
FIRM CONFIG — PART A (facts only)
firm_name: Meridian Injury Law
state: CA
case_types_accepted: mva_standard, mva_commercial, motorcycle, premises, dog_bite
case_types_declined: med_mal, workers_comp, government_entity
languages_supported: en, es (bilingual staff)
END FIRM CONFIG — PART A

TRANSCRIPT
[00:00] INTAKE: Meridian Injury Law, this is Danielle.
[00:04] CALLER: Hi — I got T-boned last Tuesday and my knee is wrecked. A friend said to call you.
[00:11] INTAKE: I'm glad you did, and I'm sorry about the crash. Let me get the picture — I'll ask a few questions about what happened and your knee, then tell you exactly what happens next. What day was last Tuesday, the 2nd?
[00:22] CALLER: Yeah, July 2nd, around 6 in the evening.
[00:26] INTAKE: Okay. Tell me how it happened.
[00:29] CALLER: I was going through the intersection at Fruitvale and E 12th — I had the green. She ran the red and hit my passenger side. I know I had the green because the guy behind me pulled over and said he saw the whole thing. He gave me his name and number.
[00:44] INTAKE: That witness is gold — I'll take his info before we hang up. Did police come?
[00:49] CALLER: CHP, yeah. The officer said the report would be ready in about ten days. I have the incident number.
[00:55] INTAKE: Perfect. Was a ticket issued that you know of?
[00:58] CALLER: I don't know. They talked to her a long time.
[01:02] INTAKE: We'll see it in the report. Do you know if she has insurance?
[01:06] CALLER: She gave me a Mercury card. No idea what her coverage is.
[01:10] INTAKE: That's normal — nobody knows limits at this stage; we confirm that with Mercury directly. Do you have your own auto insurance, and were you insured that day?
[01:17] CALLER: Yeah, I'm with GEICO, I have uninsured motorist too, my agent made me get it.
[01:22] INTAKE: Smart agent. Now your knee — what's happening with it?
[01:26] CALLER: It swelled up right away. Urgent care that night said it's a bad sprain at least, but the swelling won't go down, so my doctor ordered an MRI — it's scheduled Tuesday. He thinks it could be a meniscus tear.
[01:38] INTAKE: Ever hurt that knee before — any old injuries or claims?
[01:42] CALLER: Never. Not that knee, not anything.
[01:45] INTAKE: Are you missing work?
[01:47] CALLER: I've been on light duty since. I'm on my feet all day normally.
[01:51] INTAKE: Okay. Have you hired or talked to another lawyer on this?
[01:54] CALLER: No.
[01:56] INTAKE: Here's exactly what happens next, and I want to be straight with you about why. Your case looks real — clean liability story, a witness, immediate care. What we don't have yet is the report, her policy information, and your MRI. So: I pull the CHP report the day it's ready, I get the witness statement this week, we confirm Mercury's coverage, and I call you Wednesday at 11 — the day after your MRI. If it reads the way it sounds, we sign on that call. Sound good?
[02:16] CALLER: That sounds really good, actually. Nobody explained it like that.
[02:20] INTAKE: One more thing — if any insurance adjuster calls you before Wednesday, don't give a recorded statement. Just take their number. Give me that witness's info now, and you're all set until Wednesday at 11.
[02:31] [CALL ENDS]

GOLD-STANDARD OUTPUT
<analysis>
New PI inquiry, fully scoreable. Liability: red-light T-bone with the caller
stating they had the green, an identified independent witness with contact
info, and a CHP report pending with an incident number — clear one-sided
narrative with corroboration identified but not yet in hand: adequate, not
strong, until the report and witness statement exist. Damages: immediate
swelling, same-night urgent care, MD-ordered MRI scheduled Tuesday for a
suspected meniscus tear — the injury is undeveloped by definition until the
MRI reads; unknown is the honest level, and the basis notes it is promising,
not absent. Coverage: defendant carrier named (Mercury), limits not-on-call
as always; caller has GEICO with UM confirmed — adequate stated path with a
confirmed second path. Gate sweep: nothing government, nothing aging (nine
days, date pinned), nothing perishable beyond the ordinary, caller insured
(Prop 213 checked and clear), no lien routing, no risk-marker behaviors — the
caller is cooperative and realistic. The rep pinned the date, captured the
witness, verified insured status and UM, flagged limits as to-verify, set a
time-boxed owned plan keyed to the MRI, and gave the adjuster warning. I emit
the reads and stop: whether waiting for the MRI beats signing today is the
pipeline's call, not mine.
</analysis>
{
  "engine": "scoring-v2",
  "schema_version": "2.1",
  "call_id": "gold-3",
  "transcript_quality": { "scoreable": true, "language": "en", "issues": [] },
  "call_type": "new_pi_inquiry",
  "extracted_facts": {
    "case_type_primary": { "value": "mva_standard", "evidence": { "quote": "I got T-boned last Tuesday", "timestamp": "00:04", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "case_type_secondary": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "incident_date_stated": { "value": "July 2nd, around 6pm", "evidence": { "quote": "Yeah, July 2nd, around 6 in the evening.", "timestamp": "00:22", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "incident_age_signal": { "value": "last Tuesday — about nine days ago", "evidence": { "quote": "I got T-boned last Tuesday", "timestamp": "00:04", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "government_entity_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "sol_adjacent_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "perishable_evidence_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "caller_role": { "value": "driver_owner", "evidence": { "quote": "I was going through the intersection at Fruitvale and E 12th — I had the green.", "timestamp": "00:29", "speaker": "CALLER" }, "observability": "inferred", "confidence": "medium" },
    "caller_insured_status": { "value": "insured", "evidence": { "quote": "Yeah, I'm with GEICO, I have uninsured motorist too", "timestamp": "01:17", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "liability_admission_span": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_fault_indicators": { "value": { "description": "red-light T-bone; independent witness with contact info; CHP report pending with incident number", "dui_indicator": false }, "evidence": { "quote": "I had the green. She ran the red and hit my passenger side.", "timestamp": "00:29", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "police_report": { "value": "pending, ready in about ten days, incident number held", "evidence": { "quote": "The officer said the report would be ready in about ten days. I have the incident number.", "timestamp": "00:49", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "independent_witnesses": { "value": "identified with name and number, contact info being captured on call", "evidence": { "quote": "the guy behind me pulled over and said he saw the whole thing. He gave me his name and number.", "timestamp": "00:29", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "injury_claims": { "value": "knee injury — immediate swelling, suspected meniscus tear (stated, unverified)", "evidence": { "quote": "It swelled up right away.", "timestamp": "01:26", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "imaging_or_surgery_signal": { "value": { "present": false, "description": "MRI ordered and scheduled Tuesday — no imaging result exists yet" }, "evidence": { "quote": "my doctor ordered an MRI — it's scheduled Tuesday. He thinks it could be a meniscus tear.", "timestamp": "01:26", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_status": { "value": "same-night urgent care; MD-directed follow-up in progress", "evidence": { "quote": "Urgent care that night said it's a bad sprain at least", "timestamp": "01:26", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_gap_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "work_impact": { "value": "on light duty since the crash; normally on feet all day", "evidence": { "quote": "I've been on light duty since. I'm on my feet all day normally.", "timestamp": "01:47", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "defendant_insurance_signal": { "value": { "carrier": "Mercury", "minimal_limits_signal": false, "commercial": false, "uninsured": false }, "evidence": { "quote": "She gave me a Mercury card. No idea what her coverage is.", "timestamp": "01:06", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "commercial_or_deep_pocket_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "caller_um_uim_signal": { "value": "GEICO with UM coverage, confirmed", "evidence": { "quote": "I'm with GEICO, I have uninsured motorist too, my agent made me get it.", "timestamp": "01:17", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "lien_treatment_signal": { "value": { "treating_on_lien": false, "no_health_insurance": false, "solicited_clinic_referral": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "prior_injury_disclosure": { "value": "no prior injuries or claims to the knee, as stated", "evidence": { "quote": "Never. Not that knee, not anything.", "timestamp": "01:42", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "adjuster_contact": { "value": "none yet; rep pre-warned against recorded statements", "evidence": { "quote": "if any insurance adjuster calls you before Wednesday, don't give a recorded statement", "timestamp": "02:20", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "retained_or_prior_attorney": { "value": "none", "evidence": { "quote": "No.", "timestamp": "01:54", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "client_risk_markers": { "value": { "fee_negotiation_attempt": false, "attorney_shopping_signal": false, "value_obsession_signal": false, "noncooperation_signal": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "trial_posture_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "rep_committing_action": { "value": "no sign attempted; explicit conditional sign plan keyed to the MRI and report", "evidence": { "quote": "If it reads the way it sounds, we sign on that call.", "timestamp": "01:56", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "rep_next_step": { "value": "specific and owned: pull CHP report on release, witness statement this week, confirm Mercury coverage, call Wednesday 11am post-MRI", "evidence": { "quote": "I call you Wednesday at 11 — the day after your MRI.", "timestamp": "01:56", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "property_damage_stated": { "value": { "described": "passenger-side impact in an intersection T-bone", "minimal_impact_signal": false }, "evidence": { "quote": "She ran the red and hit my passenger side.", "timestamp": "00:29", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "medium" }
  },
  "question_capture": {
    "q1_exact_incident_date": { "status": "asked", "answer_summary": "July 2nd, ~6pm", "evidence": "What day was last Tuesday, the 2nd?" },
    "q2_prop213_insured_status": { "status": "asked", "answer_summary": "insured — GEICO with UM", "evidence": "Do you have your own auto insurance, and were you insured that day?" },
    "q3_priors_same_body_part": { "status": "asked", "answer_summary": "no prior knee injuries or claims", "evidence": "Ever hurt that knee before — any old injuries or claims?" },
    "q4_citation_ticket": { "status": "asked", "answer_summary": "unknown to caller; report will show", "evidence": "Was a ticket issued that you know of?" },
    "q5_independent_witnesses": { "status": "asked", "answer_summary": "witness identified; contact info captured on call", "evidence": "That witness is gold — I'll take his info before we hang up." },
    "q6_defendant_scope_rideshare": { "status": "not_applicable", "answer_summary": "no rideshare/employment facts in play", "evidence": "checked, absent" },
    "q7_coverage_um": { "status": "asked", "answer_summary": "defendant Mercury, limits to verify; caller GEICO with UM", "evidence": "Do you know if she has insurance?" },
    "q8_treatment_gap_lien": { "status": "asked", "answer_summary": "same-night urgent care, no gap; payment path not discussed", "evidence": "Now your knee — what's happening with it?" },
    "q9_mist_guard": { "status": "not_asked", "answer_summary": "T-bone impact described; drivable/airbags/towed not asked", "evidence": "checked, absent" },
    "q10_retained_elsewhere": { "status": "asked", "answer_summary": "no other attorney", "evidence": "Have you hired or talked to another lawyer on this?" }
  },
  "dimension_reads": {
    "liability_comparative_fault": {
      "evidence": [
        { "quote": "I had the green. She ran the red and hit my passenger side.", "timestamp": "00:29", "speaker": "CALLER" },
        { "quote": "the guy behind me pulled over and said he saw the whole thing. He gave me his name and number.", "timestamp": "00:29", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Clear one-sided red-light narrative with corroboration identified but pending — witness statement and CHP report not yet in hand."
    },
    "damages_credibility": {
      "evidence": [
        { "quote": "It swelled up right away.", "timestamp": "01:26", "speaker": "CALLER" },
        { "quote": "my doctor ordered an MRI — it's scheduled Tuesday. He thinks it could be a meniscus tear.", "timestamp": "01:26", "speaker": "CALLER" }
      ],
      "level": "unknown",
      "basis": "The injury is undeveloped by definition until Tuesday's MRI reads — promising (immediate swelling, same-night care, MD-directed workup) but unknown is the honest level today."
    },
    "coverage_path": {
      "evidence": [
        { "quote": "She gave me a Mercury card. No idea what her coverage is.", "timestamp": "01:06", "speaker": "CALLER" },
        { "quote": "I'm with GEICO, I have uninsured motorist too", "timestamp": "01:17", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Defendant carrier named with limits properly flagged as to-verify, plus a confirmed UM second path."
    },
    "collectability_deep_pocket": {
      "evidence": [
        { "quote": "She gave me a Mercury card.", "timestamp": "01:06", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Insured individual defendant as stated."
    },
    "procedural_urgency": {
      "evidence": [
        { "quote": "Yeah, July 2nd, around 6 in the evening.", "timestamp": "00:22", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Nine days old with the date pinned; full runway, no deadline-adjacent facts."
    },
    "client_risk_markers": {
      "evidence": [
        { "quote": "That sounds really good, actually. Nobody explained it like that.", "timestamp": "02:16", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Cooperative, candid, realistic — accepts a conditional plan without pushing for promises; zero risk-marker behaviors."
    },
    "case_type_fit": {
      "evidence": [
        { "quote": "I got T-boned last Tuesday", "timestamp": "00:04", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "mva_standard, squarely accepted."
    }
  },
  "resource_tiers": {
    "effort_tier": { "evidence": [ { "quote": "He thinks it could be a meniscus tear.", "timestamp": "01:26", "speaker": "CALLER" } ], "tier": "standard", "basis": "Ordinary contested pre-lit workup — report, witness statement, limits confirmation, imaging." },
    "carry_tier": { "evidence": [ { "quote": "my doctor ordered an MRI — it's scheduled Tuesday", "timestamp": "01:26", "speaker": "CALLER" } ], "tier": "medium", "basis": "Injury course must mature before demand; resolvable pre-suit on these facts." },
    "capital_tier": { "evidence": [ { "quote": "The officer said the report would be ready in about ten days.", "timestamp": "00:49", "speaker": "CALLER" } ], "tier": "minimal", "basis": "Report, records, and a limits letter — cheap information." }
  }
}

EXPECTED PIPELINE VERDICT (harness-only — never shown to the LLM)
{
  "gates": { "g1_underwater": false, "g2_deadline_trap": false, "g3_client_risk": false, "g4_trial_capital": false },
  "recommended_disposition": "develop",
  "value_tier": "indeterminate",
  "posture_applied": "volume",
  "confidence_tier": "high",
  "abstained": false,
  "urgency_flags": [],
  "attorney_review_required": false,
  "mist_flag": false,
  "develop_payload": {
    "resolving_facts": ["imaging result / treatment records (damages)"],
    "info_cost_class": "cheap_records",
    "exit_condition_template": "Developing to learn: imaging result / treatment records (damages). If the facts resolve favorably, expected disposition: sign_now. If they resolve adversely, expected disposition: decline_with_grace or refer_out. Pre-registered at entry; restate this question at review and grade only new information (invested hours are deliberately not displayed). The firm dockets its own review date — this engine never computes dates."
  }
}

CALIBRATION NOTES (never shown to the LLM)
- Anchor: a correct DEVELOP is a first-class win. One load-bearing unknown
  (damages, pending MRI) routes to develop regardless of posture — the
  information is cheap and no deadline forces early exercise.
- Confidence HIGH lives in the routing, not the case: the unknowns are
  named, the exit condition is pre-registered, and the rep asked 8 of 9
  applicable checklist questions. Develop-with-a-clock is the opposite of a graveyard.
- Value tier indeterminate — the honest tier while damages are unknown.
