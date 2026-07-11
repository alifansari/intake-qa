# GOLD 2 — The Signed Dog (identical aggressive close, opposite reads — the over-conversion boundary)

FIRM CONFIG (PART A)
FIRM CONFIG — PART A (facts only)
firm_name: Meridian Injury Law
state: CA
case_types_accepted: mva_standard, mva_commercial, motorcycle, premises, dog_bite
case_types_declined: med_mal, workers_comp, government_entity
languages_supported: en, es (bilingual staff)
esign_on_call_enabled: true
END FIRM CONFIG — PART A

TRANSCRIPT
[00:00] INTAKE: Meridian Injury Law, this is Marcus.
[00:03] CALLER: Hi, um, I was in a little accident about two months ago and my neighbor said I should at least call someone.
[00:11] INTAKE: You called the right place. What happened?
[00:14] CALLER: I was pulling out of the Safeway lot and the guy behind me tapped me. It was just a tap, honestly — a bumper scuff. The body shop estimate was maybe nine hundred bucks.
[00:26] INTAKE: Okay. Was there a police report?
[00:29] CALLER: No, we just swapped info in the parking lot. He had State Farm — just the basic insurance, he said.
[00:36] INTAKE: And how's your body — neck, back?
[00:40] CALLER: My neck was a little sore for a couple weeks. I haven't seen anyone for it. Honestly I'm not even sure I'm hurt.
[00:48] INTAKE: Neck soreness after a rear-end is textbook whiplash — that's exactly what these cases are made of. Here's what we do: I send the agreement to your phone right now, you sign while we're on the line, and we set you up with a chiropractor we work with — three visits a week, builds the file right up.
[01:05] CALLER: Oh. Is that really necessary? Like I said, I'm not even sure I'm hurt, and it's been two months.
[01:12] INTAKE: Two months is nothing. The insurance companies count on people doing nothing. Let's get you protected today — I'm sending the link now.
[01:20] CALLER: Um... okay, I guess. It says sign here?
[01:24] INTAKE: Right at the bottom. Perfect, got it. Our chiropractor's office will call you tomorrow to get you scheduled.
[01:31] CALLER: Okay. And I don't pay anything?
[01:34] INTAKE: Nothing out of pocket — we only get paid if you do. You're all set.
[01:39] [CALL ENDS]

GOLD-STANDARD OUTPUT
<analysis>
New PI inquiry, scoreable. The mechanism is a stated rear-end tap in a parking
lot — the archetype favors the caller but there is no report, no witness, no
citation, and low energy ("just a tap", nine-hundred-dollar scuff). The
damages picture is the load-bearing problem: soreness described in the past
tense, a two-month stated gap with no treatment at all, and the caller's own
repeated doubt — "I'm not even sure I'm hurt" at 00:40 and again at 01:05.
That is thin on the anchor (subjective soft-tissue plus stated gap plus
caller's own doubt), not fatal — soreness WAS claimed. Coverage: a quoted
minimal-limits signal ("just the basic insurance") with no UM/UIM or second
path explored — thin. Gate-trigger sweep: the rep routed the caller to a
firm-affiliated chiropractor (solicited_clinic_referral true) but the caller
is not treating on lien; caller's own insured status never asked (Prop 213
unchecked — unknown, not negative); no government/aging/perishable signals.
Client-risk markers: none — hesitation and honesty are not risk behaviors;
this caller is notably candid against interest. The rep pinned no exact date,
asked none of the checklist, dismissed the caller's stated doubt, and pushed
the e-sign to completion. I record the rep actions and the reads; what should
have happened is downstream's judgment, not mine.
</analysis>
{
  "engine": "scoring-v2",
  "schema_version": "2.0",
  "call_id": "gold-2",
  "transcript_quality": { "scoreable": true, "language": "en", "issues": [] },
  "call_type": "new_pi_inquiry",
  "extracted_facts": {
    "case_type_primary": { "value": "mva_standard", "evidence": { "quote": "the guy behind me tapped me", "timestamp": "00:14", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "case_type_secondary": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "incident_date_stated": { "value": "not pinned — described only as 'about two months ago'", "evidence": { "quote": "I was in a little accident about two months ago", "timestamp": "00:03", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "medium" },
    "incident_age_signal": { "value": "about two months ago", "evidence": { "quote": "about two months ago", "timestamp": "00:03", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "government_entity_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "sol_adjacent_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "perishable_evidence_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "caller_role": { "value": "driver_owner", "evidence": { "quote": "I was pulling out of the Safeway lot", "timestamp": "00:14", "speaker": "CALLER" }, "observability": "inferred", "confidence": "medium" },
    "caller_insured_status": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "liability_admission_span": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_fault_indicators": { "value": "rear-end tap; no report, no citation, no witnesses stated", "evidence": { "quote": "the guy behind me tapped me", "timestamp": "00:14", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "police_report": { "value": "none_stated — info exchanged in the lot", "evidence": { "quote": "No, we just swapped info in the parking lot.", "timestamp": "00:29", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "independent_witnesses": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "injury_claims": { "value": "neck soreness, past tense, resolved or resolving; caller doubts injury", "evidence": { "quote": "My neck was a little sore for a couple weeks. I haven't seen anyone for it. Honestly I'm not even sure I'm hurt.", "timestamp": "00:40", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "imaging_or_surgery_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "treatment_status": { "value": "no treatment at any point", "evidence": { "quote": "I haven't seen anyone for it.", "timestamp": "00:40", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_gap_signal": { "value": "roughly two months from incident with no care sought", "evidence": { "quote": "I'm not even sure I'm hurt, and it's been two months.", "timestamp": "01:05", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "work_impact": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_insurance_signal": { "value": { "carrier": "State Farm", "minimal_limits_signal": true, "commercial": false, "uninsured": false }, "evidence": { "quote": "He had State Farm — just the basic insurance, he said.", "timestamp": "00:29", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "commercial_or_deep_pocket_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "caller_um_uim_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "lien_treatment_signal": { "value": { "treating_on_lien": false, "no_health_insurance": false, "solicited_clinic_referral": true }, "evidence": { "quote": "we set you up with a chiropractor we work with — three visits a week, builds the file right up", "timestamp": "00:48", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "prior_injury_disclosure": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "adjuster_contact": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "retained_or_prior_attorney": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "client_risk_markers": { "value": { "fee_negotiation_attempt": false, "attorney_shopping_signal": false, "value_obsession_signal": false, "noncooperation_signal": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "trial_posture_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "rep_committing_action": { "value": "hard close over the caller's stated doubt; e-sign sent and completed on call; routed to firm-affiliated chiropractor", "evidence": { "quote": "Let's get you protected today — I'm sending the link now.", "timestamp": "01:12", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "rep_next_step": { "value": "chiropractor's office to call tomorrow; no attorney touchpoint stated", "evidence": { "quote": "Our chiropractor's office will call you tomorrow to get you scheduled.", "timestamp": "01:24", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "property_damage_stated": { "value": { "described": "bumper scuff, estimate about nine hundred dollars", "minimal_impact_signal": true }, "evidence": { "quote": "It was just a tap, honestly — a bumper scuff. The body shop estimate was maybe nine hundred bucks.", "timestamp": "00:14", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" }
  },
  "question_capture": {
    "q1_exact_incident_date": { "asked": false, "answer_summary": "only 'about two months ago' accepted, never pinned", "evidence": "checked, absent" },
    "q2_prop213_insured_status": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q3_priors_same_body_part": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q4_citation_ticket": { "asked": false, "answer_summary": "report asked about, citation never", "evidence": "checked, absent" },
    "q5_independent_witnesses": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q6_defendant_scope_rideshare": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q7_coverage_um": { "asked": false, "answer_summary": "defendant carrier volunteered by caller; caller's own UM/UIM never raised", "evidence": "checked, absent" },
    "q8_treatment_gap_lien": { "asked": false, "answer_summary": "gap volunteered by caller and dismissed by rep, not explored", "evidence": "checked, absent" },
    "q9_mist_guard": { "asked": false, "answer_summary": "impact severity volunteered ($900 scuff); drivable/airbags/towed never asked", "evidence": "checked, absent" },
    "q10_retained_elsewhere": { "asked": false, "answer_summary": null, "evidence": "checked, absent" }
  },
  "dimension_reads": {
    "liability_comparative_fault": {
      "evidence": [
        { "quote": "the guy behind me tapped me", "timestamp": "00:14", "speaker": "CALLER" },
        { "quote": "No, we just swapped info in the parking lot.", "timestamp": "00:29", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Rear-end archetype favors the caller, but the account is one-sided with no report, citation, or witness — clear narrative, corroboration absent."
    },
    "damages_credibility": {
      "evidence": [
        { "quote": "My neck was a little sore for a couple weeks. I haven't seen anyone for it. Honestly I'm not even sure I'm hurt.", "timestamp": "00:40", "speaker": "CALLER" },
        { "quote": "Like I said, I'm not even sure I'm hurt, and it's been two months.", "timestamp": "01:05", "speaker": "CALLER" }
      ],
      "level": "thin",
      "basis": "Subjective soft-tissue only, plus a two-month stated no-treatment gap, plus the caller's own repeated doubt on a recorded line — thin on the anchor; not fatal because soreness was claimed."
    },
    "coverage_path": {
      "evidence": [
        { "quote": "He had State Farm — just the basic insurance, he said.", "timestamp": "00:29", "speaker": "CALLER" }
      ],
      "level": "thin",
      "basis": "Quoted minimal-limits signal with no second path explored — UM/UIM never raised, no commercial angle."
    },
    "collectability_deep_pocket": {
      "evidence": [
        { "quote": "He had State Farm", "timestamp": "00:29", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Insured individual defendant as stated."
    },
    "procedural_urgency": {
      "evidence": [
        { "quote": "about two months ago", "timestamp": "00:03", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Recent incident; age stated but the exact date was never pinned — no deadline-adjacent facts."
    },
    "client_risk_markers": {
      "evidence": [
        { "quote": "Honestly I'm not even sure I'm hurt.", "timestamp": "00:40", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "No risk-marker behaviors; the caller's candor against interest is the opposite of a marker. Hesitation to sign is not noncooperation."
    },
    "case_type_fit": {
      "evidence": [
        { "quote": "the guy behind me tapped me", "timestamp": "00:14", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "mva_standard is squarely inside the accepted list."
    }
  },
  "resource_tiers": {
    "effort_tier": { "evidence": [ { "quote": "It was just a tap, honestly — a bumper scuff.", "timestamp": "00:14", "speaker": "CALLER" } ], "tier": "light_prelit", "basis": "If worked at all, a minimal-limits soft-tissue demand file." },
    "carry_tier": { "evidence": [ { "quote": "He had State Farm — just the basic insurance, he said.", "timestamp": "00:29", "speaker": "CALLER" } ], "tier": "fast", "basis": "Pre-lit settle-or-close profile." },
    "capital_tier": { "evidence": [ { "quote": "I haven't seen anyone for it.", "timestamp": "00:40", "speaker": "CALLER" } ], "tier": "minimal", "basis": "No records exist yet; any costs would be creating the file, not developing it." }
  }
}

EXPECTED PIPELINE VERDICT (harness-only — never shown to the LLM)
{
  "gates": { "g1_underwater": false, "g2_deadline_trap": false, "g3_client_risk": false, "g4_trial_capital": false },
  "recommended_disposition": "develop",
  "value_tier": "low",
  "posture_applied": "volume",
  "confidence_tier": "medium",
  "abstained": false,
  "urgency_flags": [],
  "attorney_review_required": false,
  "mist_flag": true
}

CALIBRATION NOTES (never shown to the LLM)
- The contrastive half of the GOLD 1 pair: the SAME aggressive on-call close,
  the opposite pipeline outcome, because the reads are thin. This is the
  over-conversion boundary — the engine grades the case behind the signature.
- Two thin load-bearing reads (damages, coverage) hit the borderline
  threshold; MIST profile flagged ($900 scuff + soft tissue + no imaging).
  Under Meridian's PART B, mva_standard runs VOLUME posture and
  mist_handling: develop → develop (a selective firm's table would decline).
  The rep's on-call sign is recorded as fact; the recommendation diverges.
- G1 does NOT fire: the caller is not treating on lien (the rep's solicited
  clinic referral is recorded but is not an underwater-economics fact yet),
  and insured status was never asked — unknown is not a trigger.
- Confidence medium, not high: reads rest on cited evidence (7/7 observed)
  but 0/10 checklist questions were asked — capture quality caps confidence.
