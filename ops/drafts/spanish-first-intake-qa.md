# Spanish-First Intake QA — Differentiator Brief (Wave 6, 2026-07-10)

> **Status:** staged research brief for Ali. Companion to `engine-v2-conveyor-MVP.md` (bilingual
> increments) and `develop-queue-GTM.md` (positioning).
> **Bottom line:** demand data is strong, the competitive gap is real but narrower than it looks,
> and ASR is good enough for *question-capture QA* (not case scoring). Build the two cheapest
> increments now; lead with a proof point ("same QA bar in Spanish, capture rate by language"),
> **not** "the only intake QA that works in Spanish" — that claim over-promises, is refutable in
> one sales call, and violates compliance-invariants §V (unsubstantiated superlative).

## 1. Market: the Spanish-first share is large, monetized, and un-QA'd

- **Population:** Spanish dominates LA County's non-English landscape; ~26% of county residents are limited-English-proficient, and ~42% of Spanish-speaking residents speak English less than "very well" ([LA Almanac/ACS](http://www.laalmanac.com/population/po47.php)).
- **The hardest datum — courts:** Spanish accounted for **~89% of all California superior-court interpretations** (562,561 of 630,965 in FY21–22; 635,060 Spanish events in FY23–24) ([Judicial Council language-access metrics](https://languageaccess.courts.ca.gov/sites/default/files/partners/default/2024-04/lap-metrics-report-2024-spring.pdf)). Among CA litigants who need language help at all, it's essentially all Spanish — the bilingual problem is really a Spanish problem.
- **Demand is bought deliberately:** LA saw **$164M / 725k+ legal-services ads in 2024** ([ATRA](https://atra.org/the-trial-lawyer-playbook-aggressive-ads-junk-science-cost-californians/)), with ATRA tracking 8 Spanish-language networks. [Los Defensores](https://www.walkeradvertising.com/about-us/los-defensores/) (founded 1984 by an LA *court interpreter* — the origin story literally is testimonial injustice) has run the Spanish PI lead market for 40 years. Marketing agencies report Spanish PI cost-per-lead running **40–60% below English** ([Nanato/Great Marketing](https://www.greatmarketing.ai/blog/spanish-speaking-personal-injury-lawyer-marketing)) — firms arbitrage cheap Spanish demand, then leak it at intake.
- **Staffing reality:** mid-size firms hire "Bilingual Intake Specialist" roles (Martinian, Kitay, Lundy postings) or outsource to nearshore vendors (Stafi, Vinali, Legal Conversion Center). The structural quality gap: **the intake director often can't audit Spanish calls at all** — Spanish calls are recorded, never listened to, *and unlistenable* by the supervisor. QA coverage in Spanish is not degraded; it's zero.
- **Honest caveat:** no public number exists for "% of PI intake calls that are Spanish-first." Triangulating census + interpreter + ad-spend data, 25–40% is plausible for LA-market consumer PI firms buying Spanish media, but treat it as an estimate — and as **beta test #4: the 5 beta firms' own call-language mix is one GROUP BY away.**

## 2. Failure modes (evidence quality: vendor-heavy, but convergent)

Baseline: Clio's 2024 secret-shopper found only **40% of firms answer the phone at all**; language stacks on top. Documented Spanish-specific modes:

- **English-voicemail / hold-for-interpreter abandonment** — Spanish callers don't leave messages; they dial the next firm ([CaseGen](https://www.casegen.ai/bilingual-answering-service-law-firms/spanish/), [Legal Conversion Center](https://legalconversioncenter.com/blog/spanish-speaking-intake/)). Vendor-reported, no independent study — but unanimous across competitors' marketing.
- **Nuance loss on injury description** — real case reports: a bilingual paralegal rendering "numbness" as "tingling" and "paralysis" as "stiffness" cut a settlement roughly in half; "*cintura*" translated as "waist" instead of "lower back" torpedoed a workers'-comp claimant's credibility ([Waves](https://www.waveslanguagesolutions.com/post/how-a-bad-translation-can-jeopardize-a-court-case), [Legal Interpreters](https://legal-interpreters.com/index.php/2025/04/02/lost-in-translation-famous-court-cases-impacted-by-misinterpretation/)). These are deposition-stage, but the identical mechanism operates on intake transcripts.
- **Deferential apology speech misread as fault admission** — culturally normal courtesy ("*disculpe, quizás fue mi culpa*") is not a factual admission; this is exactly fairness-fix D in `engine-v2-triage-design.md` §4sexies, now with market evidence behind it.
- **Monolingual callback loops** — the develop-queue's own failure mode: an English-only owner gets assigned a Spanish-line open item and the SLA dies in transfer purgatory.

## 3. Competitive: Spanish *answering* is commoditized; Spanish *rep-QA* is empty

- **Smith.ai**: live bilingual receptionists + auto language-detecting AI receptionist — handles the call, doesn't QA your reps.
- **CallRail**: [multi-language transcription on by default](https://support.callrail.com/hc/en-us/articles/22401133763597-Multi-language-transcriptions), but it flips to Spanish only after **50 seconds** of detection (crude for code-switched calls) and still scores the *lead*, not the rep.
- **Eve**: intake in "28+ languages" — but it *replaces* the rep; the Auditor reads docs. Wave-5 logic holds and strengthens: a firm running Jenny in Spanish needs independent Spanish QA *more*.
- **ASR reality:** Spanish is a Tier-1 Whisper language (~3–6% WER clean; expect 2–3x on 8kHz telephony). Crucially, **AssemblyAI — already the pipeline vendor — claims best-in-class Spanish (Universal) and native code-switching support**, so the pipeline change is a parameter, not a re-platform. Known pitfalls: L2/accented speech error inflation (Koenecke PNAS 2020), regional lexicon (*aseguranza* vs *seguro*), diarization on speakerphone family calls. This is why the credible product is **"did the rep ask X" detection** (robust to moderate WER) and not Spanish case-scoring (gated by §4sexies's reliability bar — correctly).

## 4. Product: bilingual develop-queue, cheapest-first

The conveyor MVP already commits to "Spanish calls run the identical catalog at the identical bar." Concrete increments, in cost order:

1. **Native-Spanish QA pass (cheapest, days):** language-tag each call; run the same question-catalog pass on the Spanish transcript directly — no translation round-trip (§4sexies requirement); citations stay in the caller's original Spanish. Claude handles Spanish spans natively; add a handful of Spanish spot-check examples.
2. **Per-language capture/resolution telemetry:** capture-rate and SLA-resolution-rate **by call language** — a GROUP BY on data increment 1 already produces. This *is* the four-fifths biased-abandonment tripwire from the fairness audit, productized. Near-zero cost, and it generates the LACBA demo artifact.
3. **Bilingual develop-queue items:** English action line + cited original-Spanish span, plus a "Spanish-speaker needed" flag on the item so ownership routing doesn't create monolingual callback loops.
4. **Spanish gold set + per-language reliability gate (most expensive):** required before any public parity *claim* — but not before shipping 1–3, because question-capture QA doesn't touch the frozen scoring engine.

## 5. Positioning verdict

**"The only intake QA that works in Spanish" — NO.** "Only" is refutable in one sales call (CallRail transcribes Spanish; Observe.AI/CallMiner do Spanish agent-QA in other verticals; Eve is one release away), and "works" is unproven until the per-language reliability numbers exist. It's the exact overclaim Wave 4 banned — and compliance-invariants §V prohibits it outright.

**The cheapest credible claim:** *"Every intake call gets the same case-making-question QA — English or Spanish — with the evidence cited in the caller's own words. And we show you your capture rate by language."* Verifiable on day one of increment 1, un-refutable, and it converts the fairness audit from safeguard into the pitch. For the LACBA/CAALA room, the emotional close writes itself: firms spend Los Defensores money to make the Spanish phone ring, then nobody ever listens to what happened on the call. Spanish parity is the **proof point under the develop-queue headline** — not the headline itself.

Sources: [LA Almanac](http://www.laalmanac.com/population/po47.php) · [CA Language Access Metrics 2024](https://languageaccess.courts.ca.gov/sites/default/files/partners/default/2024-04/lap-metrics-report-2024-spring.pdf) · [ATRA Trial Lawyer Playbook (CA)](https://atra.org/the-trial-lawyer-playbook-aggressive-ads-junk-science-cost-californians/) · [Walker/Los Defensores](https://www.walkeradvertising.com/about-us/los-defensores/) · [Great Marketing AI — Spanish PI marketing](https://www.greatmarketing.ai/blog/spanish-speaking-personal-injury-lawyer-marketing) · [CallRail multi-language docs](https://support.callrail.com/hc/en-us/articles/22401133763597-Multi-language-transcriptions) · [Smith.ai bilingual](https://smith.ai/features/bilingual-answering-service) · [Eve intake](https://www.eve.legal/intake) · [AssemblyAI Universal (ES)](https://www.assemblyai.com/blog/universal-english-german-spanish) · [VexaScribe Whisper WER](https://vexascribe.com/how-accurate-is-whisper) · [Waves — mistranslation cases](https://www.waveslanguagesolutions.com/post/how-a-bad-translation-can-jeopardize-a-court-case) · [Legal Interpreters — cintura case](https://legal-interpreters.com/index.php/2025/04/02/lost-in-translation-famous-court-cases-impacted-by-misinterpretation/) · [Answering Legal — Clio 2024 secret shopper](https://www.answeringlegal.com/blog/the-shocking-truth-about-law-firm-intake-failures)
