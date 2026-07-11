# GOLD 1 — The Clean Sign (commercial rear-end; the fast e-sign the reads actually justify)

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
[00:00] INTAKE: Meridian Injury Law, this is Danielle. How can I help you?
[00:05] CALLER: Hi. I got rear-ended on the 880 at the metering lights — a Roto-Rooter van hit me. My neck's been bad ever since.
[00:14] INTAKE: I'm sorry that happened — that sounds frightening. I'm going to ask you a few questions about the crash and your care, then explain exactly how we can help. When did this happen?
[00:24] CALLER: March 14th, morning commute. So about three and a half weeks ago now.
[00:30] INTAKE: Okay. Walk me through it.
[00:33] CALLER: I was fully stopped at the metering light and the van just plowed into me. CHP came out and cited their driver — following too close. I have the report number: 24-113-0876.
[00:46] INTAKE: That's very helpful. You said Roto-Rooter — a marked company van, logo and everything?
[00:52] CALLER: Full logo wrap. The driver told me he was on a service call when it happened.
[00:58] INTAKE: Got it. Was a ticket issued to anyone besides their driver — anything to you?
[01:03] CALLER: No, nothing to me. The officer said I did everything right.
[01:08] INTAKE: And your neck — what care have you had?
[01:12] CALLER: I went to the ER that same night, they did a CT. Then my doctor sent me for an MRI last week — it shows a herniated disc at C5-6. The orthopedist scheduled an epidural injection, and he said if that doesn't hold, possibly a fusion.
[01:29] INTAKE: I'm sorry — that's a serious injury, and you're doing the right things. Have you ever injured your neck before this — any prior claims or old injuries to that area?
[01:38] CALLER: No, never. Nothing like this.
[01:41] INTAKE: Are you working right now?
[01:43] CALLER: No. I'm a warehouse lead — I've been out the full three weeks. My car's still in the shop too, the whole rear end was crushed.
[01:52] INTAKE: Do you have your own auto insurance, and do you know what kind?
[01:56] CALLER: Yeah, full coverage with AAA.
[01:59] INTAKE: Perfect. Has the van's insurance company or any adjuster contacted you?
[02:04] CALLER: Someone left a voicemail yesterday, some claims number.
[02:07] INTAKE: Don't call them back and don't give any recorded statement before you talk with our attorney — that's important. Have you spoken with or hired any other lawyer on this?
[02:15] CALLER: No, you're the first call.
[02:17] INTAKE: Then here's what I'd like to do. This is exactly the kind of case we handle. Our fee is a percentage of the recovery — you pay nothing out of pocket, and case costs are separate from the fee, which the attorney will walk you through line by line. I can text the agreement to your phone right now and you can sign while we're on the line. Then Maria calls you tomorrow at 10am to get your ER and MRI records moving.
[02:36] CALLER: Okay, yeah. Send it.
[02:38] INTAKE: Sent. Take your time reading it... perfect, I see your signature. You did the right thing calling. Tomorrow, 10am, Maria — and you focus on that epidural.
[02:49] [CALL ENDS]

GOLD-STANDARD OUTPUT
<analysis>
New PI inquiry, English, clean diarization, fully scoreable. Mechanism is a
decisive archetype stated with corroboration: fully stopped at a metering
light, rear-ended by a marked commercial van, CHP cited the other driver,
report number on the call. No factual self-fault span anywhere — the officer
reportedly told the caller they did everything right. Damages carry objective
anchors as claimed: same-night ER with CT, MRI-confirmed C5-6 herniation,
epidural scheduled with possible fusion, three weeks off work. Coverage path
is the commercial angle (logo-wrapped van, driver on a service call) plus the
caller's own AAA full coverage — a strong stated path even though actual
limits are never knowable from a call. Gate-trigger sweep: no government
defendant, no aging-claim signal (three and a half weeks, date pinned), no
perishable-evidence class, caller was insured (Prop 213 profile checked,
absent), no lien-clinic routing, no client-risk behaviors — the caller is
candid and cooperative, including volunteering the adjuster voicemail. Rep
captured nearly the whole checklist and e-signed on the call. My job stops at
the reads: no disposition, no value, no dates.
</analysis>
{
  "engine": "scoring-v2",
  "schema_version": "2.0",
  "call_id": "gold-1",
  "transcript_quality": { "scoreable": true, "language": "en", "issues": [] },
  "call_type": "new_pi_inquiry",
  "extracted_facts": {
    "case_type_primary": { "value": "mva_commercial", "evidence": { "quote": "a Roto-Rooter van hit me", "timestamp": "00:05", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "case_type_secondary": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "incident_date_stated": { "value": "March 14th, morning commute", "evidence": { "quote": "March 14th, morning commute.", "timestamp": "00:24", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "incident_age_signal": { "value": "about three and a half weeks ago", "evidence": { "quote": "So about three and a half weeks ago now.", "timestamp": "00:24", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "government_entity_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "sol_adjacent_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "perishable_evidence_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "caller_role": { "value": "driver_owner", "evidence": { "quote": "My car's still in the shop too", "timestamp": "01:43", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "caller_insured_status": { "value": "insured", "evidence": { "quote": "Yeah, full coverage with AAA.", "timestamp": "01:56", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "liability_admission_span": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_fault_indicators": { "value": "rear-end while fully stopped; CHP cited defendant driver (following too close); marked commercial van", "evidence": { "quote": "I was fully stopped at the metering light and the van just plowed into me. CHP came out and cited their driver", "timestamp": "00:33", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "police_report": { "value": "exists, report number 24-113-0876", "evidence": { "quote": "I have the report number: 24-113-0876.", "timestamp": "00:33", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "independent_witnesses": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "injury_claims": { "value": "neck injury; MRI-confirmed C5-6 herniated disc (stated, unverified)", "evidence": { "quote": "it shows a herniated disc at C5-6", "timestamp": "01:12", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "imaging_or_surgery_signal": { "value": { "present": true, "description": "ER CT same night; MRI-confirmed C5-6 herniation; epidural scheduled; possible fusion" }, "evidence": { "quote": "they did a CT. Then my doctor sent me for an MRI last week — it shows a herniated disc at C5-6. The orthopedist scheduled an epidural injection", "timestamp": "01:12", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_status": { "value": "same-night ER, then MD-directed imaging and orthopedic care, ongoing", "evidence": { "quote": "I went to the ER that same night", "timestamp": "01:12", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_gap_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "work_impact": { "value": "warehouse lead, out of work three weeks", "evidence": { "quote": "I'm a warehouse lead — I've been out the full three weeks.", "timestamp": "01:43", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "defendant_insurance_signal": { "value": { "carrier": null, "minimal_limits_signal": false, "commercial": true, "uninsured": false }, "evidence": { "quote": "Full logo wrap. The driver told me he was on a service call when it happened.", "timestamp": "00:52", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "commercial_or_deep_pocket_signal": { "value": "marked Roto-Rooter company van, driver on a service call (course and scope)", "evidence": { "quote": "The driver told me he was on a service call when it happened.", "timestamp": "00:52", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "caller_um_uim_signal": { "value": "AAA, full coverage (type unverified)", "evidence": { "quote": "Yeah, full coverage with AAA.", "timestamp": "01:56", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "lien_treatment_signal": { "value": { "treating_on_lien": false, "no_health_insurance": false, "solicited_clinic_referral": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "prior_injury_disclosure": { "value": "no prior neck injuries or claims, as stated", "evidence": { "quote": "No, never. Nothing like this.", "timestamp": "01:38", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "adjuster_contact": { "value": "adverse carrier left a voicemail; rep warned against recorded statement", "evidence": { "quote": "Someone left a voicemail yesterday, some claims number.", "timestamp": "02:04", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "retained_or_prior_attorney": { "value": "none — first call", "evidence": { "quote": "No, you're the first call.", "timestamp": "02:15", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "client_risk_markers": { "value": { "fee_negotiation_attempt": false, "attorney_shopping_signal": false, "value_obsession_signal": false, "noncooperation_signal": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "trial_posture_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "rep_committing_action": { "value": "e-sign sent and signature confirmed on the call", "evidence": { "quote": "Sent. Take your time reading it... perfect, I see your signature.", "timestamp": "02:38", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "rep_next_step": { "value": "specific: Maria calls tomorrow 10am to start ER and MRI records", "evidence": { "quote": "Then Maria calls you tomorrow at 10am to get your ER and MRI records moving.", "timestamp": "02:17", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "property_damage_stated": { "value": { "described": "whole rear end crushed, car in the shop", "minimal_impact_signal": false }, "evidence": { "quote": "My car's still in the shop too, the whole rear end was crushed.", "timestamp": "01:43", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" }
  },
  "question_capture": {
    "q1_exact_incident_date": { "asked": true, "answer_summary": "March 14th, morning", "evidence": "When did this happen?" },
    "q2_prop213_insured_status": { "asked": true, "answer_summary": "caller insured, AAA full coverage", "evidence": "Do you have your own auto insurance, and do you know what kind?" },
    "q3_priors_same_body_part": { "asked": true, "answer_summary": "no prior neck injuries or claims", "evidence": "Have you ever injured your neck before this — any prior claims or old injuries to that area?" },
    "q4_citation_ticket": { "asked": true, "answer_summary": "citation to defendant driver only; nothing to caller", "evidence": "Was a ticket issued to anyone besides their driver — anything to you?" },
    "q5_independent_witnesses": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q6_defendant_scope_rideshare": { "asked": true, "answer_summary": "driver on a service call — course-and-scope confirmed via caller's account", "evidence": "You said Roto-Rooter — a marked company van, logo and everything?" },
    "q7_coverage_um": { "asked": true, "answer_summary": "caller carries AAA full coverage; defendant commercial", "evidence": "Do you have your own auto insurance, and do you know what kind?" },
    "q8_treatment_gap_lien": { "asked": true, "answer_summary": "no gap — same-night ER, continuous MD-directed care", "evidence": "And your neck — what care have you had?" },
    "q9_mist_guard": { "asked": false, "answer_summary": "property damage volunteered (rear end crushed) but drivable/airbags/towed not asked", "evidence": "checked, absent" },
    "q10_retained_elsewhere": { "asked": true, "answer_summary": "no other attorney", "evidence": "Have you spoken with or hired any other lawyer on this?" }
  },
  "dimension_reads": {
    "liability_comparative_fault": {
      "evidence": [
        { "quote": "I was fully stopped at the metering light and the van just plowed into me. CHP came out and cited their driver", "timestamp": "00:33", "speaker": "CALLER" },
        { "quote": "No, nothing to me. The officer said I did everything right.", "timestamp": "01:03", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Decisive rear-end-while-stopped archetype with a stated citation to the defendant and a report number; no factual self-fault span."
    },
    "damages_credibility": {
      "evidence": [
        { "quote": "they did a CT. Then my doctor sent me for an MRI last week — it shows a herniated disc at C5-6. The orthopedist scheduled an epidural injection", "timestamp": "01:12", "speaker": "CALLER" },
        { "quote": "I'm a warehouse lead — I've been out the full three weeks.", "timestamp": "01:43", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Objective-anchor claims — same-night ER, CT, MRI-confirmed herniation, scheduled epidural — plus stated work loss; verification deferred to records."
    },
    "coverage_path": {
      "evidence": [
        { "quote": "Full logo wrap. The driver told me he was on a service call when it happened.", "timestamp": "00:52", "speaker": "CALLER" },
        { "quote": "Yeah, full coverage with AAA.", "timestamp": "01:56", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Commercial defendant in course and scope plus the caller's own confirmed coverage — a strong stated path; actual limits remain not-on-call."
    },
    "collectability_deep_pocket": {
      "evidence": [
        { "quote": "a Roto-Rooter van hit me", "timestamp": "00:05", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Corporate defendant with an employer vehicle in scope — a stated deep pocket."
    },
    "procedural_urgency": {
      "evidence": [
        { "quote": "March 14th, morning commute. So about three and a half weeks ago now.", "timestamp": "00:24", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Fresh incident with the date pinned; no deadline-adjacent or perishable-evidence facts stated."
    },
    "client_risk_markers": {
      "evidence": [
        { "quote": "Someone left a voicemail yesterday, some claims number.", "timestamp": "02:04", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Affirmative cooperation observed — candid unprompted disclosure of adjuster contact, direct answers, follows the rep's process; zero risk-marker behaviors."
    },
    "case_type_fit": {
      "evidence": [
        { "quote": "a Roto-Rooter van hit me", "timestamp": "00:05", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "mva_commercial is squarely inside the firm's accepted list."
    }
  },
  "resource_tiers": {
    "effort_tier": { "evidence": [ { "quote": "CHP came out and cited their driver", "timestamp": "00:33", "speaker": "CALLER" } ], "tier": "standard", "basis": "Commercial carrier will defend, but cited clear liability plus objective injury keeps this a pre-lit-resolvable file with ordinary workup." },
    "carry_tier": { "evidence": [ { "quote": "The orthopedist scheduled an epidural injection", "timestamp": "01:12", "speaker": "CALLER" } ], "tier": "medium", "basis": "Treatment course (epidural, possible fusion) must mature before demand; contested-but-resolvable pre-suit profile." },
    "capital_tier": { "evidence": [ { "quote": "it shows a herniated disc at C5-6", "timestamp": "01:12", "speaker": "CALLER" } ], "tier": "moderate", "basis": "Imaging and specialist records workup; no expert-heavy litigation signals stated." }
  }
}

EXPECTED PIPELINE VERDICT (harness-only — never shown to the LLM)
{
  "gates": { "g1_underwater": false, "g2_deadline_trap": false, "g3_client_risk": false, "g4_trial_capital": false },
  "recommended_disposition": "sign_now",
  "value_tier": "high",
  "posture_applied": "selective",
  "confidence_tier": "high",
  "abstained": false,
  "urgency_flags": [],
  "attorney_review_required": false,
  "mist_flag": false
}

CALIBRATION NOTES (never shown to the LLM)
- Anchor: the fast on-call e-sign is CORRECT here because the reads justify
  it — contrast with GOLD 2, where the identical aggressive close meets thin
  reads. The pair teaches the decision boundary, not the behavior.
- The LLM output contains no disposition/tier; sign_now emerges from the
  decision table (all load-bearing reads strong, no gates, selective posture
  satisfied). Confidence high: 7/7 dimensions read on cited evidence, 8/10
  checklist questions asked.
