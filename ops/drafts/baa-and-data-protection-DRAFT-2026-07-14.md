# Business Associate Agreement + Data Protection Addendum — DRAFT
**Status: DRAFT — NOT FOR USE. Requires review and sign-off by Roberta M. Yang (named compliance reviewer) and qualified outside counsel before it is sent to, or executed with, any firm.**
**Date drafted:** 2026-07-14 · **Purpose:** remove the single biggest procurement stall when selling to a high-volume PI firm — PI intake call recordings contain PHI, and a vendor cannot lawfully process them without a signed BAA. Firms negotiate BAA terms ~60–70% of the time *before* signing. Coming to the first meeting BAA-ready is a gate you clear, not an argument you win.

> **Why this needs Yang + counsel, per compliance-invariants §VI/§VII:** a BAA is a legal instrument in a regulated area (data/consent). This template is a starting point drafted for completeness and negotiation speed; it is not legal advice and must not be represented as final or as reviewed until Yang and counsel have signed off. Bracketed `[…]` fields are deliberate placeholders.

---

## Part A — HIPAA Business Associate Agreement

This Business Associate Agreement ("Agreement") is entered into by and between **[FIRM LEGAL NAME]** ("Covered Entity" or "Business Associate," as applicable — the "Firm") and **[PLAINTIFF OPS / INTAKE QA LEGAL ENTITY]** ("Business Associate" or "Subcontractor" — "Vendor"), effective **[DATE]** (the "Effective Date"). It supplements and is incorporated into the Master Services Agreement between the parties (the "Underlying Agreement").

**Recitals.** Vendor provides independent intake-call analysis, scoring, and triage services to the Firm. In performing those services, Vendor may create, receive, maintain, or transmit Protected Health Information ("PHI") on the Firm's behalf. Where the Firm is itself a business associate of a covered entity, Vendor acts as the Firm's subcontractor and this Agreement flows down the obligations the Firm owes upstream. The parties enter this Agreement to comply with the HIPAA Privacy, Security, and Breach Notification Rules (45 C.F.R. Parts 160 and 164) as amended by the HITECH Act.

### 1. Definitions
Capitalized terms not defined here have the meanings in the HIPAA Rules. "PHI" means Protected Health Information, limited to information Vendor creates or receives from or on behalf of the Firm. "Electronic PHI" ("ePHI") has the meaning in 45 C.F.R. § 160.103. "Security Incident," "Breach," "Unsecured PHI," "Required by Law," and "Designated Record Set" have their HIPAA meanings.

### 2. Permitted Uses and Disclosures
2.1 Vendor may use or disclose PHI only (a) to perform the services in the Underlying Agreement, (b) as Required by Law, and (c) for Vendor's proper management and administration or to carry out its legal responsibilities, provided that any such disclosure is Required by Law or is made under written assurances of confidentiality and breach-notification from the recipient.
2.2 Vendor will make uses, disclosures, and requests for PHI consistent with the Firm's **Minimum Necessary** policies.
2.3 **No secondary use.** Vendor will not use or disclose PHI for any purpose not expressly permitted here — and specifically will **not** use PHI to train, fine-tune, or improve any machine-learning model except a model that operates solely for, and whose outputs are solely returned to, the disclosing Firm, and never in a manner that exposes one firm's data to another. (See Part C.)
2.4 Vendor will not sell PHI and will not use or disclose PHI for marketing, in each case as those terms are defined by HIPAA.

### 3. Safeguards
Vendor will implement administrative, physical, and technical safeguards (including those required by the Security Rule, 45 C.F.R. §§ 164.308, 164.310, 164.312, 164.316) that reasonably and appropriately protect the confidentiality, integrity, and availability of ePHI. At a minimum: encryption of ePHI in transit and at rest; role-based access control and least-privilege access; audit logging of access to PHI; and no placement of PHI in URLs, third-party analytics events, or application logs.

### 4. Subcontractors
Vendor will ensure that any subcontractor that creates, receives, maintains, or transmits PHI on Vendor's behalf agrees in writing to restrictions and conditions at least as protective as those in this Agreement (45 C.F.R. § 164.502(e)(1)(ii), § 164.308(b)(2)). Current subprocessors and their function are listed in **Exhibit 1** and Vendor will give the Firm advance notice of any change.

### 5. Individual Rights
Within **[15]** business days of a Firm request, Vendor will: (a) make PHI in a Designated Record Set available for **access** (§ 164.524); (b) make PHI available for **amendment** and incorporate amendments (§ 164.526); and (c) make available the information required for an **accounting of disclosures** (§ 164.528). If an individual contacts Vendor directly regarding any of these rights, Vendor will forward the request to the Firm within **[5]** business days and not respond directly.

### 6. Breach and Security Incident Notification
6.1 Vendor will report to the Firm any use or disclosure of PHI not permitted by this Agreement, any Security Incident, and any Breach of Unsecured PHI **without unreasonable delay and no later than [5] business days** after discovery.
6.2 The report will include, to the extent known, the nature of the incident, the PHI involved, the individuals affected, and the mitigation taken. Vendor will cooperate with the Firm's breach-assessment and notification obligations under § 164.410. The parties will bear breach-related costs as allocated in the Underlying Agreement / Section 12 below.
6.3 Unsuccessful Security Incidents (e.g., routine firewall pings, port scans, failed log-in attempts) that result in no unauthorized access to PHI are deemed reported by this sentence; individual notice of each is not required.

### 7. Access by HHS
Vendor will make its internal practices, books, and records relating to the use and disclosure of PHI available to the Secretary of HHS for purposes of determining the Firm's compliance.

### 8. Term and Termination
8.1 This Agreement is effective on the Effective Date and continues until all PHI is returned or destroyed under Section 9, or the Underlying Agreement terminates, whichever is later.
8.2 The Firm may terminate the Underlying Agreement if Vendor materially breaches this Agreement and fails to cure within **[30]** days of notice.
8.3 **Return or destruction on termination.** On termination, Vendor will return or destroy all PHI (including copies held by subcontractors) if feasible. Where return or destruction is infeasible, Vendor will extend the protections of this Agreement to that PHI and limit further use/disclosure to the reasons that made return/destruction infeasible. This obligation is coordinated with the product's **deletion cascade** (Part C, § C.4): when the Firm offboards or requests deletion, derived data (transcripts, scores, triage records, embeddings) is deleted too.

### 9. Miscellaneous
Amendment to conform to changes in law; no third-party beneficiaries; interpretation in favor of compliance with the HIPAA Rules; survival of Sections 6, 8.3, 9, and Parts B–C.

---

## Part B — CCPA/CPRA Service Provider Addendum
Vendor is a **"Service Provider"** to the Firm under the California Consumer Privacy Act as amended by the CPRA (Cal. Civ. Code § 1798.100 et seq.). With respect to personal information Vendor processes on the Firm's behalf, Vendor will:
1. Process personal information **only on the Firm's documented instructions** and solely to provide the services (the "Business Purpose"); not for any other purpose.
2. **Not "sell" or "share"** personal information (as those terms are defined by the CPRA).
3. **Not retain, use, or disclose** personal information outside the direct business relationship, or **combine** it with personal information from other sources, except as permitted by § 1798.140(ag)(1)(D).
4. **Not train, develop, or improve any product or model** for Vendor's own benefit or for any party other than the Firm using the Firm's personal information (mirrors Part A § 2.3 and Part C).
5. Provide the same level of privacy protection required of the Firm, notify the Firm if it can no longer meet its obligations, and permit the Firm to take reasonable steps to remediate unauthorized use.
6. Assist the Firm in responding to consumer rights requests (access, deletion, correction, opt-out) within the timelines the Firm specifies.
7. Apply these protections equally to **Spanish-language and all other-language** intake data — no lower bar for any claimant population.

---

## Part C — Data Protection & Use Restrictions (the clauses that unstick the deal)
These are the terms a sophisticated PI firm's COO/IT will look for first. Pre-agreeing to them removes the biggest stall.

**C.1 No model training on Firm/claimant data.** Vendor will not use the Firm's or any claimant's data (call audio, transcripts, PHI, or derived data) to train, fine-tune, or evaluate any model except a model that serves only that Firm and never exposes its data to any other customer. Vendor's foundation-model subprocessors are contractually bound to zero-retention / no-training terms for Vendor's traffic (see Exhibit 1).

**C.2 No resale, no secondary monetization.** Vendor will not sell, license, or otherwise monetize the Firm's data or any de-identified/aggregated derivative in a way that could be re-identified or that discloses the Firm's case mix, volumes, or outcomes to any third party.

**C.3 Confidentiality of claimant and prospective-client information.** Vendor acknowledges the Firm's duties under Cal. Bus. & Prof. Code § 6068(e) and Rules of Professional Conduct 1.6 and 1.18, and that Vendor never gives legal advice, never forms a claimant relationship, and treats prospective-client information as confidential.

**C.4 Deletion cascade.** On Firm offboarding or a deletion request, Vendor deletes the Firm's source data and all derived data (transcripts, scores, triage cases, flags, embeddings, logs containing PHI) within **[30]** days, and certifies deletion in writing. Retention never outlives consent.

**C.5 Consent is the Firm's responsibility; Vendor will not defeat it.** Vendor's services assume the Firm has captured any consent required to record and process the calls (including California all-party consent under CIPA / Penal Code § 632). Vendor will not design or operate any feature that records or intercepts a call without the Firm's documented consent chain.

**C.6 Fraud-indicator integrity.** Vendor will surface fraud-indicator flags to the Firm and will not suppress them (consistent with Penal Code §§ 549/550 and Insurance Code § 1871.7).

**C.7 Security posture.** Encryption in transit/at rest; least-privilege access; audit logging; SOC 2-aligned controls (target/attained: **[state honestly — do not claim a certification not held]**); incident response per Part A § 6.

---

## Exhibit 1 — Subprocessors (to be completed and kept current)
| Subprocessor | Function | Data exposure | Contractual protection |
|---|---|---|---|
| [Transcription provider, e.g. AssemblyAI] | Speech-to-text of intake calls | Audio + transcript (PHI) | BAA / zero-retention / no-training |
| [Foundation-model provider] | Scoring extraction (single model call) | Transcript (PHI) | Zero-retention / no-training for Vendor traffic |
| [Hosting / DB, e.g. Supabase/Vercel] | Storage + compute | PHI at rest/in transit | BAA / encryption |
| [Telephony ingest, e.g. CallRail] | Call source | Call metadata + recording | Firm's own BAA with provider |

---

## Open items for Yang / counsel review (do not resolve unilaterally)
1. Confirm the correct HIPAA posture: is the Firm a Covered Entity, or a Business Associate for whom Vendor is a **Subcontractor**? The flow-down language in the Recitals + § 4 assumes the latter is possible; verify per typical PI-firm facts.
2. Confirm every subprocessor in Exhibit 1 actually has the stated zero-retention/no-training/BAA terms **before** representing them to a firm (§IV citation integrity — do not claim a protection not in place).
3. Do NOT claim SOC 2 or any certification not actually held (§V truthfulness). State current status honestly in C.7.
4. Breach-cost allocation (§ 6.2 / 12) and cure periods are placeholders — counsel to set.
5. This template must not be sent to any firm, or described as "our BAA," until Yang + counsel approve. Staged only.
