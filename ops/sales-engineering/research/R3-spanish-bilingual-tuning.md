# R3 — Spanish-Tuning & Bilingual-Parity (research brief)

> Source: deep-research pass, 2026-07-12. ServiceNow + Coval are independent cross-engine tests;
> ElevenLabs/Speechmatics/Microsoft numbers are vendor-reported (flagged). Consumed by:
> spanish-tuning-playbook.md, parity QA suite, demo-engineering spec.

**Why this is the wedge:** Spanish is spoken by ~28% of Californians (~10.5M), ~19% speak English "less than very well," 82% of CA English learners are Spanish speakers ([migrationpolicy](https://www.migrationpolicy.org/data/state-profiles/state/language/ca), [milestoneloc](https://www.milestoneloc.com/the-top-languages-spoken-in-california/)). A scared LEP caller reaching a native-quality Spanish closer is the differentiator.

## 1. ASR reality: Spanish and Spanglish
Monolingual Spanish is largely solved for the best engines — **ElevenLabs Scribe** ~3.1% WER Spanish FLEURS, 5.5% Common Voice ([venturebeat](https://venturebeat.com/ai/elevenlabs-new-speech-to-text-model-scribe-is-here-with-highest-accuracy-rate-so-far-96-7-for-english/)). **Code-switching collapses systems:** a model at 5% monolingual WER "routinely posts 15–20% WER on Spanish-English code-switched calls" ([coval](https://www.coval.ai/blog/best-speech-to-text-providers-in-2026-independent-benchmarks-and-how-to-choose/)); top 2024 model = 48.4% WER on Miami-Bangor Spanish-English ([deepgram](https://deepgram.com/learn/what-is-code-switching-asr-guide)). Error at the switch point (PIER) runs far above overall MER (34% vs 20% on ASCEND) ([gladia](https://www.gladia.io/blog/what-is-code-switching-in-speech-recognition)).
**Best engine for Spanglish:** ServiceNow's 7-engine benchmark — **ElevenLabs Scribe v2 and AssemblyAI Universal-3 Pro tied best** on Spanish-English, Google Gemini close; Deepgram Nova-3/Voxtral/Parakeet mid; **Whisper worst — it *translates* code-switched audio to English instead of transcribing** ([huggingface](https://huggingface.co/blog/ServiceNow-AI/code-switching)).
**Mitigations:** STT `multi` mode; avoid Whisper on intake path; validate on the firm's real 8kHz telephony audio not FLEURS; boost the PI glossary as custom vocab at switch points.

## 2. Dialect & register: Mexican/Central-American, not Castilian
CA Latino callers are overwhelmingly Mexican/Central-American. **usted is the respectful default until a relationship exists** in Latin America ([baselang](https://baselang.com/blog/basic-grammar/tu-vs-usted-vs-vosotros-vs-ustedes/)); expected in customer-service/professional contexts ([naatik](https://naatikmexico.org/blog/to-t-or-not-to-tnbspunderstanding-the-differences-between-t-and-usted-in-mexican-spanish)). Latin America uses **ustedes** for plural — **never Castilian "vosotros"**; a Castilian voice instantly reads foreign and lowers trust ([spanish.academy](https://www.spanish.academy/blog/differences-between-latin-american-and-castilian-spanish/)). **Default: usted, warm neutral-Mexican; Latin-American TTS voice; per-market tú override.**

## 3. Legal/PI glossary & UPL risk
**False-cognate trap:** callers say **"aseguranza"** (US-Spanish anglicism) for insurance; standard is **"seguro"** — agent should *understand aseguranza, speak seguro* ([hinative](https://hinative.com/questions/23915373), [spanishdict](https://www.spanishdict.com/translate/aseguranza)). Lock: *demanda* (lawsuit), *lesión* (injury), *abogado de accidentes*, *caso*, *acuerdo/arreglo* (settlement), **"no gana, no paga"** (contingency) ([victimslawyer](https://www.victimslawyer.com/blog/california-contingency-fee-lawyer-no-win-no-fee-explained/)).
**UPL across languages = the landmine.** Only licensed attorneys may give legal advice in CA; UPL is a crime ([calbar](https://www.calbar.ca.gov/public/concerns-about-attorney/avoid-legal-services-fraud/unauthorized-practice-law)). Line = legal *information* (terms, process) vs legal *advice* (whether/how to file, case value) ([txcourts](https://www.txcourts.gov/media/1220087/legalinformationvslegaladviceguidelines.pdf)). **Guardrail both languages identically** — Spanish prompt carries the same refusals; no dollar-value/liability opinions in either.

## 4. TTS: empathetic, trauma-informed Spanish
- **Rime** — from real full-duplex conversations, Spanish, ~37ms TTFB ([cekura](https://www.cekura.ai/blogs/best-tts-for-ai-voice-agents)).
- **Cartesia Sonic** — 40+ languages incl. Spanish, sub-50ms TTFB, lowest latency ([cekura](https://www.cekura.ai/blogs/best-tts-for-ai-voice-agents)).
- **ElevenLabs** — deepest library/most natural, but Flash v2.5 ~300–500ms, noticeable lag ([cekura](https://www.cekura.ai/blogs/best-tts-for-ai-voice-agents)).
**Guidance:** audition 3–4 Latin-American voices per firm with a real trauma script; native-Mexican timbre; keep ES latency within 20% of EN. ConversationRelay can pair ElevenLabs `multi` TTS with SSML ([twilio](https://www.twilio.com/en-us/changelog/conversationrelay-now-supports-a-configuration-for-automatic-lan)). "Trauma-informed prosody" vendor claims UNVERIFIED — validate by ear.

## 5. Language detection & auto-switch (ConversationRelay)
Set STT `multi` (Deepgram) → Twilio returns detected `lang` (primary BCP-47, e.g. `en`) per prompt; set TTS `multi` (ElevenLabs) to synth in detected language; one `<Language>` element per language mapping STT+TTS ([twilio changelog](https://www.twilio.com/en-us/changelog/conversationrelay-now-supports-a-configuration-for-automatic-lan), [twilio docs](https://www.twilio.com/docs/voice/twiml/connect/conversationrelay)). Twilio supports callers mixing ES/EN mid-call ([twilio](https://www.twilio.com/en-us/changelog/multi-language-detection-public-beta-for-twilio-real-time-transc)).
**Design rules:** detect turn 1 but require 1–2 confident turns before committing (avoid flip-flop); once switched, stay; `multi` always-on for CA numbers; test first-turn timing.

## 6. Proving parity
Parity = **Spanish qualifies and closes as well as English, tested separately** — EN scores never transfer. Cautionary case: 95% EN test accuracy → 40% task completion in Mexico from word-for-word translated scenarios ([hamming](https://hamming.ai/resources/multilingual-voice-agent-testing)). Test ASR/LLM/TTS/culture layers separately ([futureagi](https://futureagi.com/blog/multilingual-voice-ai-testing-2026/)).

## Spanish tuning checklist (onboarding)
1. `multi` STT (Deepgram) + `multi` TTS (ElevenLabs); per-language `<Language>` blocks.
2. Latin-American (Mexican) voice not Castilian; audition 3–4 with real trauma script; no vosotros.
3. Register = usted default; per-market tú override.
4. Load PI glossary; understand *aseguranza*→speak *seguro*; boost as custom vocab.
5. Mirror UPL guardrails in Spanish exactly.
6. Avoid Whisper on intake path.
7. Benchmark on firm's real 8kHz audio.
8. Localize scenarios culturally, never word-for-word.

## Parity QA test plan (SE-runnable)
Matched EN/ES scenario set (same intents, native phrasing), per language:
- **ASR WER** real recordings: ES monolingual <8%; flag if code-switched → 15–20%.
- **Intent parity** ≥95% per language, independent of transcription.
- **Qualification + e-sign close rate**: ES within set delta of EN.
- **Code-switch suite**: "Quiero pagar my bill," "aseguranza," brand/street names, mid-utterance flips; >80% task completion.
- **Language-lock test**: no flip-flop.
- **Latency**: ES within 20% of EN; P95 <1500ms.
- **UPL red-team** both languages: case-value/advice extraction refused identically.
- **Noise conditions** (car/street/office).
- **Regression baselines** for drift alerts after prompt/model change.
Third-party test platforms (Hamming, Cekura, Bluejay) can automate ([cekura](https://www.cekura.ai/blogs/cekura-multilingual-voice-ai-testing)).

**Key takeaways:** (1) Scribe v2 or AssemblyAI Universal-3, never Whisper. (2) Mexican voice + usted + "seguro not aseguranza" = trust levers. (3) UPL guardrails identical in both languages. (4) Parity proven only by separate ES close-rate + code-switch test on the firm's own audio.
