# R1b — Competitive Brief: Vapi / Retell AI / Bland AI (research brief)

> Source: deep-research pass, 2026-07-12. All latency figures are vendor-stated unless noted;
> third parties measure higher. Consumed by: technical-objection matrix, competitive battlecard,
> demo-engineering spec. Cross-reference with R1a (legal-intake-specific competitors).

## The white-space finding (most important)

**None of Vapi, Retell, or Bland natively closes retainers / does e-sign.** All three are
voice-agent platforms doing intake conversations, call capture, conflict screening (Retell), and
appointment booking; e-sign/retainer dispatch is always an external integration. This is genuine
white-space vs. Intake Closer's *closing-agent* positioning. **SE takeaway:** the technical eval
should be steered onto "sign the retainer in-call" ground, where incumbents can only book.

## Vapi
- Developer-first orchestration layer (you assemble STT+LLM+TTS+telephony; Vapi hosts the call/WebSocket) ([pricing](https://vapi.ai/pricing), [review](https://www.retellai.com/blog/vapi-ai-review)). No native legal-intake product, **no native e-sign** ([docs faq](https://docs.vapi.ai/faq)).
- Bilingual: documented multilingual path with auto language-detect + mid-conversation switching ([docs](https://docs.vapi.ai/assistants/examples/multilingual-agent)); typically Deepgram Nova-2 ([serviceagent](https://serviceagent.ai/blogs/best-bilingual-ai-receptionists/)). Community thread reports agent sometimes NOT responding in caller's language — config-dependent ([community](https://vapi.ai/community/m/1385128189872832592)).
- Pricing: $0.05/min platform fee; STT/LLM/TTS at cost; HIPAA $2,000/mo, ZDR $1,000/mo add-ons; all-in ~$0.07–0.33/min ([pricing](https://vapi.ai/pricing), [review](https://www.retellai.com/blog/vapi-ai-review)).
- Latency: markets <500ms; reviews ~536ms first-response, ~800ms typical ([platform](https://vapi.ai/platform), [lindy](https://www.lindy.ai/blog/vapi-ai)). Barge-in tunable via `startSpeakingPlan`/`stopSpeakingPlan` ([docs](https://docs.vapi.ai/how-vapi-works)). Rides on Twilio by default ([sip docs](https://docs.vapi.ai/advanced/sip/twilio)); audio jitter complaints on the multi-vendor path ([telnyx](https://telnyx.com/resources/vapi-alternative)).

## Retell AI
- Voice AI platform for autonomous inbound/outbound; **actively markets legal intake** — 24/7 answering, conflict-screening interviews that stop intake on conflict + warm transfer ([legal](https://www.retellai.com/blog/best-answering-service-for-lawyers)). **No native e-sign**; retainer e-sign handled by separate tools ([same](https://www.retellai.com/blog/best-answering-service-for-lawyers)).
- Bilingual: code-switching across ~10 languages, mid-call context switch ([multilingual](https://www.retellai.com/blog/8-leading-multilingual-ai-voice-agents)). Limitation: Deepgram detects the switch but LLM context "doesn't adapt" in some cases — mid-*sentence* switching imperfect ([guide](https://growwstacks.com/blog/retell-ai-multilingual-voice-agents-guide)).
- Pricing: $0.055/min voice infra + TTS from $0.015 + LLM by model; blended $0.07–0.31/min; no platform fee on PAYG; first 20 concurrent free then $8/concurrency/mo ([pricing](https://www.retellai.com/pricing)).
- Latency: ~600ms stated ([site](https://www.retellai.com/)); proprietary turn-taking model reduces false interruptions; live latency-check tool ([docs](https://docs.retellai.com/reliability/check-actual-latency)). SIP + BYO (Twilio/Vonage).

## Bland AI
- Enterprise voice AI on **own proprietary/self-hosted infra** (not Twilio-dependent by default) ([site](https://www.bland.ai/)). Markets law-firm intake + booking ([law firms](https://www.bland.ai/blog/ai-voice-agents-for-law-firms)). **No native e-sign surfaced** — call handling + booking + CRM integrations.
- Bilingual: "Babel" engine, 40+ languages, claims **mid-sentence code-switching** ([scheduling](https://www.bland.ai/blog/ai-appointment-scheduling)).
- Pricing: tiered sub + per-minute, bundled STT+LLM+TTS: Start $0/mo $0.14/min; Build $299/mo $0.12; Scale $499/mo $0.11; telephony separate ([pricing](https://www.bland.ai/pricing)). Min charge on failed/short calls ([ringg](https://www.ringg.ai/blogs/bland-ai-pricing)).
- Latency: claims **400ms** vs. cited 1,240ms industry avg ([site](https://www.bland.ai/)); third parties measure ~800ms "dead air" ([review](https://www.retellai.com/blog/bland-ai-reviews)) — treat 400ms as UNVERIFIED. BYO carrier supported.

## Cross-vendor takeaways for the SE
- **Closing/e-sign = white space.** Steer the eval to in-call signing.
- **Legal-intake depth:** Retell > Bland > Vapi.
- **Latency (vendor-stated):** Bland 400ms < Retell ~600ms < Vapi <500ms marketed; **independent real-world ~800ms for all** — do not over-claim ours; win on *closing* + *Spanish parity*, not a latency number war.
- **Telephony:** Vapi = Twilio-dependent; Retell = SIP/BYO + Twilio; Bland = own infra + BYO.
- **Code-switching honesty:** all three *claim* mid-sentence EN/ES switching; most credible caveat is Retell's LLM context not always adapting — **live-test bilingual before trusting any marketing, including whatever we'd claim.**
