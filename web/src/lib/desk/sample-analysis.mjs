// Realistic, clearly-labeled SAMPLE analysis rows — so the Calls ledger, the
// per-call readout, and the team scorecard all show real value in seconds for a
// live demo or a brand-new firm, instead of an empty screen. Same row shape as
// store.listCallsWithAnalysis / getCallWithAnalysis, so the pages render the
// sample and real data through the exact same components.
//
// HONESTY (compliance-invariants §IV/§V): every surface that renders this MUST
// label it "Sample." No real caller PII — invented names + non-routable 555
// numbers. Fee figures use the same estimated-range methodology as real cards.

const DAY = 86_400_000;

function iso(now, daysAgo) {
  return new Date(now - daysAgo * DAY).toISOString();
}

// The single-fix coaching payloads, authored to read like the real engine’s.
const COACH = {
  retainer_ask: {
    top_strength: {
      behavior: "Opened with genuine empathy tied to the caller’s situation.",
      quote: "I’m so sorry that happened — are you okay right now?",
      timestamp: "00:12",
    },
    one_thing: {
      behavior: "Make the retainer ask before ending the call — every sign criterion was met.",
      missed_moment_timestamp: "01:14",
      model_utterance:
        "This is exactly the kind of case we handle. I can text you our agreement right now — you sign on your phone in about a minute — and from then on the insurer deals with us, not you.",
      why_it_matters:
        "A warm, signable lead cools fast; the next firm they call gets this case and the fee walks.",
    },
  },
  prior_attorney: {
    top_strength: {
      behavior: "Captured the injury and treatment details cleanly.",
      quote: "I needed seven stitches and I filed a report with animal control the same day.",
      timestamp: "00:48",
    },
    one_thing: {
      behavior: "Confirm whether the caller had already spoken with another attorney.",
      missed_moment_timestamp: "02:03",
      model_utterance:
        "Before we go further — have you already signed with another firm, or are we the first ones you’re talking to? I want to make sure we’re allowed to help.",
      why_it_matters:
        "Talking to a represented caller wastes the call and risks an ethics problem; asking early also surfaces urgency.",
    },
  },
  clean: {
    top_strength: {
      behavior: "Asked for the retainer clearly and set a specific next step.",
      quote: "I’ll text you the agreement now and call you back at 2pm to walk through it.",
      timestamp: "03:20",
    },
    one_thing: {
      behavior: "Confirm the statute-of-limitations date and note it for the file.",
      missed_moment_timestamp: "02:40",
      model_utterance:
        "Just so we protect your rights — what was the exact date of the accident? I’ll flag it so nothing runs out on us.",
      why_it_matters: "A near-deadline case needs to be prioritized; a missed date is a malpractice risk.",
    },
  },
};

// Case-type fee estimates (fee = case value × contingency), in cents.
const FEE = { auto: 8_300_00, slip: 6_200_00, dog: 4_100_00 };

function row(r) {
  return {
    call_id: r.call_id,
    received_at: r.received_at,
    status: r.status ?? "analyzed",
    status_reason: r.status_reason ?? null,
    caller_name: r.caller_name ?? null,
    caller_phone: r.caller_phone ?? null,
    call_source: r.call_source ?? "callrail",
    overall_score: r.overall_score ?? null,
    band: r.band ?? null,
    case_signability: r.case_signability ?? null,
    lost_signable: r.lost_signable ? 1 : 0,
    revenue_at_risk_cents: r.revenue_at_risk_cents ?? null,
    case_type: r.case_type ?? null,
    retainer_asked: r.retainer_asked == null ? null : r.retainer_asked ? 1 : 0,
    next_step_specificity: r.next_step_specificity ?? null,
    contact_info_captured: r.contact_info_captured ?? null,
    cat_qualification: r.cat_qualification ?? null,
    cat_conversion: r.cat_conversion ?? null,
    cat_connection: r.cat_connection ?? null,
    cat_risk_compliance: r.cat_risk_compliance ?? null,
    cat_process: r.cat_process ?? null,
    summary: r.summary ?? null,
    coaching_json: r.coaching ? JSON.stringify(r.coaching) : null,
    rep: r.rep ?? null,
    flag_id: r.flag_id ?? null,
    is_leaked_signable: r.lost_signable ? 1 : 0,
    save_status: r.save_status ?? null,
    transcript: r.transcript ?? null,
    display_id: r.display_id,
  };
}

// The demo book: seven calls spanning every state a ledger shows — a classic
// leak, a call handled well, a case won back, one in progress, a no-case, plus
// an unreadable and a non-intake row so the ledger’s honesty states show too.
export function sampleAnalysisRows(now = Date.now()) {
  return [
    row({
      call_id: "sample-1042",
      display_id: "#A-1042",
      received_at: iso(now, 2),
      caller_name: "Maria R.",
      caller_phone: "(555) 010-2042",
      rep: "Dana",
      case_type: "Auto accident",
      overall_score: 54,
      band: "needs_coaching",
      case_signability: "signable",
      lost_signable: true,
      save_status: "needs_callback",
      flag_id: "sample-1042",
      revenue_at_risk_cents: FEE.auto,
      retainer_asked: false,
      next_step_specificity: "vague",
      contact_info_captured: "partial",
      cat_qualification: 72,
      cat_conversion: 21,
      cat_connection: 68,
      cat_risk_compliance: 66,
      cat_process: 54,
      summary:
        "A signable rear-end case — liability, injury, and treatment were all there — that ended without a retainer ask. The estimated fee is at risk to the first firm that calls this caller back.",
      coaching: COACH.retainer_ask,
      transcript:
        "INTAKE: Thanks for calling, how can I help?\nCALLER: I got rear-ended on the 405 and my back has been killing me. I haven’t signed with anybody.\nINTAKE: I’m so sorry that happened — are you okay right now?\nCALLER: Sore, but okay. The other driver admitted fault and I have the police report number.\nINTAKE: Got it. We’ll have someone look at this and get back to you.\nCALLER: Okay… when will that be?\nINTAKE: Soon. Have a good day.",
    }),
    row({
      call_id: "sample-1039",
      display_id: "#A-1039",
      received_at: iso(now, 3),
      caller_name: "James T.",
      caller_phone: "(555) 010-2039",
      rep: "Marcus",
      case_type: "Slip and fall",
      overall_score: 88,
      band: "strong",
      case_signability: "signable",
      lost_signable: false,
      retainer_asked: true,
      next_step_specificity: "specific",
      contact_info_captured: "full",
      cat_qualification: 90,
      cat_conversion: 86,
      cat_connection: 84,
      cat_risk_compliance: 88,
      cat_process: 87,
      summary:
        "A textbook intake: the rep qualified the fall, asked for the retainer, captured full contact info, and set a specific callback time. Nothing walked.",
      coaching: COACH.clean,
      transcript:
        "INTAKE: I’m sorry you got hurt — tell me what happened.\nCALLER: I slipped on an unmarked wet floor at the grocery store and went to the ER.\nINTAKE: That’s exactly the kind of case we take. I’ll text you our agreement now and call you back at 2pm to walk through it. What’s the best number?",
    }),
    row({
      call_id: "sample-1031",
      display_id: "#A-1031",
      received_at: iso(now, 5),
      caller_name: "Priya S.",
      caller_phone: "(555) 010-2031",
      rep: "Dana",
      case_type: "Dog bite",
      overall_score: 61,
      band: "needs_coaching",
      case_signability: "signable",
      lost_signable: true,
      save_status: "reached_out",
      flag_id: "sample-1031",
      revenue_at_risk_cents: FEE.dog,
      retainer_asked: false,
      next_step_specificity: "vague",
      contact_info_captured: "full",
      cat_qualification: 78,
      cat_conversion: 40,
      cat_connection: 71,
      cat_risk_compliance: 64,
      cat_process: 60,
      summary:
        "Strong dog-bite liability with stitches and an animal-control report, but the rep never checked for prior representation and never asked for the retainer. Left a message so far.",
      coaching: COACH.prior_attorney,
      transcript:
        "CALLER: The neighbor’s dog got out and bit me — I needed seven stitches and I filed a report with animal control the same day.\nINTAKE: That sounds painful. Let me take some details…",
    }),
    row({
      call_id: "sample-1024",
      display_id: "#A-1024",
      received_at: iso(now, 8),
      caller_name: "Andre W.",
      caller_phone: "(555) 010-2024",
      rep: "Marcus",
      case_type: "Auto accident",
      overall_score: 70,
      band: "solid",
      case_signability: "signable",
      lost_signable: true,
      save_status: "signed",
      flag_id: "sample-1024",
      revenue_at_risk_cents: FEE.auto,
      retainer_asked: false,
      next_step_specificity: "specific",
      contact_info_captured: "full",
      cat_qualification: 80,
      cat_conversion: 55,
      cat_connection: 74,
      cat_risk_compliance: 72,
      cat_process: 70,
      summary:
        "A signable case the rep almost let slip without a retainer ask — flagged, called back, and signed. This is the loop working.",
      coaching: COACH.retainer_ask,
    }),
    row({
      call_id: "sample-1018",
      display_id: "#A-1018",
      received_at: iso(now, 9),
      caller_name: "Robert K.",
      caller_phone: "(555) 010-2018",
      rep: "Dana",
      case_type: "Auto accident",
      overall_score: 44,
      band: "needs_coaching",
      case_signability: "likely_declinable",
      lost_signable: false,
      retainer_asked: false,
      next_step_specificity: "none",
      contact_info_captured: "partial",
      cat_qualification: 38,
      cat_conversion: 30,
      cat_connection: 60,
      cat_risk_compliance: 66,
      cat_process: 45,
      summary:
        "A minor fender-bender with no reported injury and no treatment — correctly not a fit. Still, the rep never asked for the retainer as a habit and cut the qualification short.",
      coaching: COACH.retainer_ask,
    }),
    row({
      call_id: "sample-1009",
      display_id: "#A-1009",
      received_at: iso(now, 11),
      status: "failed_audio_quality",
      status_reason: "Recording was too quiet to transcribe",
      call_source: "callrail",
    }),
    row({
      call_id: "sample-1004",
      display_id: "#A-1004",
      received_at: iso(now, 12),
      status: "excluded_not_intake",
      status_reason: "Vendor call, not a new-client intake",
      call_source: "callrail",
    }),
  ];
}

// One sample call by id, for the per-call readout demo.
export function sampleCallById(callId, now = Date.now()) {
  return sampleAnalysisRows(now).find((r) => String(r.call_id) === String(callId)) ?? null;
}
