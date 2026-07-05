# CHANGELOG-COPY.md — skeptic-partner copy rewrite

One reader: a 55-year-old managing partner of a 12-lawyer SoCal PI firm. Every change
below serves the goal of making him unable to wince, doubt, or smell startup. No product
logic, gate logic, or the 132 tests were touched. `next build` passes; 132/132 tests green.

## Copy changes (file · before → after · requirement resolved)

**Homepage — `src/app/(marketing)/page.tsx`**
- Stat "24% → 82% sign rate (Intake QA calibrated data)" → **deleted** (unprovenanced first-party). *Provenance-gate.*
- Stat "$100–$500+ per click (iLawyer Marketing)" → **"$2,500–$3,000 to sign one case via paid search (National Law Review, 2025)."** *Provenance-gate (fact-sheet source).*
- Added stats: "40% answered the phone… (Clio 2024 Legal Trends Report)"; "21× better odds at 5 min vs 30 (2007 MIT/InsideSales, Oldroyd)"; "$26,501 average auto BI claim, 2023 (Insurance Information Institute)." *Provenance-gate; attribute the 21× to MIT/InsideSales, NOT HBR.*
- Hero subhead → mechanism-named gold-standard ("scores every recorded intake call against a fixed rubric… your staff approves before anything goes out"). *Voice / name-the-mechanism.*
- Honesty teaser: "77% precision, 68% recall" → **method description + TODO(Ali)**, no bare figure. *Provenance-gate.*
- Ethics strip: Rule 5.4 framing → **CA authority** (B&P §6152 runner/capper; AB 931 flat-fee carve-out; Rule 7.3 "response to inquiry"; Rule 5.3 + Formal Op. 512; Rule 1.18 confidentiality). *Ethics reframe.*

**Compliance — `src/app/(marketing)/compliance/page.tsx`** — rebuilt on CA authority:
§6151–6152 (runner/capper, "we don't procure strangers"), flat fee + AB 931 carve-out (accurately scoped, notes Wisner Baum challenge), Rules 7.2/7.3 (response-to-inquiry nuance) + 7-gate diagram, Rules 1.18/1.6 (confidentiality), Rule 5.3 (vendor supervision), Formal Op. 512 + CA State Bar Nov. 2023 GenAI guidance, Penal Code §632/§632.7 + Kearney disclosure pattern, TCPA (one-to-one vacated + repealed; A2P; opt-out), CCPA/CPRA service-provider. Ends with the site disclaimer line. *Ethics reframe; silent-question #4.*

**Security — `src/app/(marketing)/security/page.tsx`** — rebuilt: what we need / don't need; "never used to train AI" (Anthropic commercial API, 7-day logs, ZDR); subprocessor table with named postures (Supabase SOC 2 T2 + ISO 27001; AssemblyAI SOC 2 T2 + PCI-DSS L1; Anthropic commercial; Twilio A2P). Explicit line: Intake QA does NOT claim to be SOC 2/HIPAA as a company. Named human: **Ali**. *Silent-question #2; provenance (certs attributed to subprocessors only).*

**Founder — `src/app/(marketing)/founder/page.tsx` + `components/marketing/FounderNote.tsx`** — full Ali letter (ran PI intake, bilingual, Orange County; why it's free = founding cohort). Monogram "IQ" → "A". *Name Ali; silent-questions #1, #5, #6.*

**Calibration & Honesty — `src/app/(marketing)/honesty/page.tsx`** — replaced fabricated confusion matrix, "77%/68% (n=1,000)", misses dollar table, and the hardcoded 24/53/74/82 + 50/38/33/0 charts with **method-first copy + failure-mode description + TODO(Ali)**. No number printed without a corpus. *Provenance-gate; silent-question #3.*

**Pricing — `src/app/(marketing)/pricing/page.tsx`** — "under Rule 5.4" → **§6152 + AB 931 flat-fee carve-out**; "leaked cases" → "lost signable cases." *Ethics reframe; banned-vocabulary sweep (prior task) held.*

**FAQ — `src/app/(marketing)/faq/page.tsx`** — reordered by the skeptic's ranked objections; accuracy answer de-numbered (method + verify-the-work); all compliance answers moved to CA authority; added displacement (call tracking / answering service / Lead Docket), staff-time, intake-manager, malpractice-insurer, Spanish (41% PPIC/Pew), and founder answers. *Silent-questions #1–#8; category displacement.*

**How it works — `src/app/(marketing)/how-it-works/page.tsx`** — "(Rule 5.4)" → "(Cal. B&P §6152)"; added Spanish-language section (41% PPIC/Pew). ("What your intake team sees" + "first 30 days" added prior.) *Ethics reframe; Spanish edge; silent-question #7.*

**Comparison — `src/components/marketing/ComparisonTable.tsx`** — "Flat per-case pricing (Rule 5.4-safe)" → "…(not fee-sharing, not per-lead)." *Ethics reframe.*

**Leak Audit — `src/app/audit/page.tsx`** — added the concrete **de-risk block** ("Where your calls go, and how they're handled": recorded calls only / redact; Supabase + AssemblyAI + Anthropic commercial with postures; never used to train AI; deletion schedule TODO; NDA/DPA TODO; Cal. Rule 1.18; named human Ali). *Silent-question #2; de-risk requirement.* ("Where to get your recordings" + sample link added prior.)

**Footer — `src/components/marketing/Footer.tsx`** — site-wide disclaimer line: "This is not legal advice… your firm and its counsel make the final call on ethics and consent." *Compliance brief requirement.*

**Privacy — `src/app/(marketing)/privacy/page.tsx`** — "72-hour purge" claim → "set schedule + TODO(Ali)"; retention framed honestly. *Provenance-gate.*

## TODO(Ali) — must confirm before relying on these

| Location | Confirm |
|---|---|
| `honesty/page.tsx`, `page.tsx` (homepage teaser) | Test-corpus **N + composition (synthetic/historical/client) + date**, THEN publish precision/recall **with the corpus label**. No bare percentage. |
| `honesty/page.tsx` | Add anonymized real miss / false-flag examples (with $) once corpus documented. |
| `security/page.tsx`, `privacy/page.tsx` | **Exact audio + transcript retention/deletion timeline.** |
| `security/page.tsx` | Whether a **DPA/NDA template** exists or the firm's paper is used. |
| `security/page.tsx` | Intake QA's **own attestations**, if any (else keep "certs belong to subprocessors"). |
| `security/page.tsx` | Ali's **direct contact** (email) for data questions. |
| `compliance/page.tsx` | The firm's **§632 consent/disclosure process**; and the exact **CCPA "service provider"** contract language in the DPA. |
| `founder/page.tsx` | Whether to state "Stanford Philosophy, Honors, June 2025" and "24" explicitly (kept implicit for a skeptic-first read). |
| `components/marketing/FounderNote.tsx` | Drop a real headshot at `/public/founder.jpg`. |
| Repo-wide | Live pricing figures ($1,500 / $500-case, etc.) and A2P registration status still current. |

## Notes
- `ScoreBandChart` / `DecayCurve` components remain in the repo but are **no longer used** (removed from Honesty because their numbers were unprovenanced). Safe to delete later.
- The find-it-free guarantee "$25,000" is an offer term (a promise Ali makes), not a claim about the world — left as-is.
