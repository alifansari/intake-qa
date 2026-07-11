# DECISION MEMO (Ali) — the "NDA within one business day" promise

> **STATUS: STAGED. Nothing below is applied to the site.** Decision needed before
> Monday 2026-07-14 (beta launch). Written 2026-07-11.

## The situation, plainly

The live site promises the mutual NDA fast, in two places:

- `web/src/app/(marketing)/apply/apply-form.tsx:86` — timeline step: **"Within one
  business day — We email your mutual NDA. Nothing connects until it's signed."**
- `web/src/app/api/beta/apply/route.ts:96` — API copy when Dropbox Sign is simulated:
  **"You're in the queue — we'll email your NDA within one business day. Nothing
  connects until it is signed."**

(`web/src/app/welcome/page.tsx:41` also says "within one business day," but that promise
is about **Ali emailing to set up the kickoff**, not the NDA — it is deliverable
regardless of this decision and needs no change under either option.)

**The real risk is not timing.** You can email a PDF within a day by hand (Dropbox Sign
is sandboxed; BETA_ONBOARDING.md already documents the manual send). The risk is **what
you'd be sending**: the NDA template (`ops/drafts/external/beta-mutual-nda.md`) has not
had attorney review, and its §4 privilege-preservation clause is exactly the kind of
novel-in-a-regulated-area language compliance-invariants §VII routes to Yang **before**
first use. Keeping the promise means either sending unreviewed contract paper (a §VII
violation) or getting Yang's read before the first application lands.

## Option (a) — keep the promise, get Yang's read before Monday

Send Yang the NDA **tonight** (it is 2 pages; her reviewer notes are already written at
the bottom of the draft, including the three specific questions). If she can turn a read
around by Sunday night, the promise stands, the copy stays, and the trust story at the
setup call is strongest: "you applied yesterday, here's your NDA today."

- Upside: strongest conversion trust; no copy churn; the promise was chosen for a reason.
- Risk: Yang is a warm contact, not retained — a weekend turnaround is a favor, not an
  SLA. If she hasn't cleared it by Sunday night, you're choosing Monday morning between
  breaking the promise and sending unreviewed paper. Decide the fallback NOW, not then.
- Recommended pairing: if you pick (a), set a hard fallback — "no Yang sign-off by Sunday
  9pm → apply option (b)'s diff before Monday's LACBA post goes up."

## Option (b) — soften the copy (staged diff below, NOT applied)

Change the promise from a clock to a sequence. Proposed exact edits — **do not apply
without Ali's word; if applied, run `npm run build` from `web/` and update the LACBA post
draft to match:**

**File 1: `web/src/app/(marketing)/apply/apply-form.tsx` (line ~84–88)**

```diff
             ndaSent
               ? ["Today", "The mutual NDA arrives by email. Nothing connects until it's signed."]
               : [
-                  "Within one business day",
-                  "We email your mutual NDA. Nothing connects until it's signed.",
+                  "First",
+                  "We email your mutual NDA as soon as your application is accepted. Nothing connects until it's signed.",
                 ],
```

**File 2: `web/src/app/api/beta/apply/route.ts` (line ~96)**

```diff
           ? ndaSent
             ? "Check your email for the NDA. Nothing connects until it is signed."
-            : "You're in the queue — we'll email your NDA within one business day. Nothing connects until it is signed."
+            : "You're in the queue — we'll email your mutual NDA as soon as your application is accepted. Nothing connects until it is signed."
```

**File 3: `web/src/app/welcome/page.tsx` — no change.** Its one-business-day line is the
kickoff-email promise, not the NDA. (Flagging so nobody "fixes" it by mistake.)

- Upside: no promise we can't keep honestly; buys Yang unrushed review time.
- Risk: "as soon as your application is accepted" is vaguer; a diligent ops person may
  read it as a soft no. Also creates drift with the LACBA post draft
  (`ops/drafts/lacba-beta-post.md` promises "a mutual NDA" without a clock — post copy
  survives either option, but its "Notes for Ali" checklist says every promise must be
  true on the site; re-verify after any copy change).

## Related flag (same family, not this decision): the BAA promise

`BETA_CONDITIONS[0]` (site-constants), the LACBA post, and MOU §6 all say **"a BAA is
available."** As of today a BAA draft finally exists (`ops/drafts/external/beta-baa.md`)
but it is **pending Yang's review, including a threshold question about whether a BAA is
even the right instrument**. Until that clears, "available" is an overclaim in the same
way the NDA promise is. Cheapest honest fix if a firm asks before review clears: "our
DPA is published; the BAA form is with counsel — we'll work from your firm's paper in
the meantime."

## The ask

Reply with **(a)** or **(b)**. If (a): forward the NDA to Yang tonight and name the
Sunday-night fallback. If (b): say "apply the diff" and it ships with a build + updated
decisions entry.
