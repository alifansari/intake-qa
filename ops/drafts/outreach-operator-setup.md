# Outreach operator setup — do these before Touch 1

Three things: (1) the association email, (2) your sending domain + SPF/DKIM/DMARC, (3) how to actually run the outreach day to day. Pair this with `zero-budget-outreach-kit.md` (the copy + sequence).

---

## 1) The affiliate-membership email (send to ONE association)

Pick by where your target firms cluster: **SCCTLA** (Santa Clara / San Jose), **Capitol City Trial Lawyers** (Sacramento), or **SFTLA** (San Francisco / East Bay). Find the membership or executive-director contact on their site (or the generic info@ address) and send:

**Subject:** Affiliate membership — an independent intake-quality analyst who works with plaintiff firms

Dear {{NAME / Membership Committee}},

I'm Ali Ansari, founder of Intake QA (Plaintiff Ops LLC), based in Sacramento. I run an independent service that scores how plaintiff personal-injury firms handle their intake calls — the first few minutes that decide whether a hurt person becomes a client — and hands the firm an honest, signed report. I'm not a lawyer and I don't solicit claimants; I work for the firms, as an outside analyst.

I'd like to join {{ASSOCIATION}} as an affiliate/vendor member and support the association's work however affiliates typically do. Two questions:

1. What affiliate or vendor membership options do you offer, and what are the dues?
2. Is there an upcoming meeting or mixer I could attend to introduce myself to members — as a guest if I'm not yet a member?

I'd rather meet this community the right way than cold-email into it. Thank you for your time.

Warmly,
Ali Ansari
Founder, Intake QA · Plaintiff Ops LLC · Sacramento, CA
{{ALI_PHONE}} · {{ALI_EMAIL}} · plaintiffops.com

*Why this works: honest, humble, names you as a firm-facing analyst (not a claimant solicitor), and asks the association to tell you the path in — which they will, because affiliate/vendor members are how they fund events.*

---

## 2) Your sending domain + email authentication (SPF, DKIM, DMARC)

**First decision — send from your domain, not Gmail.** Cold B2B email to law firms should come from **ali@plaintiffops.com**, not a @gmail.com address. A @gmail sender reads as unserious to a managing partner and hurts trust. If you don't already have email on plaintiffops.com, set up **Google Workspace** (~$7/user/mo — the one small cost worth it; it also gives you the calendar/Meet for the readouts). If you already have Workspace or Microsoft 365 on the domain, use that.

**Then publish three DNS records** at wherever plaintiffops.com's DNS lives (your registrar — Namecheap/GoDaddy/Cloudflare/Vercel). These decide inbox vs. spam; Google/Yahoo now require them.

**If you're on Google Workspace (most likely):**
- **SPF** — add a **TXT** record on the root domain (`@`):
  `v=spf1 include:_spf.google.com ~all`
- **DKIM** — in the **Google Admin console → Apps → Google Workspace → Gmail → Authenticate email**, click **Generate new record** (2048-bit), then add the **TXT** record it gives you at host `google._domainkey`, and click **Start authentication**.
- **DMARC** — add a **TXT** record at host `_dmarc`:
  `v=DMARC1; p=none; rua=mailto:ali@plaintiffops.com; adkim=s; aspf=s`
  (Start with `p=none` to monitor; after a couple weeks with no problems, tighten to `p=quarantine`.)

**If you're on Microsoft 365:** SPF `v=spf1 include:spf.protection.outlook.com -all`; enable DKIM in the Microsoft 365 Defender portal (it publishes two CNAMEs); same DMARC record as above.

**Verify it worked (free):** send an email to **check-auth@verifier.port25.com** or run the domain through **mxtoolbox.com/dmarc.aspx** and **mail-tester.com** (aim for 10/10). All three (SPF, DKIM, DMARC) should say "pass."

> Tell me your DNS host and email provider and I'll give you the exact copy-paste records for your setup.

**Sending hygiene (once records pass):** send **10–15 emails/day max**, by hand from your normal compose window (no mass-mail tool), plain text, **no tracking pixels, no link-shorteners**, one real link (your calibration page). If the domain is brand-new, spend 2 weeks sending real back-and-forth email first to warm it.

---

## 3) How to actually write to the firms + send the LinkedIn contacts (daily)

You are working **~5 firms per week, deeply** — not blasting. The whole edge is that each message proves you looked at *them*.

**Per firm, in order:**
1. **Recon (15 min).** Run the 6-signal checklist from the kit: call their line (offer Spanish? after-hours = voicemail or service?), submit their web form and time the reply, check for a Google "Local Services Ads" badge, look at their team page size. Write down the ONE sharpest thing you found. **Record nothing** — you're just listening to what any client hears.
2. **Pick the email variant** that matches your finding: Spanish gap → A1, slow/no form reply → A2, nothing sharp → A3. Paste it into a fresh Gmail compose, fill the `{{ }}` blanks, and **rewrite the first sentence** to state your specific finding ("I called your line yesterday and the tree only offered English, though your site has a Spanish page"). Send by hand.
3. **LinkedIn connect (same day):** find the managing partner's profile, send the C1 connection note (no pitch). Don't DM until they accept.
4. **Log it** in a simple sheet: firm, date, channel, finding, reply. That's your CRM for now.

**The weekly rhythm (≈2 hrs/day):**
- **Mon:** pick 5 firms, do all 5 recon passes, draft their emails + LinkedIn notes.
- **Tue:** send the 5 LinkedIn connects; comment on 2–3 PI-owner posts.
- **Wed:** send the 5 emails (mid-morning); reply to any LinkedIn accepts with the C2 DM.
- **Thu:** association work (RSVP a mixer, member forums) + every other week pitch one podcast.
- **Fri:** follow-ups on last week's non-repliers (touch 2/3), book any readouts, update your log.

**Iron rules:** every send is you, by hand. Any "no thanks" (email, LinkedIn, or phone) ends all contact with that firm, forever. A reply pauses the sequence — you take the conversation. Max 5 touches per firm, then stop.

**When someone says yes:** you're into the Leak Audit — "great, send me up to 10 of your own recent recorded intake calls and let's book 45 minutes for me to walk you through what I find." That readout is where you close the Charter.

**Pre-flight (must be true before you email anyone):** a real, monitored `ali@plaintiffops.com`; SPF/DKIM/DMARC passing; a live Calibration/error-rate page to link; the Sacramento address is real.
