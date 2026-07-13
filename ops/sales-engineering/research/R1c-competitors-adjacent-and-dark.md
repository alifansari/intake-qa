# R1c — Adjacent & Dark Competitors: Synthflow, PolyAI, Air.ai, Sameday, Convin, Alli (research brief)

> Source: deep-research pass, 2026-07-12. Latency figures vendor-stated unless noted. Consumed by:
> competitive battlecard, technical-objection matrix.

## Synthflow — strongest direct bilingual-legal-intake competitor of this batch
- No-code voice-agent builder; **actively marketed for legal answering/intake** (intake, scheduling, routing, live-transfer) ([synthflow](https://synthflow.ai/), [booking bot](https://synthflow.ai/ai-booking-bot)). **No native e-sign/retainer closing** — CRM/scheduler integrations only (UNVERIFIED as native).
- Compliance claims: SOC 2, HIPAA, PCI DSS, GDPR ([review](https://www.retellai.com/blog/synhtflow-ai-review)).
- Bilingual: **explicit documented mid-conversation code-switching** — "Maintains context when users switch languages mid-conversation" + auto-detect ([docs](https://docs.synthflow.ai/composite-multilingual-nlp)) — strongest documented code-switch claim of the batch. Caveat: outbound numbers only US/CA/AU out-of-box ([cloudtalk](https://www.cloudtalk.io/synthflow-pricing/)).
- Pricing: Starter $29/mo (50 min) → Agency $899/mo (2,000 min); effective ~$0.11–0.24/min; BYOK ([pricing](https://synthflow.ai/pricing)).
- Latency: markets sub-100ms regional; third parties ~800–1,200ms real-world by voice model ([review](https://www.retellai.com/blog/synhtflow-ai-review)). **Barge-in = documented weakness** (interruptions not consistently processed). Telephony: native / Twilio BYO / BYO SIP.
- **SE angle:** Synthflow is the closest like-for-like; beat it on (a) *closing/e-sign in-call* (they only book), (b) *reliable barge-in* (their weak point), (c) trauma-informed Spanish quality proven by parity test.

## PolyAI — enterprise heavyweight, not like-for-like
- Enterprise agentic dialog platform for high-volume CX (healthcare/finance/hospitality); no legal-intake or e-sign (not marketed) ([site](https://poly.ai/), [review](https://synthflow.ai/blog/polyai-review)).
- Multilingual 24+ (some say 45+); **code-switching gated to custom enterprise contracts**, not turnkey ([research](https://poly.ai/blog/towards-composing-multilingual-conversations)).
- No public pricing; third parties estimate six-figure/yr + per-minute (UNVERIFIED) ([nurix](https://www.nurix.ai/blogs/polyai-pricing-features-guide)).
- **SE angle:** wrong buyer segment (big CX). Not a threat to solo/small-firm deals; only relevant if a whale/mass-tort firm compares.

## Air.ai — effectively out of the market (cautionary reference)
- **FTC sued Aug 2025** (deceptive earnings/refund/performance claims, Telemarketing Sales Rule) ([FTC](https://www.ftc.gov/news-events/news/press-releases/2025/08/ftc-sues-stop-air-ai-using-deceptive-claims-about-business-growth-earnings-potential-refund)); **settled ~Mar 2026: $18M judgment (mostly suspended), ban on marketing/selling business opportunities** ([cfodive](https://www.cfodive.com/news/ai-startup-settles-ftc-deception-charges/815892/), [FTC case](https://www.ftc.gov/legal-library/browse/cases-proceedings/airai)). Core services dark since late 2024; ~1.2-star Trustpilot.
- **SE angle:** the cautionary tale for our Brand & Trust posture — over-promising autonomous voice AI draws regulators. Our claims must be measured and provable (ties to compliance §IV). Useful in the "why us vs. hype vendors" narrative.

## Sameday AI — different vertical (home services)
- AI phone answering/booking for **trades** (HVAC/plumbing/roofing); YC-backed. No legal intake, no e-sign ([site](https://www.gosameday.com/)). EN/ES with auto-detect + claimed code-switching (marketing, not benchmarked) ([post](https://www.gosameday.com/post/spanish-speaking-ai-receptionists-a-must-have-for-home-service-contractors)). Pricing $449/mo (500 min) → $789/mo (1,000 min) ([pricing](https://www.gosameday.com/pricing)). Latency/telephony UNVERIFIED.
- **SE angle:** not a competitor in legal; proves the EN/ES-answering pattern works and firms will pay $450–800/mo for it — a pricing-anchor data point.

## Convin — different vertical (contact-center automation + QA)
- Contact-center conversation-intelligence + "AI Phone Call" agents for sales/collections/reminders; high volume (~10k calls/day). No legal intake, no e-sign ([site](https://convin.ai/blog/contact-center-voice-ai)). 70+ languages, claims dynamic in-session language shifts (voice-agent code-switch depth UNVERIFIED) ([multilingual](https://convin.ai/en-us/blog/multilingual-conversational-ai)). No public pricing; latency "<1s" vendor claim.
- **SE angle:** not a legal competitor; irrelevant to the buyer.

## Alli.ai — NOT a competitor (false positive)
- Alli AI is an **SEO/AEO automation tool**, no voice product at all ([site](https://www.alliai.com/)). A separate healthcare voice agent named "Alli" (SoundHound/Allina Health) is unrelated ([businesswire](https://www.businesswire.com/news/home/20250529245152/en/SoundHound-AI-and-Allina-Health-Launch-AI-Agent-to-Redefine-Patient-Engagement)). Drop from competitive tracking.

## Batch bottom line
- **e-sign/retainer closing remains white-space across every vendor researched** (Synthflow, PolyAI, Air, Sameday, Convin, Vapi, Retell, Bland). Consistent finding → the closing wedge is real.
- **Synthflow** is the one to build a battlecard against for the solo/small-firm segment.
- **Latency:** don't fight a ms number war — independent real-world clusters ~800ms+ for everyone. Win on closing + Spanish parity + reliability, not a latency claim.
- **Pricing anchors:** bilingual answering commands ~$450–900/mo in adjacent verticals (Sameday) — useful reference for our packaging discussion (pricing itself is Yang/Ali's gate).
