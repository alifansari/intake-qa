# Rescue layer — CRM integration ladder (research, 2026-07-11)

Staged reference for the "sit above the cadence, land back inside their CRM" wedge.
v1 (shipped 2026-07-11) is rung 0 for every CRM. Each higher rung is a per-integration
§VII gate: propose to Ali with the specific firm + credentials story before any live write.

## The wedge, stated once

A CRM cadence fires on elapsed time. It cannot answer "did we lose a signable case, and
why?" — that question indicts the workflow the CRM vendor sells, so they will never build
it. We answer only that question, and we hand the answer back INSIDE their tool (tagged,
prioritized records), which makes Lead Docket more valuable instead of triggering a
rip-and-replace fight. Independence moat, pointed at the CRM instead of the intake vendor.

## Per-CRM reality (verified 2026-07-11)

| CRM | Public API? | Auth | Writable for us | v1 path |
|---|---|---|---|---|
| **Lead Docket** (Filevine) | Yes — per-instance Swagger console at `{firm}.leaddocket.com/api/` | Per-firm API key the firm admin generates (no partner program) | Lead status changes, contact updates, notes, reassignment — documented. Outbound Webhook Rules fire on status change (Zapier-style consumers). Keyless inbound "Opportunity" POST endpoints exist too | CSV out of Leads Report (filter Lost/Rejected/chase-complete; schedulable) → our import. Later: webhook on status→Lost streams dead leads to us in real time; API write-back flips rescued leads into a firm-created "Rescued — Review" sequenced status |
| **CloudLex** | NO public API, no Zapier, no webhooks; closed integration list | n/a (bizdev-gated) | Nothing programmatic | Insights reports export to Excel → our import. Hand-back = our tagged CSV they work from. Never promise write-back here |
| **Litify** | Yes — it's a Salesforce managed package; full SF REST/Bulk API | Firm-created Salesforce Connected App (OAuth) | Fully writable (`litify_pm__Intake__c`, tasks, notes) | SF report export → import; write-back is plain Salesforce objects when gated on |
| **Lawmatics** | Yes — public REST docs | OAuth2 developer app | Matters/Prospects, Notes, Tags, Tasks, Custom Fields | CSV now; tags API later |
| **Law Ruler** | Yes — "Legal CRM API" | Per-portal key, no API fee | Inbound lead POST first-class; GET + actions | CSV now |
| **Clio Grow** | Lead Inbox API (create-only) + full Grow API via developer app | Token / OAuth | Create a lead easily; updating the ORIGINAL lead needs the full API | CSV now; Lead Inbox for "rescued copy" records if ever wanted |
| **Filevine proper** | Yes (API v2, OAuth2/PAT) | Account-admin PAT | Projects/contacts/docs — NO lead objects | Not needed: Lead Docket has its own API; the two sync natively |
| **Captorra** | No public docs | n/a | — | CSV only |

Key facts to remember:
- Lead Docket default statuses: Intake Review, Chase, Under Review, Pending Signup,
  Scheduled, Hold, Lost, Referred, Rejected, Signed Up, Closed. The cadence is the
  "Chase" sequenced status (Chase 1 → Chase 2 → …, firm-customizable). "Dead pool" =
  Chase exhausted + Lost/Rejected/Referred. Statuses are FIRM-CONFIGURABLE — the dead-
  status mapping must be per-firm config, and firms should create a dedicated
  "Rescued — Review" status so our write-back never collides with an active Chase.
- Serious legal-tech vendors (Hona, Case Status) integrate exactly this way: per-firm
  credentials the firm generates, not partner programs. Filevine's Certified Partner
  program is for marketplace listing, not API access.
- Lead Docket rate limits are undocumented — assume ~100 req/min, batch nightly.
- Generic "database reactivation" vendors are cruder (CSV → SMS blast → email replies);
  the integration bar to clear is low, and none of them scores legal merit.

## The ladder

0. **CSV in / tagged CSV out** — every CRM, shipped. No credentials, no gate. The firm
   exports dead leads (5 minutes), we hand back `rescue-list-<date>.csv` with
   new_status "Rescued — Review", priority, rescue tag, value tier + basis, gap, SOL
   estimate, callback note.
1. **Lead Docket direct** (first §VII proposal): firm admin hands us an API key →
   nightly read of Lost/Rejected/chase-complete + webhook rule on status change →
   write-back = status flip to "Rescued — Review" + note with the rescue packet line.
   Create-only-plus-status-flip keeps the connector's no-merge invariant.
2. **Litify / Lawmatics / Law Ruler / Clio Grow** — same pattern, self-serve credentials.
3. **Zapier/Make glue** — only as a no-code demo fallback; Lead Docket has no official
   Zapier app (Webhooks by Zapier both directions), so rung 1 is barely more work.

## Sources

Lead Docket: support.leaddocket.com articles 4414934625563 (API key + console),
360045902691 / 360045899851 (third-party & opportunity sources), 5019884869147 (webhook
rules), 360045258952 (Zapier webhook example), 360045917832 (lead statuses),
38843107195675 (Leads Report), 360048471211 (phase mapping);
filevine.com/features/custom-statuses-in-lead-docket. Filevine API:
developer.filevine.io (v2 auth), support.filevine.com 29259311975707 (API Q&A),
30444924078747 (CPI). CloudLex: cloudlex.com/faq, /applications/legal-client-intake-software.
Law Ruler: support.lawruler.com 360042382314. Lawmatics: docs.lawmatics.com. Clio Grow:
docs.developers.clio.com (Lead Inbox API). Vendors: hona.com/integrations/lead-docket,
casestatus.com/integrations/filevine, support.hona.com Litify collection.
