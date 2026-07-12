# Beta Comms Kit — staged templates (Ali sends everything by hand)

**Status: STAGED, NOT SENT.** Per compliance-invariants §VII, nothing in this file is
sent by any agent or any automation. Every message below is a template Ali personalizes
and sends from his own email. The one in-product exception is the Day-0 welcome email,
which the studio composes automatically at onboarding and sends **only when Ali clicks
Send** on the onboarding success card (and `EMAIL_ENABLED=true`); the same text is here
so the voice stays consistent when he sends it by hand instead.

House rules for every message (do not deviate):
- Plain English for non-technical law-firm staff. No jargon, no "webhook payload" talk
  outside the one address they paste.
- **No dollar figures, no earnings claims, no recovery promises** (§I, §IV). Counts only:
  calls read, missed cases, callbacks, signed. Their arithmetic, never ours.
- Exception-based: a message exists because something needs them or something is theirs
  to celebrate — never a newsletter.
- Credit framing for the intake team ("3 signed cases came from your callbacks"), never
  surveillance framing. Blame volume, never people.
- Honest on failures: what broke, what we did, what happens next (§VIII).

Placeholders: `{{firm_name}}`, `{{first_name}}`, `{{signin_url}}`, `{{webhook_url}}`,
`{{upload_url}}`, `{{n}}` counts filled from the desk before sending.

---

## 1. Day-0 — Welcome (same content the studio composes at onboarding)

**Subject:** Welcome to Intake QA — your desk is ready, {{firm_name}}

> Hi — welcome aboard. Your Intake QA desk is live, and this one email has
> everything you need. Keep it.
>
> 1. SIGN IN
>    Sign in here: {{signin_url}}
>    Email: {{their_email}}
>    Temporary password: {{temp_password — from the onboarding card, shown once}}
>    (Prefer no password? On the sign-in page choose "email me a sign-in link" — it
>    always works. You can set your own password anytime under Settings.)
>
> 2. CONNECT YOUR CALLS (the one thing to forward)
>    If you use CallRail, this is your firm's private webhook address:
>    {{webhook_url}}
>    Forward this email to whoever runs your phones — on our 15-minute setup call we
>    paste it in together. It takes about two minutes, and nothing about how your team
>    answers the phone changes.
>    No CallRail, or want a head start? Upload recordings directly from your desk:
>    {{upload_url}}
>
> 3. YOUR FIRST 48 HOURS
>    - Today: sign in and look around. You'll land on "Missed cases" — the only screen
>      that needs your team's attention.
>    - As soon as calls flow in (webhook or upload), we read every one.
>    - Every morning around 8am Pacific you get one short email: your missed-cases
>      digest. Your first digest arrives the morning after your first calls come in. On
>      a clean day it says "calls read, all handled" — so a quiet inbox never means
>      something is broken.
>
> QUESTIONS, ANY TIME
>    Reply to this email, or call or text Ali directly at {{ali_cell}}. You get Ali,
>    not a ticket queue.
>
> — Ali
> ali@plaintiffops.com

---

## 2. Day-1 — "Your first calls are in"

Send the day the first real calls land (webhook or upload), before their first digest
if possible — it turns the first digest from a surprise into a delivery.

**Subject:** Your first calls are in — {{n_calls}} read

> {{first_name}} — good news: your calls are flowing. We read {{n_calls}} intake
> call{{s}} from {{firm_name}} today.
>
> What happens next: tomorrow morning around 8am you'll get your first missed-cases
> digest. If any likely-signable caller slipped through today, they'll be in it with a
> number to call back. If nobody slipped, it will say exactly that — "all handled" is a
> result, not an empty email.
>
> Nothing for you to do right now. If the digest should go to someone else on your team
> too (whoever owns callbacks), reply with their email and I'll add them.
>
> — Ali

---

## 3. Day-3 — Check-in

Send ~72 hours after calls start. Purpose: catch setup friction while it's cheap and
confirm the right person is seeing the digest. Fill the counts from the desk first.

**Subject:** Three days in — quick check

> {{first_name}} — three days of {{firm_name}}'s calls are on the desk: {{n_calls}}
> read, {{n_missed}} flagged for a callback so far.
>
> Two questions, thirty seconds:
>
> 1. Is the morning digest reaching the right person — whoever actually makes the
>    callbacks? If that's someone else, send me their email.
> 2. Have you opened one flagged call? If anything about it looked wrong — wrong name,
>    wrong reason, a caller who shouldn't be there — tell me plainly. A flag you
>    disagree with is exactly the feedback the beta is for.
>
> If setup is stuck anywhere (CallRail, uploads, sign-in), reply or call/text me at
> {{ali_cell}} and we'll fix it today.
>
> — Ali

---

## 4. Day-7 — First-week recap (mirrors the desk wins strip)

Send after a full week of calls. This mirrors the "wins this week" strip on the desk
queue (callbacks worked / reached / signed) — counts only, credit framing, no dollars.
Do NOT project, extrapolate, or dollarize; if they want the math, they have their own
fee numbers.

**Subject:** {{firm_name}}, week one: {{n_calls}} calls read

> {{first_name}} — one week in. Here's {{firm_name}}'s week, in the same numbers your
> desk shows:
>
> - {{n_calls}} intake calls read — every one, English and Spanish
> - {{n_missed}} likely-signable callers flagged for a callback
> - {{n_worked}} callbacks worked by your team
> - {{n_reached}} of those reached
> - {{n_signed}} signed {{— add the caller's first name if the team would enjoy it}}
>
> The ones still open are on the desk, newest first: {{signin_url}}
>
> Worth saying plainly: the callbacks are your team's work, not ours — we just make
> sure nobody slips away unseen. If {{coordinator_first_name}} is the one working the
> list, she's the reason those numbers exist.
>
> Anything in week one that felt off — a flag you disagreed with, an email too many, a
> screen that confused someone — reply and tell me. That's the deal in the beta: you
> get the desk free, we get the truth.
>
> — Ali

---

## 5. Incident note — "we hit a problem with call X, here's what we did"

Send the same day we discover any processing failure that touched their data or their
digest (failed scoring, missed webhook, wrong flag, digest that didn't go out). Never
wait for them to notice. Adjust the middle block to the facts — never soften them.

**Subject:** A problem on one of your calls — what happened and what we did

> {{first_name}} — flagging a problem on our side before you spot it, because that's
> the arrangement.
>
> What happened: {{plain-English description, one or two sentences — e.g. "Tuesday's
> 2:14pm call didn't process, so it never made it onto your desk" / "this morning's
> digest didn't go out"}}.
>
> What we did: {{what was done, when — e.g. "we re-ran it this morning; it's on your
> desk now and it did flag as a missed case — worth a callback today" / "the digest
> was re-sent at 10:05am"}}.
>
> What changes so it doesn't repeat: {{the fix, plainly — or "we're still digging; I'll
> send the cause by tomorrow" if the cause isn't known yet. Never guess.}}
>
> If anything on your desk looks off as a result, call or text me at {{ali_cell}} and
> I'll walk it back with you.
>
> — Ali

---

## 6. The 15-minute setup call — agenda

Booked in the welcome email. Goal: leave the call with calls flowing and the right
person on the digest. The CallRail mechanics live in
`ops/drafts/callrail-setup-runbook.md` — follow that runbook on the call; this agenda
is the customer-facing shape of the quarter hour.

**Before the call (Ali, 2 min):** firm is onboarded in /studio, welcome email sent,
their webhook address on your clipboard, runbook open.

1. **Minutes 0–2 — who's who.** Confirm who answers the phones, who makes callbacks,
   who should get the morning digest (often two different people — get both emails).
2. **Minutes 2–7 — connect the calls (the CallRail paste).** Screen-share with whoever
   runs the phones. Paste the firm's webhook address per the runbook. If they don't
   use CallRail: skip straight to uploads (step 4 becomes the main event).
3. **Minutes 7–10 — the test call.** Place one live test call to their intake line
   while connected (per the runbook's self-test). Watch it appear on the desk
   together — this is the moment the product becomes real; don't skip it.
4. **Minutes 10–12 — first upload.** Have them drag one recent recorded call into
   {{upload_url}}. Two reasons: a fallback they own forever, and a second call on the
   desk before you hang up.
5. **Minutes 12–14 — set expectations.** The morning digest (~8am Pacific, one email,
   "all handled" days included); flagged callers appear the same day; their team
   changes nothing about how they answer the phone. Recording consent stays their
   process, per their existing practice (we never touch it).
6. **Minutes 14–15 — the ask.** "For the beta, the payment is feedback: when a flag
   looks wrong, tell me. When an email annoys you, tell me. Deal?" Confirm digest
   recipients one last time. Done.

**After the call (Ali, 1 min):** confirm in /studio the test call scored, add any
extra digest recipient, put the Day-1 note on your calendar.
