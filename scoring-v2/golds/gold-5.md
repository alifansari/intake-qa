# GOLD 5 — The Refer-Out (high-value case outside firm competence; referral is the win)

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
[00:05] CALLER: Hi. I don't know if I'm calling the right place. It's about my daughter. She's four. She has cerebral palsy, and we've always been told it just happens, but my sister's a nurse and she finally got us the delivery records, and she says the monitor strips showed the baby was in distress for a long time and they waited way too long to do the C-section.
[00:28] INTAKE: Thank you for telling me that — and I'm sorry, that's a lot for any family to carry. Can I ask a few questions so I can point you in exactly the right direction?
[00:36] CALLER: Okay. Yes.
[00:38] INTAKE: She was born here in California? And she just turned four?
[00:42] CALLER: Yes, at Valley Regional. Four in March.
[00:46] INTAKE: And what does her care look like day to day?
[00:49] CALLER: Everything. Physical therapy twice a week, a feeding specialist, she'll need support her whole life. The doctors said lifetime care.
[00:58] INTAKE: I hear you. Now let me be completely straight with you, because your daughter's case deserves it. What you're describing is a birth-injury medical malpractice case. Our firm doesn't handle medical malpractice — it needs a specialist firm with the medical experts and the resources these cases take, and pretending otherwise would be doing your family a disservice.
[01:16] CALLER: Oh. Okay. So who do we even call?
[01:19] INTAKE: That's exactly what I want to set up for you right now. There's a firm we refer birth-injury cases to — they do only this, and they've handled fetal-monitoring cases like the one you're describing. With your permission, I'll call them today, give them what you've told me, and have them call you directly — you won't have to start from zero.
[01:36] CALLER: Yes, please. Do we owe you anything for that?
[01:39] INTAKE: Nothing. If they take the case, the law lets firms share a fee with written consent — it never comes out of your recovery beyond the fee you'd pay anyway, and they'll put all of that in writing for you. One more thing, and it's important: cases involving children have their own special deadlines, and birth-injury cases have particular timing rules. I'm not going to guess at your dates — the specialist will work that out with the records this week. Just please don't sit on it.
[02:01] CALLER: We won't. Thank you. Nobody's ever explained any of this.
[02:05] INTAKE: You're doing right by her. Let me get your best number and the hospital details, and I'll make that call today.
[02:12] [CALL ENDS]

GOLD-STANDARD OUTPUT
<analysis>
New PI inquiry — a birth-injury/HIE medical-malpractice profile: four-year-old
with cerebral palsy, delivery records reportedly showing prolonged fetal
distress and a delayed emergency C-section, lifetime-care needs stated. Case
type med_mal is on this firm's DECLINED list, so case_type_fit reads fatal —
which in this schema is a routing fact, not a merits judgment; the basis
records the high specialist value visible on the call. Liability in a med-mal
sense (breach of the standard of care) is not determinable from an intake
call — it needs expert review of the strips and records; unknown is the only
honest read, and the family's account (relayed through a nurse relative) is
the reason to route it, not a graded conclusion. Damages: lifetime-care
claims for a four-year-old with CP — objective-anchor territory, strong as
stated. Coverage/collectability: a hospital defendant (Valley Regional) is an
insured institutional deep pocket — strong. Urgency: the child is four and
this is a birth-injury claim — minors' med-mal limitation rules may be in
play; that is a stated-fact flag (sol_adjacent present), never a computed
date, and the rep explicitly refused to guess dates. Client-risk: none;
cooperative, realistic family. The rep neither signed nor declined the
CALLER — she declined the fit and set up a same-day warm referral with an
accurate fee-division explanation (written consent, no extra cost) and a
generic don't-sit-on-it caution. Resource tiers describe what the case
demands of whoever takes it: expert-heavy litigation, long-tail carry, heavy
capital. Reads only; refer-vs-decline is downstream arithmetic.
</analysis>
{
  "engine": "scoring-v2",
  "schema_version": "2.1",
  "call_id": "gold-5",
  "transcript_quality": { "scoreable": true, "language": "en", "issues": [] },
  "call_type": "new_pi_inquiry",
  "extracted_facts": {
    "case_type_primary": { "value": "med_mal", "evidence": { "quote": "the monitor strips showed the baby was in distress for a long time and they waited way too long to do the C-section", "timestamp": "00:05", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "case_type_secondary": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "incident_date_stated": { "value": "at birth — child born at Valley Regional, turned four in March", "evidence": { "quote": "Yes, at Valley Regional. Four in March.", "timestamp": "00:42", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "incident_age_signal": { "value": "approximately four years ago (child's birth)", "evidence": { "quote": "She's four.", "timestamp": "00:05", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "government_entity_signal": { "value": { "present": false, "description": "hospital named is not identified as public on the call" }, "evidence": "checked, absent", "observability": "unknown", "confidence": "medium" },
    "sol_adjacent_signal": { "value": { "present": true, "description": "birth-injury claim, child now four — minors' med-mal limitations rules may be in play; flag only, no date computed" }, "evidence": { "quote": "Yes, at Valley Regional. Four in March.", "timestamp": "00:42", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "perishable_evidence_signal": { "value": { "present": false, "description": "delivery records already obtained by family" }, "evidence": "checked, absent", "observability": "unknown", "confidence": "medium" },
    "caller_role": { "value": "guardian_calling_for_injured", "evidence": { "quote": "It's about my daughter. She's four.", "timestamp": "00:05", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "caller_insured_status": { "value": "not_applicable", "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "liability_admission_span": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_fault_indicators": { "value": { "description": "relayed account: fetal-monitor strips showed prolonged distress; delayed emergency C-section — expert review required", "dui_indicator": false }, "evidence": { "quote": "she says the monitor strips showed the baby was in distress for a long time and they waited way too long to do the C-section", "timestamp": "00:05", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "medium" },
    "police_report": { "value": null, "evidence": "checked, absent", "observability": "not_on_call", "confidence": "high" },
    "independent_witnesses": { "value": "delivery records in the family's possession; sister (a nurse) reviewed them", "evidence": { "quote": "my sister's a nurse and she finally got us the delivery records", "timestamp": "00:05", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "injury_claims": { "value": "cerebral palsy; lifetime-care needs stated (stated, unverified)", "evidence": { "quote": "She has cerebral palsy", "timestamp": "00:05", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "imaging_or_surgery_signal": { "value": { "present": true, "description": "CP diagnosis with lifetime-care prognosis stated; delivery records exist" }, "evidence": { "quote": "The doctors said lifetime care.", "timestamp": "00:49", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_status": { "value": "ongoing: physical therapy twice weekly, feeding specialist", "evidence": { "quote": "Physical therapy twice a week, a feeding specialist", "timestamp": "00:49", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_gap_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "work_impact": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_insurance_signal": { "value": { "carrier": null, "minimal_limits_signal": false, "commercial": true, "uninsured": false }, "evidence": { "quote": "Yes, at Valley Regional.", "timestamp": "00:42", "speaker": "CALLER" }, "observability": "inferred", "confidence": "medium" },
    "commercial_or_deep_pocket_signal": { "value": "hospital defendant — insured institutional deep pocket", "evidence": { "quote": "Yes, at Valley Regional.", "timestamp": "00:42", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "caller_um_uim_signal": { "value": null, "evidence": "checked, absent", "observability": "not_on_call", "confidence": "high" },
    "lien_treatment_signal": { "value": { "treating_on_lien": false, "no_health_insurance": false, "solicited_clinic_referral": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "prior_injury_disclosure": { "value": null, "evidence": "checked, absent", "observability": "not_on_call", "confidence": "high" },
    "adjuster_contact": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "retained_or_prior_attorney": { "value": "none — family has never spoken with a lawyer about this", "evidence": { "quote": "Nobody's ever explained any of this.", "timestamp": "02:01", "speaker": "CALLER" }, "observability": "inferred", "confidence": "medium" },
    "client_risk_markers": { "value": { "fee_negotiation_attempt": false, "attorney_shopping_signal": false, "value_obsession_signal": false, "noncooperation_signal": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "trial_posture_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "rep_committing_action": { "value": "no sign attempted; same-day warm referral to a specialist birth-injury firm offered and accepted; fee-division explained accurately (written consent, no added cost)", "evidence": { "quote": "With your permission, I'll call them today, give them what you've told me, and have them call you directly", "timestamp": "01:19", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "rep_next_step": { "value": "specific and owned: rep calls the specialist firm today; caller's number and hospital details captured; generic timing caution given without computing dates", "evidence": { "quote": "cases involving children have their own special deadlines... I'm not going to guess at your dates", "timestamp": "01:39", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "property_damage_stated": { "value": { "described": null, "minimal_impact_signal": false }, "evidence": "checked, absent", "observability": "not_on_call", "confidence": "high" }
  },
  "question_capture": {
    "q1_exact_incident_date": { "status": "asked", "answer_summary": "birth at Valley Regional; child turned four in March", "evidence": "She was born here in California? And she just turned four?" },
    "q2_prop213_insured_status": { "status": "not_applicable", "answer_summary": "not applicable — not a motor-vehicle claim", "evidence": "checked, absent" },
    "q3_priors_same_body_part": { "status": "not_applicable", "answer_summary": "not applicable to a birth-injury profile", "evidence": "checked, absent" },
    "q4_citation_ticket": { "status": "not_applicable", "answer_summary": "not applicable", "evidence": "checked, absent" },
    "q5_independent_witnesses": { "status": "not_asked", "answer_summary": "delivery records volunteered; not further explored (appropriate — specialist's work)", "evidence": "checked, absent" },
    "q6_defendant_scope_rideshare": { "status": "not_applicable", "answer_summary": "not applicable", "evidence": "checked, absent" },
    "q7_coverage_um": { "status": "not_applicable", "answer_summary": "not applicable at intake for an institutional med-mal defendant", "evidence": "checked, absent" },
    "q8_treatment_gap_lien": { "status": "asked", "answer_summary": "ongoing PT and specialist care described", "evidence": "And what does her care look like day to day?" },
    "q9_mist_guard": { "status": "not_applicable", "answer_summary": "not applicable", "evidence": "checked, absent" },
    "q10_retained_elsewhere": { "status": "not_asked", "answer_summary": "no prior counsel apparent from the call; not explicitly asked", "evidence": "checked, absent" }
  },
  "dimension_reads": {
    "liability_comparative_fault": {
      "evidence": [
        { "quote": "she says the monitor strips showed the baby was in distress for a long time and they waited way too long to do the C-section", "timestamp": "00:05", "speaker": "CALLER" }
      ],
      "level": "unknown",
      "basis": "Standard-of-care breach cannot be graded from an intake call — it requires expert review of the strips and records. The relayed nurse's read is the reason to route it, not a gradable liability fact."
    },
    "damages_credibility": {
      "evidence": [
        { "quote": "She has cerebral palsy", "timestamp": "00:05", "speaker": "CALLER" },
        { "quote": "The doctors said lifetime care.", "timestamp": "00:49", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "A diagnosed lifelong condition with stated lifetime-care needs — objective-anchor claims of the most serious class."
    },
    "coverage_path": {
      "evidence": [
        { "quote": "Yes, at Valley Regional.", "timestamp": "00:42", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Institutional hospital defendant — an insured deep-pocket path as stated."
    },
    "collectability_deep_pocket": {
      "evidence": [
        { "quote": "Yes, at Valley Regional.", "timestamp": "00:42", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Hospital defendant — stated deep pocket."
    },
    "procedural_urgency": {
      "evidence": [
        { "quote": "Yes, at Valley Regional. Four in March.", "timestamp": "00:42", "speaker": "CALLER" }
      ],
      "level": "thin",
      "basis": "Birth-injury claim with the child now four — minors' med-mal timing rules may be in play. A flag for specialist counsel this week; no date computed."
    },
    "client_risk_markers": {
      "evidence": [
        { "quote": "We won't. Thank you. Nobody's ever explained any of this.", "timestamp": "02:01", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Cooperative, candid, realistic family engaged with the process; zero risk-marker behaviors."
    },
    "case_type_fit": {
      "evidence": [
        { "quote": "the monitor strips showed the baby was in distress for a long time and they waited way too long to do the C-section", "timestamp": "00:05", "speaker": "CALLER" }
      ],
      "level": "fatal",
      "basis": "med_mal is on the firm's declined list — a routing fact, not a merits judgment; the visible specialist value is high, which makes this the referral archetype."
    }
  },
  "resource_tiers": {
    "effort_tier": { "evidence": [ { "quote": "it needs a specialist firm with the medical experts and the resources these cases take", "timestamp": "00:58", "speaker": "INTAKE" } ], "tier": "heavy_lit", "basis": "Expert-dependent MICRA litigation for whoever takes it — fetal-monitoring experts, life-care planners, contested causation." },
    "carry_tier": { "evidence": [ { "quote": "The doctors said lifetime care.", "timestamp": "00:49", "speaker": "CALLER" } ], "tier": "long_tail", "basis": "Multi-year litigation track with a minor plaintiff and court-approval steps." },
    "capital_tier": { "evidence": [ { "quote": "it needs a specialist firm with the medical experts", "timestamp": "00:58", "speaker": "INTAKE" } ], "tier": "heavy", "basis": "Six-figure expert and litigation costs class for the firm that prosecutes it." }
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
  "g2_trigger_quote": "Yes, at Valley Regional. Four in March.",
  "recommended_disposition": "refer_out",
  "value_tier": "high",
  "posture_applied": "selective",
  "confidence_tier": "high",
  "abstained": false,
  "urgency_flags": ["sol_adjacent"],
  "attorney_review_required": false,
  "mist_flag": false,
  "refer_comparison_expected": true
}

CALIBRATION NOTES (never shown to the LLM)
- Anchor: a high-value case outside firm competence is a REFERRAL, not a
  decline. case_type_fit fatal routes to refer_out in code; declining would
  forfeit a legitimate CRPC 1.5.1 referral fee and abandon a meritorious
  family. The refer-out comparison (high specialist value tier at near-zero
  in-house hours) is surfaced by the decision table.
- G2 (deadline-adjacent) fires on the observed sol_adjacent fact and caps out
  DEVELOP — a ticking minor's med-mal claim cannot sit in anyone's queue; the
  same-day warm referral is exactly the forced early exercise the gate wants.
- Confidence high (schema 2.1): six of the MVA-shaped checklist questions
  are structurally not_applicable to a birth-injury intake, and the N/A-aware
  capture ratio (2 asked of 4 applicable = 50%) clears the 40% bar — the rep
  is not penalized for questions that cannot apply. Liability reads unknown
  (expert territory) but 6/7 dimensions rest on cited evidence; the tier
  grades the ROUTING confidence (refer to a specialist today), which is high.
  Under schema 2.0 this gold pinned medium because the raw asked-count rule
  (< 4 of 10) treated not-applicable as unasked.
