# Integrations as stickiness + distribution — which to prioritize, the listing-as-channel play, the credential/vendor path

> Sub-objective 4.4. Staged draft — nothing enabled, listed, or sent. Author: research/product sub-agent, 2026-07-12.
> Supreme authority: `.claude/skills/compliance-invariants/SKILL.md`. This draft touches the **re-engagement surface** that decisions.md 2026-07-07 explicitly GATED behind retained legal clearance — see §6. Route to Yang before any live Lead Docket write-back.

---

## TL;DR (the aggressive version, then the risk)

The retention winner and the distribution winner are **two different integrations**, and the instinct to "just ship one connector" picks the wrong one.

1. **Lead Docket direct (import + write-back)** — already built on `beta/lead-docket-direct`, dark-gated — is the **retention / proof-of-value engine**. It is the only integration that pulls the firm's *own dead-lead backlog IN* (the conveyor's fuel), and Lead Docket is the PI-specialist intake CRM, so the fit with the founding cohort is deepest. It creates **zero distribution loop** — Lead Docket has no self-serve marketplace.

2. **Clio (export + a future import)** is the **distribution engine**. The Clio App Directory is the only one of the four vendor surfaces that is a genuine inbound channel at scale (Clio is the market-leading legal PM platform, "hundreds of thousands of legal professionals in 130+ countries" — [clio.com/manage](https://www.clio.com/manage/)). A listing there is the Michelin-loop the DNA already wants: customers become distribution. Clio also gives strong *workflow* retention (rescue packet lands as Clio tasks in the tool the coordinator already lives in), but it is a shallower data-IN play than Lead Docket.

**Do both, in sequence, but understand they do different jobs:** ship Lead Docket direct to make the beta cohort *sticky and activated* (retention); open the Clio App Directory pipeline *now* — because its security-review + demo pipeline is long — to build the *inbound channel* (distribution) for the cohort after this one.

**Do NOT list in Lawmatics** despite it having the best partner economics (co-marketing *with revenue share*). Lawmatics QualifyAI grades intake — it is a direct competitor. Listing our independent scorer inside a competitor's house dilutes the one moat that is structurally uncopyable (independence, insight D1). Filevine — which *owns* Lead Docket ([Filevine acquired Lead Docket, all-cash, 2020](https://www.lawnext.com/2020/04/case-management-company-filevine-acquires-lead-management-company-lead-docket.html)) — is the up-market extension of the Lead Docket wedge, not a near-term listing.

**Biggest risk:** the Clio listing is gated on an install base we do not yet have (Certified Silver = 100 active Clio accounts), i.e. a chicken-and-egg — you need firms to get certified, and you want certification to help get firms. The move is to open the *uncertified* directory-listing conversation (api.partnerships@clio.com) now so the channel is live when the cohort exists, and to fix the silent-token-death bug in `clio.mjs` (§7) before any firm connects — it is the CallRail-401 silent-failure pattern all over again.

---

## 1. What exists today (ground truth from the repo)

Two distinct integration surfaces are built, and the distinction is load-bearing:

**A. Export connectors (data-OUT) — `web/integrations/connector.mjs` + `clio.mjs` / `filevine.mjs` / `leaddocket.mjs`.**
- One dispatch seam, lazy-loaded adapters (Twilio pattern), all HTTP isolated per adapter, credentials AES-256-GCM encrypted (`crypto.mjs`, `INTEGRATIONS_ENC_KEY`).
- Events: `flag.created` → Note; `outcome.recorded` → Task; `audit.completed` → summary Note; `rescue_packet.created` → one Task per rescue item (zero-login delivery into the CRM the firm already uses).
- Header comment is explicit and correct: **"These are EXPORT integrations only — they push our findings out. Nothing here can send SMS or touch the send chokepoint."** Field names are honest PLACEHOLDERS the operator finalizes against real API docs. `ctx.fetchImpl` injectable → every path is mock-tested, no live creds needed.
- This is the *stickiness-by-embedding* surface. It is compliant on the send-chokepoint rail by construction.

**B. Lead Docket direct (data-IN + write-back) — `beta/lead-docket-direct`, file `web/integrations/leaddocket-import.mjs` (not on main).**
- **This is a different animal from the export connector.** It READS the firm's Lost/Rejected/chase-complete leads from their per-instance Lead Docket API, triages each **deterministically (no LLM)**, and for the survivors flips the lead to the firm's own "Rescued — Review" status + posts ONE note with the triage basis.
- Compliance rails enforced in code and genuinely well done: never contacts a claimant (only writes a status flip + note in the firm's OWN CRM; staff make callbacks; no SMS/email path); value is a cited **TIER, never dollars**; screen-outs only on legally-determinable facts (out-of-scope case type, no contact info) and screened leads are KEPT with a reason; honest nulls.
- **Dark by default**, three-lock gate (`liveWriteAllowed`): per-firm `enabled` row AND `LEAD_DOCKET_LIVE` env master switch AND a stored encrypted credential. A live run with no reachable target **skips loudly** rather than silently hitting the in-module mock (a real bug-class the author pre-empted). Migrations Postgres 0039 / SQLite 0031, RLS ON deny-all service-role-only. 16 tests. Verified green (532/532, build OK), `/code-review` (high) run and fixes applied. **Not pushed, not merged, no firm enabled.**

**The critical structural finding:** the branch is **import + write-back, not "export-only."** The task's own compliance frame says *"EXPORT-only, cannot touch the send chokepoint."* The branch satisfies the part that legally matters — no claimant contact, no send chokepoint — but it is the **first surface that writes into a firm's system of record**, and it re-engages dead leads. That lands squarely on a previously-gated surface. See §6. This is not a reason to kill it; it is a reason it goes to Yang, not straight to a firm.

---

## 2. The scoring: retention vs distribution, per integration

Two independent axes. Retention = does data flow IN / does it become the daily habit / does the firm depend on it. Distribution = does a live listing create inbound.

| Integration | Retention (data-in + daily habit) | Distribution (listing = inbound) | Independence-moat fit | Build state |
|---|---|---|---|---|
| **Lead Docket direct (import + write-back)** | **Highest.** Pulls the whole dead-lead backlog IN = the conveyor's fuel; PI-specialist fit; fastest visible value ("point us at your dead pile") | **None.** No self-serve marketplace/directory; curated integrations page only | Neutral (their CRM, our independent triage) | Built, dark-gated, unmerged |
| **Clio export (+ future import)** | **High (workflow).** Rescue packet as Clio tasks in the tool staff live in; "Add to Clio". Shallower data-IN today (pushes out) | **Highest of the four.** Real App Directory into the largest legal-PM install base; co-marketing loop; internal referral to Clio Sales/Support | **Best.** Clio Manage is neutral case management → "strategic fit / limited overlap"; independence preserved | Export built; OAuth-refresh gap (§7); no import yet |
| **Filevine export** | Medium (bigger firms, case-mgmt not intake) | Low–medium; integrations are curated, not open self-serve | Neutral | Built (export), untested live |
| **Lawmatics** | Medium; but Lawmatics is a CRM that grades its own intake | Partner program has **co-marketing + revenue share** (best economics) — but it is a **competitor's marketplace** | **Worst — dilutes independence.** QualifyAI is a direct competitor | Not built |

**Read-off:** retention → **Lead Docket direct**; distribution → **Clio**. They are not the same integration, so a single-connector strategy is wrong. Sequence them by the job each does.

---

## 3. The listing-as-channel play (Clio App Directory)

This is the answer to "marketplace listing = inbound." Clio is the only one of the four where a listing is a real channel.

**Why Clio specifically:**
- Market-leading legal PM platform, hundreds of thousands of professionals, 130+ countries ([clio.com/manage](https://www.clio.com/manage/)). Many small CA PI firms already run Clio.
- The App Directory is browsable by firms *looking for* intake/QA tooling → intent-qualified inbound, not cold outreach.
- Certification unlocks a **referral + co-marketing loop**: "New & Noteworthy" placement, a Certified badge for our own site, joint case studies with Clio PR review, and — the sleeper — an **internal announcement to Clio Sales and Support teams**, who then surface us to firms in conversations ([Clio Certified App Program](https://docs.developers.clio.com/handbook/grow-your-app/clio-certified-app-program/)).

**Two tiers of the play (they have different lead times):**

1. **Uncertified directory listing (start NOW).** Email **api.partnerships@clio.com** to begin. Process ([App Directory Listing Guidelines](https://docs.developers.clio.com/handbook/launch-your-app/app-directory-listing-guidelines/), [Developer security & data guidelines](https://docs.developers.clio.com/handbook/build-your-app/developer-security-and-data-guidelines/)):
   - Security & compliance questionnaire via **Securiti**, reviewed by Clio's App Security & Compliance team.
   - Decline red flags: **cannot meet data-residency**, **cannot meet customer-data-removal**, **no security/privacy policy docs.** → We already have the deletion cascade (§VI) + retention purge (`DATA_RETENTION_DAYS`) — that *is* the customer-data-removal story; but we must publish a real security + privacy policy and name subprocessors (the `/dpa` / `/msa` drafts are the seed).
   - Pre-recorded demo (company, customers, problem, integration) → listing form → draft review.
   - This is discoverability *without* an install base. It is the thing to open immediately because the security-questionnaire + demo pipeline is measured in weeks, not days.

2. **Certified Silver (6–12 mo, gated on traction).** Requirements: **100 active Clio accounts**, "Add to Clio" implemented, Lighthouse ≥50, **99.5% uptime (30-day rolling)**, one-business-day support, security assessment, strategic fit, product demo. Benefits: badge, "New & Noteworthy", joint case studies, Sales/Support announcement. **Gold is invite-only** (dedicated partner manager, custom co-marketing plan). **No revenue share, no lead-referral program** — the value is visibility + co-marketing, not economics.

**The bootstrap tension (name it):** Silver needs 100 active Clio accounts we do not have pre-revenue. So the *channel* (uncertified listing) has to precede the *co-marketing amplifier* (certification). Open the listing now; let the founding cohort + the next ring push us over 100; certify when the install base is real. SOC2 is the gating *cost* for a clean security review at scale — flag it as a real line item, not a checkbox.

**Independence interaction (the DNA hook):** listing in Clio's *neutral* directory (Clio Manage = case management, not an intake-grader) keeps the "independent scorer / Moody's-of-PI-intake" story intact. Listing in **Lawmatics** — whose QualifyAI grades intake — would put the independent rating agency inside a rated party's storefront. That is the exact conflict-of-interest we sell *against* (insight D1). Better partner economics, wrong strategic house. Decline it, or revisit only if the independence framing is explicitly firewalled.

---

## 4. Recommendation — which to prioritize

**Prioritize BOTH, on two clocks, because they solve different problems:**

**Retention clock (weeks — beta cohort):** Ship **Lead Docket direct** as the activation/value lever. It is merge-ready, dark-gated, PI-native, and it is the only integration that demonstrates value against the firm's *existing* data on day one. But it is gated on §6 (Yang clearance of the re-engagement write-back) before any firm is enabled — the env switch is not the gate that matters.

**Distribution clock (months — next cohort):** Open the **Clio App Directory** pipeline now (email api.partnerships@clio.com, run the Securiti questionnaire, fix `clio.mjs` §7, publish the security/privacy policy). Treat certification as a 6–12mo goal that the cohort's install base unlocks.

**Explicitly do NOT** lead with Filevine (bigger firms, weaker inbound) or Lawmatics (competitor's marketplace, independence dilution). Keep Filevine warm as the up-market extension of the Lead Docket/Filevine ownership path.

---

## 5. The credential / vendor path (concrete)

**Lead Docket (fastest — no partner registration needed):**
- Credential is the **firm's own firm-admin API key**, generated inside their Lead Docket instance. No developer-portal / partner approval — it is the firm's key, so no gatekeeper.
- Per-instance host (`acme.leaddocket.com`), key stored AES-256-GCM (`INTEGRATIONS_ENC_KEY`), RLS deny-all service-role-only. Base URL derived defensively from host.
- **Action for the operator:** confirm the real API shape against the firm's Swagger console at `{host}/api/` before first live run — the branch's paths (`/api/Leads?status=`, `PUT /api/Leads/{id}/status`, `POST /api/Leads/{id}/notes`) and the auth header scheme are honestly marked PLACEHOLDER and centralized so one edit fixes all. Assume ~100 req/min, run nightly/batched.

**Clio (longer — OAuth + partner approval):**
- Register a developer app in the **Clio Developer Portal** ([create an application](https://docs.developers.clio.com/api-docs/applications/)); Clio Manage API v4 uses **OAuth2 authorization-code** → store **access + refresh** tokens encrypted (not just an access token — see §7).
- To LIST: api.partnerships@clio.com → Securiti questionnaire → pre-recorded demo → listing form.
- To CERTIFY (Silver): the 100-account / uptime / support / Add-to-Clio / security-assessment bar.

**Filevine / Lead Docket ownership:** Lead Docket is a Filevine company. A Lead Docket integration is therefore also a foothold in the Filevine ecosystem; Filevine's certified-partner integration path is the up-market next step, not now.

**Lawmatics:** partner program is an online application + integration review, with co-marketing + revenue-share ([Lawmatics tech partner program](https://www.lawmatics.com/integrations); api@lawmatics.com). Economics attractive, strategic fit poor (competitor). Park it.

---

## 6. COMPLIANCE — the finding that outranks the strategy

**The Lead Docket write-back re-engages the firm's own dead leads, and that surface was already GATED.** decisions.md 2026-07-07 ("GTM re-scope"): *"the recovered-lead re-engagement feature is GATED — not shipped, marketed, demoed as available, or sold until a retained CA legal-ethics review clears it"*, because re-engaging a firm's own leads is the **single softest surface against AB 931 ("anything of value for securing services") and B&P §§6151–6152 (capping/running)**, with **SB 37's private right of action ($5,000–$100,000/violation, VERIFIED)** as a risk multiplier.

The branch does not SMS — staff make the calls — which is the cleanest possible posture, and the code is disciplined (tier not dollars, no claimant contact, screen-outs with reasons). **But the legally-operative gate is retained-counsel/Yang clearance, not the `LEAD_DOCKET_LIVE` env switch.** Building it dark is correct; enabling it for a firm before Yang signs off would step over the exact line the 2026-07-07 decision drew.

**Route to Yang, specifically:**
1. Is the read-triage-write-back-into-the-firm's-own-CRM loop within bounds as *the firm re-working its own leads with an independent triage tool* — or does surfacing/flipping a lead's status implicate AB 931 / §§6151–6152 / SB 37? (This is the softest-surface question, now in code.)
2. Does "import + write-back" stay inside the "EXPORT-only" doctrine the connector header commits to, or does writing into a firm's system of record need its own consent/enablement language and disclosure?

**Other compliance checks (pass):**
- Send chokepoint: untouched. Neither the export connectors nor the import path can send SMS or route around `web/messaging/send.mjs`. ✔ (§ compliance, CLAUDE.md)
- Credentials: AES-256-GCM at rest, `INTEGRATIONS_ENC_KEY`, refuses to store plaintext, RLS deny-all. ✔ (§VI, hard rules)
- Value framing: tier never dollars, no guaranteed outcome, honest nulls. ✔ (§IV)
- Marketing: any Clio-listing / Certified-badge copy is a new public claim → Ali + Yang before it goes live; no "only/best/#1" in the listing (§V, §VII).

---

## 7. Engineering flags to fix before any firm connects

1. **`clio.mjs` stores a raw OAuth access token as `ctx.creds` and sends it as a static Bearer.** Clio v4 access tokens expire (hours). A nightly/daily push will **silently 401 after expiry** — the integration reads "connected" then goes dark. This is the same silent-failure class as the CallRail-signature 401 the team already fought (decisions.md 2026-07-11 S1). Fix: store + encrypt the **refresh token**, refresh on 401, and write a loud `error_log` on refresh failure. Do this before the first firm connects, not after.
2. **Export connector field names are PLACEHOLDERS** across clio/filevine/leaddocket. Fine for mock tests; must be finalized against live API docs per provider before a real push. The Lead Docket import is honest that its paths need Swagger verification.
3. **Retry/rate-limit posture** on the import is nightly-batched with a 429-aware error path — good; confirm the real Lead Docket rate limit with the firm before enabling (undocumented; assumed ~100/min).

---

## Proposed decisions.md entry (stage — do NOT append live)

```
## 2026-07-12 — Integrations moat: Lead Docket = retention, Clio = distribution (two clocks)  ·  agent: research/product sub-agent · lane: product/GTM
- **Change:** Assessed beta/lead-docket-direct (import + write-back, dark-gated) and the export
  connector (clio/filevine/leaddocket). Verdict: the retention winner (Lead Docket direct — pulls the
  dead-lead backlog IN, PI-native, fastest proof-of-value) and the distribution winner (Clio App
  Directory listing — the only real inbound channel of the four, into the largest legal-PM install
  base) are DIFFERENT integrations. Prioritize both on two clocks: ship Lead Docket direct for beta
  activation (after Yang clears the re-engagement write-back); open the Clio api.partnerships listing
  pipeline now (long lead time) and treat Silver certification as a 6–12mo, install-base-gated goal.
  Do NOT list in Lawmatics (competitor marketplace, dilutes the independence moat) despite better
  partner economics; keep Filevine warm as the up-market extension of the Lead Docket ownership path.
- **Hypothesis:** deep CRM data-in (Lead Docket) makes the beta cohort sticky and proves value on
  their existing data; a neutral-marketplace listing (Clio) becomes the inbound loop for the next
  cohort — customers-as-distribution (the Michelin loop in the DNA).
- **Expected effect:** retention/activation of founding cohort; a live inbound channel (Clio directory)
  standing by when the cohort clears 100 active accounts.
- **COMPLIANCE GATE (supreme):** the Lead Docket write-back re-engages the firm's own dead leads — the
  surface decisions.md 2026-07-07 GATED behind retained CA legal-ethics review (AB 931 / §§6151–6152 /
  SB 37 private right of action). The env switch is not the gate; Yang/retained counsel clearance is.
  Two Yang questions staged in ops/drafts/integrations-moat.md §6. Any Clio-listing / Certified-badge
  copy is a new public claim → Ali + Yang before live (§V, §VII).
- **Eng blocker:** clio.mjs stores a static OAuth access token (expires → silent 401); add refresh-token
  storage + refresh-on-401 + loud error_log before any firm connects.
- **Status:** staged-for-approval (nothing enabled, listed, sent, or pushed).
- **Review date:** 2026-08-05.
- **Result:** —
```

## Sources
- [Clio App Directory Listing Guidelines](https://docs.developers.clio.com/handbook/launch-your-app/app-directory-listing-guidelines/) — Securiti questionnaire, decline red flags, demo→listing flow (verified)
- [Clio Developer security & data guidelines](https://docs.developers.clio.com/handbook/build-your-app/developer-security-and-data-guidelines/) (verified)
- [Clio Certified App Program](https://docs.developers.clio.com/handbook/grow-your-app/clio-certified-app-program/) — Silver/Gold requirements + benefits; no rev-share (verified)
- [Clio Manage](https://www.clio.com/manage/) — market-leader / install-base framing (verified as vendor self-description)
- [Filevine acquires Lead Docket (LawSites, 2020)](https://www.lawnext.com/2020/04/case-management-company-filevine-acquires-lead-management-company-lead-docket.html) — ownership (verified)
- [Lead Docket Integrations Overview](https://support.leaddocket.com/hc/en-us/articles/4414933758619-Integrations-Overview) + [Lead Docket API](https://www.leaddocket.com/integrations/) — API-for-firms, no self-serve marketplace (verified)
- [Lawmatics tech partner program / integrations](https://www.lawmatics.com/integrations) + [Lawmatics Open API](https://help.lawmatics.com/en/articles/10699983-lawmatics-open-api) — co-marketing + revenue share; competitor (verified)
```
