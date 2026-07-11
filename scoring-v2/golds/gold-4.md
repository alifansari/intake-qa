# GOLD 4 — The Correct Decline, Prop 213 (strong liability cannot rescue a statutorily-gutted file)

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
[00:04] CALLER: Hi. I got rear-ended three weeks ago, May 20th, on Hegenberger. The other guy straight up admitted it — he told the officer he wasn't paying attention.
[00:15] INTAKE: I'm sorry that happened. Was a police report taken?
[00:18] CALLER: Yeah, Oakland PD came out. He got the ticket, not me.
[00:22] INTAKE: Good. Are you hurt — what are you feeling?
[00:25] CALLER: My lower back is real bad. I've been going to a chiropractor three times a week since the first week. It's helping a little.
[00:33] INTAKE: Any X-rays, MRI, anything like that? Emergency room?
[00:37] CALLER: No ER. The chiropractor did X-rays, said nothing's broken, it's the muscles and maybe a disc. No MRI yet.
[00:44] INTAKE: Understood. Does the other driver have insurance?
[00:47] CALLER: Yeah, Allstate. I have his claim number and everything.
[00:51] INTAKE: And this is important, so I want to ask it carefully — the car you were driving, is it yours, and did you have insurance on it that day?
[00:59] CALLER: It's my car. And no — I'll be honest with you, I let the insurance lapse in January. Money got tight. I know that's bad.
[01:08] INTAKE: I really appreciate you being straight with me — a lot of people aren't, and it always comes out later. Let me explain what that means, because it matters a lot in California. There's a law — it's called Proposition 213 — that says if you own the car and it wasn't insured, you can't recover what's called pain-and-suffering damages, even when the other driver is completely at fault. You can still recover your actual bills — the chiropractic care, any lost wages. But on an injury like yours, that usually ends up being a few thousand dollars, and after costs there's often very little left for you.
[01:36] CALLER: Wow. Okay. So you're saying I don't have a case?
[01:40] INTAKE: You have a claim — it's just a small one, and I have to be honest that it's not one our firm can take on. That's about the economics, not about you or who was at fault. Here's what I'd suggest: you can pursue the medical bills directly with Allstate yourself — you have the claim number, and for a bills-only claim that's very doable. And I'm going to text you the number for the Alameda County Bar's referral service and for Bay Area Legal Aid — if you want someone to look at it, that's a good free first stop. One thing to know, not legal advice on your specific dates: injury claims in California generally have a two-year window, so don't sit on it. If anything changes — say you find out you actually had coverage, or there's an MRI that shows something serious — call me back that day.
[02:12] CALLER: Okay. That actually helps. Thanks for not wasting my time.
[02:16] INTAKE: You did the right thing calling, and I'm sorry about your back. Take care of yourself.
[02:21] [CALL ENDS]

GOLD-STANDARD OUTPUT
<analysis>
New PI inquiry, scoreable. Liability is genuinely strong: rear-end, the other
driver's admission to the officer as recounted, ticket to the defendant,
Oakland PD report. Damages: consistent chiropractic treatment three times a
week since the first week, no gap, functional complaint — adequate on the
anchor; no objective anchors (chiro X-rays negative, no MRI). The
load-bearing extraction is Prop 213: the caller states plainly that they own
the car and let the insurance lapse in January — uninsured owner-operator,
observed on call, quote in hand. Under Civ. Code §3333.4 that bars
NON-economic damages only; economic damages survive (and passengers/
non-owners would be excepted; the DUI-restoration branch does not apply on
these facts). I extract the status and the quote — the disposition math is
downstream. Coverage: defendant insured (Allstate, claim number held) —
adequate; collectability adequate. No aging/government/perishable signals
(May 20th, three weeks ago, date pinned). Client-risk: the unprompted candor
about the lapse is affirmative cooperation — strong. The rep confirmed the
gate fact carefully, declined gracefully without opining on merits beyond
the statute's shape, gave a generic two-year caution rather than a computed
date, and made concrete referrals. Reads only; the gate is code's to fire.
</analysis>
{
  "engine": "scoring-v2",
  "schema_version": "2.0",
  "call_id": "gold-4",
  "transcript_quality": { "scoreable": true, "language": "en", "issues": [] },
  "call_type": "new_pi_inquiry",
  "extracted_facts": {
    "case_type_primary": { "value": "mva_standard", "evidence": { "quote": "I got rear-ended three weeks ago, May 20th, on Hegenberger.", "timestamp": "00:04", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "case_type_secondary": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "incident_date_stated": { "value": "May 20th", "evidence": { "quote": "three weeks ago, May 20th, on Hegenberger", "timestamp": "00:04", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "incident_age_signal": { "value": "three weeks ago", "evidence": { "quote": "I got rear-ended three weeks ago", "timestamp": "00:04", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "government_entity_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "sol_adjacent_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "perishable_evidence_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "caller_role": { "value": "driver_owner", "evidence": { "quote": "It's my car.", "timestamp": "00:59", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "caller_insured_status": { "value": "uninsured_owner_operator", "evidence": { "quote": "It's my car. And no — I'll be honest with you, I let the insurance lapse in January.", "timestamp": "00:59", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "liability_admission_span": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_fault_indicators": { "value": "rear-end; defendant admitted inattention to officer; citation to defendant; Oakland PD report", "evidence": { "quote": "he told the officer he wasn't paying attention", "timestamp": "00:04", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "police_report": { "value": "exists — Oakland PD; ticket issued to defendant", "evidence": { "quote": "Yeah, Oakland PD came out. He got the ticket, not me.", "timestamp": "00:18", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "independent_witnesses": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "injury_claims": { "value": "lower-back pain, significant by the caller's account ('real bad'), improving slightly with care", "evidence": { "quote": "My lower back is real bad.", "timestamp": "00:25", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "imaging_or_surgery_signal": { "value": { "present": false, "description": "chiropractic X-rays negative for fracture; no MRI yet" }, "evidence": { "quote": "The chiropractor did X-rays, said nothing's broken, it's the muscles and maybe a disc. No MRI yet.", "timestamp": "00:37", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_status": { "value": "chiropractic 3x/week since the first week, ongoing", "evidence": { "quote": "I've been going to a chiropractor three times a week since the first week.", "timestamp": "00:25", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "treatment_gap_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "work_impact": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "defendant_insurance_signal": { "value": { "carrier": "Allstate", "minimal_limits_signal": false, "commercial": false, "uninsured": false }, "evidence": { "quote": "Yeah, Allstate. I have his claim number and everything.", "timestamp": "00:47", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "commercial_or_deep_pocket_signal": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "caller_um_uim_signal": { "value": "none — caller's own policy lapsed in January", "evidence": { "quote": "I let the insurance lapse in January.", "timestamp": "00:59", "speaker": "CALLER" }, "observability": "observed_on_call", "confidence": "high" },
    "lien_treatment_signal": { "value": { "treating_on_lien": false, "no_health_insurance": false, "solicited_clinic_referral": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "medium" },
    "prior_injury_disclosure": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "adjuster_contact": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "retained_or_prior_attorney": { "value": null, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "client_risk_markers": { "value": { "fee_negotiation_attempt": false, "attorney_shopping_signal": false, "value_obsession_signal": false, "noncooperation_signal": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "trial_posture_signal": { "value": { "present": false, "description": null }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" },
    "rep_committing_action": { "value": "no sign attempted; graceful decline with self-help path, bar referral service, and legal aid numbers", "evidence": { "quote": "it's not one our firm can take on. That's about the economics, not about you or who was at fault.", "timestamp": "01:40", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "rep_next_step": { "value": "referral numbers texted; generic two-year caution given without computing the caller's date; door left open on changed facts", "evidence": { "quote": "injury claims in California generally have a two-year window, so don't sit on it", "timestamp": "01:40", "speaker": "INTAKE" }, "observability": "observed_on_call", "confidence": "high" },
    "property_damage_stated": { "value": { "described": null, "minimal_impact_signal": false }, "evidence": "checked, absent", "observability": "unknown", "confidence": "high" }
  },
  "question_capture": {
    "q1_exact_incident_date": { "asked": false, "answer_summary": "May 20th volunteered by caller in the first breath", "evidence": "checked, absent" },
    "q2_prop213_insured_status": { "asked": true, "answer_summary": "caller owns the car and was uninsured that day — lapse since January", "evidence": "the car you were driving, is it yours, and did you have insurance on it that day?" },
    "q3_priors_same_body_part": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q4_citation_ticket": { "asked": true, "answer_summary": "ticket to defendant", "evidence": "Was a police report taken?" },
    "q5_independent_witnesses": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q6_defendant_scope_rideshare": { "asked": false, "answer_summary": "no employment/rideshare facts in play", "evidence": "checked, absent" },
    "q7_coverage_um": { "asked": true, "answer_summary": "defendant Allstate with claim number; caller's own coverage lapsed", "evidence": "Does the other driver have insurance?" },
    "q8_treatment_gap_lien": { "asked": true, "answer_summary": "no gap — chiro from first week; payment path not discussed", "evidence": "Any X-rays, MRI, anything like that? Emergency room?" },
    "q9_mist_guard": { "asked": false, "answer_summary": null, "evidence": "checked, absent" },
    "q10_retained_elsewhere": { "asked": false, "answer_summary": null, "evidence": "checked, absent" }
  },
  "dimension_reads": {
    "liability_comparative_fault": {
      "evidence": [
        { "quote": "he told the officer he wasn't paying attention", "timestamp": "00:04", "speaker": "CALLER" },
        { "quote": "He got the ticket, not me.", "timestamp": "00:18", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Rear-end with the defendant's recounted admission, citation to defendant, and a police report — decisive archetype with corroboration."
    },
    "damages_credibility": {
      "evidence": [
        { "quote": "My lower back is real bad.", "timestamp": "00:25", "speaker": "CALLER" },
        { "quote": "I've been going to a chiropractor three times a week since the first week.", "timestamp": "00:25", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Consistent treatment from the first week with a coherent symptom narrative; no objective anchors (negative X-rays, no MRI) keeps it below strong."
    },
    "coverage_path": {
      "evidence": [
        { "quote": "Yeah, Allstate. I have his claim number and everything.", "timestamp": "00:47", "speaker": "CALLER" },
        { "quote": "I let the insurance lapse in January.", "timestamp": "00:59", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Defendant insured with a claim number in hand; no UM second path (caller's own policy lapsed). The recovery-SCOPE consequence of the lapse is the gate fact, not a coverage-path defect."
    },
    "collectability_deep_pocket": {
      "evidence": [
        { "quote": "Yeah, Allstate.", "timestamp": "00:47", "speaker": "CALLER" }
      ],
      "level": "adequate",
      "basis": "Insured individual defendant."
    },
    "procedural_urgency": {
      "evidence": [
        { "quote": "three weeks ago, May 20th", "timestamp": "00:04", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Three weeks old, date pinned, full runway; no deadline-adjacent facts."
    },
    "client_risk_markers": {
      "evidence": [
        { "quote": "And no — I'll be honest with you, I let the insurance lapse in January. Money got tight. I know that's bad.", "timestamp": "00:59", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "Unprompted candor against interest is affirmative cooperation — the strongest client behavior a call can show. Being uninsured is a legal fact, never a risk marker."
    },
    "case_type_fit": {
      "evidence": [
        { "quote": "I got rear-ended three weeks ago", "timestamp": "00:04", "speaker": "CALLER" }
      ],
      "level": "strong",
      "basis": "mva_standard, squarely accepted — fit is about type, not viability."
    }
  },
  "resource_tiers": {
    "effort_tier": { "evidence": [ { "quote": "I have his claim number and everything.", "timestamp": "00:47", "speaker": "CALLER" } ], "tier": "light_prelit", "basis": "If pursued at all, an economic-damages-only demand file against a cooperative carrier." },
    "carry_tier": { "evidence": [ { "quote": "Yeah, Allstate.", "timestamp": "00:47", "speaker": "CALLER" } ], "tier": "fast", "basis": "Bills-and-wages claim resolvable quickly." },
    "capital_tier": { "evidence": [ { "quote": "The chiropractor did X-rays", "timestamp": "00:37", "speaker": "CALLER" } ], "tier": "minimal", "basis": "Existing chiro records only." }
  }
}

EXPECTED PIPELINE VERDICT (harness-only — never shown to the LLM)
{
  "gates": {
    "g1_underwater": true,
    "g2_deadline_trap": false,
    "g3_client_risk": false,
    "g4_trial_capital": false
  },
  "g1_trigger_quote": "It's my car. And no — I'll be honest with you, I let the insurance lapse in January.",
  "recommended_disposition": "decline_with_grace",
  "value_tier": "low",
  "posture_applied": "volume",
  "confidence_tier": "high",
  "abstained": false,
  "urgency_flags": [],
  "attorney_review_required": false,
  "mist_flag": false
}

CALIBRATION NOTES (never shown to the LLM)
- Anchor: strong liability cannot rescue a statutorily-gutted file. G1 fires
  in CODE on the observed uninsured-owner-operator fact + no objective injury
  anchors (§3333.4 non-economic bar leaves an economic-only recovery), and
  caps dispositions to refer_out/decline_with_grace; damages below strong →
  decline_with_grace. The LLM never fired anything — it extracted the quote.
- Law precision carried in the analysis: §3333.4 bars NON-economic only;
  economic survives; passengers/non-owners excepted; §3333.4(c) is the
  DUI-restoration branch; §3333.3 (felony) is a separate bar.
- The graceful decline with referrals is recorded as rep facts. No
  lost-signable framing exists in v2 output — after the gate there is no
  signable case to lose.
- Confidence high despite the decline: 7/7 dims on cited evidence, the gate
  fact observed at high confidence, 5/10 questions asked including the one
  that mattered most (q2, asked carefully).
