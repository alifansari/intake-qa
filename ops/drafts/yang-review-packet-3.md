# Yang Review Packet #3 — Consolidated Pre-Beta Legal Review (2026-07-11)

> **STATUS: STAGED DRAFT — Ali sends (compliance-invariants §VII).** Nothing below has been
> published, used with a prospect, signed, or built. This file has two clearly separated parts:
>
> - **PART A — Research brief** (internal; NOT sent). Every substance + copy finding behind the
>   packet, with citations, and an explicit list of every place the current NDA / BAA / MOU /
>   packet-2 is wrong, inconsistent, or missing something.
> - **PART B — Yang Review Packet #3** (the thing Ali sends tonight). Ruthlessly concise; a busy
>   attorney answers it in one sitting. Q0 paid-advisory ask split per the copy research
>   (one line up top, concrete offer at the close). Six numbered questions ordered by risk.
>
> Successor to `yang-review-packet-2.md`. Keeps its honest, no-implied-endorsement tone.

---
---

# PART A — RESEARCH BRIEF (internal, not sent)

Method: five parallel deep-research passes, primary sources where available (leginfo,
calbar.ca.gov rule PDFs, eCFR/govinfo, CPPA, FCC). Every load-bearing claim is cited. Tags:
**[V]** = verified from primary source; **[I]** = reasoned inference from cited authority.

## A1. The three corrections that change our current drafts

**Correction 1 — The BAA is very likely the WRONG instrument (confirms the threshold question).**
- A plaintiff PI firm is generally **not** a HIPAA "covered entity" — the term is three
  categories only (health plan, clearinghouse, or provider running standard electronic
  transactions), 45 C.F.R. §160.103. A PI firm is none. **[V]**
  (https://www.law.cornell.edu/cfr/text/45/160.103)
- "Business associate" is defined **relative to a covered entity** ("with respect to a covered
  entity… on behalf of such covered entity"). No covered entity on the other end ⇒ no business
  associate ⇒ **a "BAA" is a category error.** **[V]** HHS: "If an entity does not meet the
  definition of a covered entity or business associate, it does not have to comply with the
  HIPAA Rules." (https://www.hhs.gov/hipaa/for-professionals/covered-entities/index.html)
- HIPAA **does not follow the data**: once a covered provider releases records to the plaintiff's
  attorney under a §164.508 authorization, the copy in the firm's hands is protected by the
  lawyer's confidentiality duty (B&P §6068(e)(1), Rule 1.6), **not** HIPAA, and is not "PHI in
  the firm's hands." **[V/I]**
- Signing an **unnecessary** BAA is affirmatively risky, not neutral. Leading health-law
  commentary (Kim Stanger, Holland & Hart): it "may subject them to contractual liabilities they
  would not have but for the agreement" and can be read as "inappropriately admitting that it is
  a business associate, thereby exposing itself to HIPAA penalties." Recommended alternative: "an
  appropriate confidentiality agreement." **[V]**
  (https://hhhealthlawblog.com/avoiding-business-associate-agreements/)
- **The one exception:** a firm that is itself a business associate (med-mal / health-care
  defense / any firm receiving PHI *from a covered-entity client*) does need BAA flow-down. **[V]**
- **Recommendation for Yang to confirm/deny:** default instrument = a **Confidentiality & Data
  Security Addendum / CPRA-style DPA** (no HIPAA/PHI language); offer a **narrow BAA rider only**
  to the med-adjacent subset. This is Reviewer-note-1 option (b)+(c) combined. → **Packet Q1.**

**Correction 2 — Our two clearance memos' "§6156 contradiction" is a numbering trap; resolve it,
and ADD the safe harbor.** Both memos are individually right about different sections. **[V]**
- **§6156** = **AB 931** (Ch. 565, 2025): out-of-state ABS fee-sharing ban; penalty $10,000/
  violation or 3× actual, whichever greater; applies to contracts **on/after Jan 1, 2026**;
  repealed Jan 1, 2030.
  (https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=6156)
- **§6156.5** = **SB 37** (Ch. 645, 2025): private right of action for §6155 advertising
  violations. SB 37 also amends **§6153** to add a private right of action for §6152 runner/
  capper. Conflating §6156 and §6156.5, or attributing one bill's section to the other, is
  **wrong.** **[V]**
- **§6156(e) fixed-fee SAFE HARBOR EXISTS (verbatim confirmed):** §6156 "shall not apply to a
  contract in which… (1) The contract outlines a specific dollar amount for services rendered.
  (2) No payment is related to the referral of legal services or purchase of a lead… (3) No
  payment is contingent on the amount recovered in a specific case." Our flat subscription fits
  all three prongs. **The `external/ab931-sb37-clearance-memo.md` version citing §6156(e) is
  correct; the `yang-ab931-sb37-clearance-memo.md` version that omits it is incomplete.** **[V]**
- **SB 37 damages CONFIRMED:** "$5,000 minimum up to $100,000 per violation, or three times
  actual damages, whichever is larger" — lives in both §6153 and §6156.5. **[V]**
- **SB 37 does NOT amend Rule 5.4 and does not reach flat vendor fees.** **[V]**
- **Mis-attribution to fix:** the "contracts on/after Jan 1, 2026" limiter belongs to **AB 931
  §6156**, not to SB 37. Don't import it into the SB 37 analysis. **[V]**
- **Net:** the only genuine gating risk in this cluster is runner/capper (§§6151–6153) amplified
  by SB 37's "any person" private right of action — and it bites **only the parked SMS
  re-engagement feature**, never the flat-fee scoring. → **Packet Q3.**

**Correction 3 — The LACBA self-audit "attorney work product" caveat is legally wrong; fix before
publish.** Packet-2 Q1's one-line caveat ("label the tally attorney work product… treat it like
any other self-evaluative document") rests on protection California does not provide:
- CCP §2018.030 protects "the work product of **an attorney**." A **non-lawyer's** instruction
  cannot confer the label; the audit is work product only if **a lawyer directs/adopts it**. **[V]**
  (https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CCP&sectionNum=2018.030)
- **California recognizes NO self-critical-analysis privilege** — *Cloud v. Superior Court*
  (1996) 50 Cal.App.4th 1552. So "treat it like any self-evaluative document" implies a shield
  that doesn't exist. **[V]** (https://law.justia.com/cases/california/court-of-appeal/4th/50/1552.html)
- **Fix:** drop the "attorney work product / self-evaluative" framing; instead instruct firms to
  **have a lawyer direct the audit** if they want a colorable work-product claim. → **Packet Q5.**

## A2. Substance findings that clear (with the guardrail that keeps them clear)

- **Rule 5.4 — clean.** A flat, outcome-agnostic subscription is the paradigm "payment… for
  goods and services" that Comment [2] blesses, so long as it is never a % of firm revenue nor
  "tied to fees in particular cases." Rule 5.4 unchanged since 2021 (no CA ABS reform). **[V]**
  (https://www.calbar.ca.gov/Portals/0/documents/rules/Rule_5.4.pdf)
- **Rule 1.18 — firm's duty; our exposure is derivative — with a correction to packet-2 Q5.**
  Export-limiting to signed clients narrows the *outbound artifact* but does **not** moot the
  *dataset*, which still ingests non-signed callers (prospective clients under 1.18(a)). Do not
  claim export-limiting "removes" prospective-client data; the non-signed data is managed via
  Rule 1.6 + 5.3 (agency + supervision + security), not cured by the export filter. **[V/I]**
- **Rule 1.6 — CA version is narrower than the ABA model** (no "reasonable efforts" clause, no
  agent-disclosure comment). Anchor "disclosure to our vendor is permissible" in **agency +
  §6068(e) + Rule 5.3**, not in a CA 1.6 comment (there isn't one). **[V]**
- **Rule 5.3 — the correct home for the firm↔vendor relationship;** satisfiable by contract. We
  should ship a "5.3 kit": confidentiality flow-down covering signed **and** non-signed callers,
  security terms, an express **no-legal-advice / no-direction-of-legal-judgment** clause, and
  audit cooperation — so the firm's supervision duty is turnkey. **[V/I]**
- **Rules 7.1–7.5 bind lawyers, not us.** Our only Chapter-7 risk is indirect (don't script
  false/misleading caller statements). **[V]**
- **UPL (§§6125–6126) does apply to a non-lawyer,** but the article stays clear **if** scripts
  stay factual ("record the fact, don't interpret the law") and never apply law to a specific
  caller (validity / value / SOL). General legal-information publishing to firms is protected;
  tailored advice to a person is UPL (*Baron v. City of L.A.*; *Landlords Professional Svcs.*). **[V/I]**
- **CIPA §632 / §632.7 — all-party-consent state; the duty is the RECORDER's (the firm's).** The
  operative act is "record[ing]"; a vendor that receives only completed files performs no
  statutory act. §637.2 = $5,000/violation statutory (no proof of harm). *Smith v. LoanMe*
  (2021): §632.7 reaches parties and nonparties. Vendor's only residual hooks (§631 use/aiding)
  bite **only** if the firm's recording was unlawful **and** we knowingly used/assisted — avoided
  by taking lawful files + a firm rep/warranty + indemnity. The 2023–25 CIPA web-tracking wave
  (pen-register / session-replay) is **off-facts** for post-hoc audio. SB 690 CIPA reform is
  **pending, not law** — don't rely on it. **[V/I]**
  (leginfo §§632, 632.7, 637.2; Smith v. LoanMe S260391)
- **CCPA/CPRA — we are a "service provider," not a third party.** Needs a contract carrying the
  §1798.100(d) + 11 C.C.R. §7051(a) terms (specific, non-generic business purpose). **The same
  DPA/Addendum from Q1 carries these — one instrument does double duty.** **[V]**
- **Delete Act / data-broker registration — does NOT apply** (we don't "sell"; we're a service
  provider without a direct consumer relationship). No CPPA registration. **[V]**
- **CMIA — very likely no exposure** for lay injury descriptions (we're not a "provider of health
  care"/"contractor"/§56.06 business, and lay descriptions aren't provider-derived "medical
  information"). Risk flips **only if** we ingest actual provider records (ER notes, bills) —
  contractually/technically exclude those. **[V/I]**
- **AB 931 — non-issue,** and the §6156(e) safe harbor even helps document the flat-fee structure
  as clean (see Correction 2).

## A3. The parked SMS feature — hard gates before it can ever leave dark (FYI, not gating the beta)

- **A2P 10DLC is a hard CARRIER gate, independent of TCPA.** Since **Feb 1, 2025** all three US
  carriers **block 100%** of unregistered A2P traffic. Brand + campaign registration via The
  Campaign Registry is required before a single text sends — perfect TCPA consent still gets
  dropped without it. **[V]** (Twilio/TCR A2P docs)
- **TCPA:** re-contacting the firm's **own inbound** lead supports **informational** follow-up
  (the caller gave the number); the moment a text **solicits/promotes**, it becomes telemarketing
  needing **prior express written consent**, which a bare inbound inquiry doesn't supply. **[V/I]**
- **One-to-one consent rule is DEAD** — *IMC v. FCC* (11th Cir., Jan 24, 2025) vacated it before
  it took effect. Don't build to it. **[V]**
- **Quiet hours are 8am–9pm local** (47 C.F.R. §64.1200(c)(1)) — **note: CLAUDE.md and our copy
  say "8pm–8am," which mislabels the 9pm boundary.** Revocation rule effective Apr 11, 2025;
  honor STOP-type keywords + free-form opt-out. **[V]**

## A4. 2025–2026 CA developments a diligent attorney will expect us to have addressed

- **CA State Bar 2026 GenAI Practical Guidance (replaces the 2023 version, now addresses agentic
  AI and expressly "autonomously facilitating client intake").** This is our **admission
  ticket**: every firm's Rule 1.6 / 5.1 / 5.3 diligence runs through our product, and the
  guidance says diligence needs "more than… generalized marketing assurances." We must supply
  **reviewable** no-training / security / retention / deletion documentation. **[V]**
  (calbar.ca.gov Generative-AI-Practical-Guidance.pdf)
- **AB 2013** (training-data transparency, eff. Jan 1 2026): binds "developers" who "substantially
  modify" a model — a pure API caller isn't one; watch only if we ever fine-tune. **[V/I]**
- **SB 942** (AI Transparency Act): out — >1M-user "covered provider" threshold; date pushed to
  Aug 2 2026 by AB 853. **[V]**
- **CCPA ADMT regulations** (finalized 2025, obligations phase in Jan 1 2027): unsettled whether
  lead-scoring is a "significant decision"; if so, obligations fall on the firm (business) with us
  as service provider. A 2027 "verify," not a beta gate. **[V/I]**

## A5. Internal inconsistencies in the current external drafts (fix before any firm signs)

1. **BAA instrument** — the NDA §4 references a separate BAA/DPA, the MOU §6 and the LACBA post
   and the live site all promise "a BAA is available." If Yang says use a DPA/Addendum instead
   (likely), **all of that copy must change** to match the instrument chosen. *(NDA note 4; MOU
   §6; lacba-beta-post.md; site BETA_CONDITIONS[0].)*
2. **Subprocessor paper outruns the promise** — NDA §4(c) and BAA §3 promise "no model training"
   and "zero-retention" flow-down to subprocessors, but no Anthropic/AssemblyAI BAA or
   zero-retention-tier contract is on file, while `web/beta/security-posture.mjs` states
   Anthropic "zero-retention API tier" as present-tense fact. **Reconcile before any firm sees
   either document** — either get the paper or soften the claim to what is actually contracted.
   *(BAA Reviewer note 2.)*
3. **Retention window mismatch** — BAA §7(c) and the code default (`functions.mjs`) say **90
   days**; `.env.example` and `security-posture.mjs` say **30**. The signed number must equal the
   deployed number. Confirm the deployed env value before first signature. *(BAA Reviewer note 3.)*
4. **Clearance-memo split** — keep ONE reconciled memo (fold in §6156(e), fix the §6156/§6156.5
   attribution, move the "on/after Jan 1 2026" limiter to AB 931). Don't send both versions.
5. **Quiet-hours label** — CLAUDE.md compliance guardrail (b) says "8:00pm–8:00am"; the TCPA
   boundary is 8am–9pm. Fix for the SMS feature's eventual copy/config.
6. **Packet-2 Q5 overclaim** — reframe "restricting the export to signed clients moots the Rule
   1.18 exposure" to "narrows the artifact; the dataset is handled via 1.6/5.3."

## A6. Copy / format findings (why Packet #3 looks different from Packet #2)

- **Lead with a BLUF:** one-line ask + total question count + time estimate, before any context
  (Army Reg 25-50 origin; decision-memo / one-pager practice). **[V]**
- **Closed (yes/no) questions get answered faster** and completed more often than open ones;
  give each a yes/no core + an optional "fix if no" line (survey-design / respondent-burden
  research; SurveyMonkey: opening with an open question drops completion ~6 pts). **[V]**
- **Cap at 5–7 questions** (completion ~89% at 10, falling with each add; a favor ask should be
  fewer). Packet-2 had Q0+Q1–Q8 = 9; Packet-3 = Q0 + **six**. **[V]**
- **Order by legal risk, highest-stakes first,** with a short **[risk]** tag per question, so the
  load-bearing items get her freshest attention even if she stops early (serial-position/primacy;
  decision-memo "surface risks" applied at the question level). **[V/I]**
- **Q0 paid-advisory placement — the biggest copy change from Packet-2:** *split* it. One early
  sentence acknowledging the paid footing (etiquette: reviewing compliance docs is her billable
  domain, not a favor; reciprocity research favors naming the exchange early), and the **concrete
  offer at the close** (foot-in-the-door: let her say yes to the light, scoped review first;
  don't gate the substance behind a business-relationship decision). Packet-2 surfaced Q0 once in
  the cover note; Packet-3 keeps the one-line up top **and** adds the concrete offer at the end. **[V/I]**
- **Attach full docs but make questions answerable standalone,** with pinpoint cites into the
  attachments; "available on request" only for secondary material. **[V/I]**
- **Tone:** ask her to *flag problems*, not to "approve/certify"; explicit no-pressure exit;
  promise to close the loop ("I'll tell you what we changed") — which also sets up the paid ask. **[V/I]**

Sources (selected): 45 C.F.R. §160.103 (Cornell LII); HHS covered-entity guidance;
hhhealthlawblog.com (Stanger); leginfo §§6151–6153, 6155, 6156, 6156.5, 6157, 632, 632.7, 637.2,
CCP §2018.030, Civ. Code §§1798.100/.140/.99.80, 56.05/.06; calbar Rules 5.4/1.18/1.6/5.3/Ch.7 &
2026 GenAI Guidance; *Smith v. LoanMe* S260391; *Cloud v. Superior Court* 50 Cal.App.4th 1552;
*Baron v. City of L.A.* 2 Cal.3d 535; *IMC v. FCC* (11th Cir. No. 24-10277); 47 C.F.R. §64.1200;
FCC 24-24; CPPA regs / data-broker page; Twilio/TCR A2P docs; SurveyMonkey/Krosnick survey-design;
Army Reg 25-50 (BLUF).

---
---

# PART B — YANG REVIEW PACKET #3 (this is what Ali sends)

**To:** Roberta M. Yang
**From:** Ali Ansari — Intake QA / Plaintiff Ops LLC
**Date:** July 11, 2026
**Re:** Six yes/no compliance checks before a Monday beta — ~15 minutes, reply inline

---

**The ask, up front.** We open a free founding-cohort beta Monday: California plaintiff-PI firms,
we score the firm's *own* recorded intake calls and flag likely-lost cases; the firm's staff make
every callback, we never contact a caller, pricing is flat subscription only, and the SMS feature
stays dark. Below are **six yes/no questions** (plus one housekeeping line), each with the risk if
we're wrong and a pinpoint cite into the three attached drafts. I'm asking you to **flag anything
that's off** — not to approve or endorse anything. Nothing here has been sent, signed, posted, or
built. **Reply inline; ~15 minutes.**

*One housekeeping line, then I'll drop it:* this has grown past a one-off favor, and reviewing
compliance papers is your professional work, not a favor — I'd like to put it on a **paid advisory
footing** on your terms. Concrete offer at the very bottom so it doesn't crowd the substance.

**Attached:** (1) Mutual NDA, (2) Design-Partner MOU, (3) the data-handling instrument (currently
drafted as a BAA — see Q1). The consolidated regulatory-clearance memo and the LACBA methodology
piece are available on request.

---

**Q1 — The data instrument (this gates every firm's paperwork). [risk: HIGH — wrong instrument
manufactures obligations we don't have.]**
Our own research says a plaintiff-PI firm is generally **not** a HIPAA covered entity, so a vendor
to it is **not** a business associate — which would make a "BAA" a category error that can imply a
HIPAA relationship that doesn't exist. We propose to make the default instrument a **Confidentiality
& Data Security Addendum / DPA** (also carrying the CCPA service-provider terms), and offer a
**narrow BAA rider only** to med-adjacent firms (med-mal / firms that receive provider records).
**Do you agree the DPA/Addendum-by-default, BAA-rider-only approach is right?** *(If no: which
instrument, and does the site/MOU/NDA "a BAA is available" copy need to change to match?)*

**Q2 — Recording consent sits with the firm. [risk: HIGH — $5,000/call statutory under Pen. Code
§637.2.]**
California is all-party-consent; we record nothing and analyze only completed recordings the firm
made. MOU §5 puts the all-party-consent representation on the **firm**, and we'd add a firm
warranty + indemnity and take only lawfully recorded files. **Is putting the CIPA consent
obligation on the firm (the recorder), with us as downstream analyst, the correct allocation?**
*(MOU §5.)*

**Q3 — The flat-fee scope limits. [risk: HIGH — post-SB 37, capping violations are privately
actionable at $5,000–$100,000 each.]**
MOU §2 is written to keep us outside anti-capping (B&P §§6151–6152) and fee-sharing (Rule 5.4):
flat fee only, never outcome-tied, we never contact or procure claimants. Our read is that the
**only** real exposure in this family is the *parked* SMS re-engagement feature (which stays dark),
not the scoring. **Is MOU §2 airtight to keep the flat-fee QA vendor outside capping and Rule 5.4,
and do you agree the scoring product itself sits clear?** *(MOU §2; scope limits are contractual.)*

**Q4 — The NDA privilege clause. [risk: MEDIUM — a waiver argument could taint a firm's calls.]**
NDA §4 frames our receipt of call material as the firm's agent, at its direction, with an express
no-privilege-waiver intent. **Is the agency + non-waiver framing in §4 the strongest available for
a non-lawyer vendor under California law, or would you strengthen it?** *(NDA §4(a)–(b).)*

**Q5 — The LACBA piece's self-audit sidebar. [risk: MEDIUM — public, under my name; and one line
in it is legally wrong.]**
The methodology article invites firms to self-audit their own recordings. Our prior caveat labeled
the tally "attorney work product / self-evaluative document" — but our research says **California
recognizes no self-critical-analysis privilege, and a non-lawyer can't confer the work-product
label** (CCP §2018.030; *Cloud v. Superior Court*). We plan to **reframe it to "have a lawyer
direct the audit if you want a work-product claim."** **Is that reframe correct, and do the
verbatim, facts-only rep scripts ("record the fact, don't interpret the law") stay clear of UPL?**

**Q6 — The LACBA listserv gray zone. [risk: MEDIUM — solicitation optics in front of our exact
buyers.]**
A LACBA Small Firm Section member offered, unprompted, to post our beta-recruitment text (which we
drafted) to the section listserv — their account, our words, our commercial benefit. **Is the
member's unprompted offer enough to make this their speech, or should we decline it / ask the
member to write their own words?**

---

*FYI, no action — so nothing surprises you later:* before the SMS re-engagement feature could ever
leave "dark," it faces two independent gates we already respect — **A2P 10DLC carrier registration**
(carriers block 100% of unregistered traffic) and **TCPA** (informational-only content, 8am–9pm
local, opt-out honored). It stays parked for the beta.

---

That's the packet: Q0 plus six numbered questions, three drafts attached, everything else available
on request. **If you'd be open to a paid advisory arrangement**, I'll follow your lead entirely on
rate, scope, and paper — a short call to set it up whenever suits you; a "no" changes nothing about
how carefully I'll use your time. Either way, I'll tell you exactly what we changed based on your
notes.

Thank you,
Ali
