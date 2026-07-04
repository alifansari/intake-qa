# GO LIVE — checklist before any real lead is texted

**Read this top to bottom. Do not skip a box.** Right now the system is in a safe
state: `TEST_MODE=true` means every "send" is simulated and logged — **no real phone
number is ever contacted**, and no real retainer is ever sent. That safety only comes
off when you deliberately complete the steps below.

This is the checklist a non-coder must finish **before** flipping `TEST_MODE` to
`false`. These are legal and safety requirements, not nice-to-haves. If you are unsure
about any item, **stop and ask** — do not guess.

> Prove the whole pipeline still works end-to-end at any time (safely, nothing sent):
> from `web/` run **`npm run e2e-synthetic`**. Every stage should print `PASS`. That
> command uses fake data with `TEST_MODE=true` and never contacts anyone.
>
> For a fast readiness check (no pipeline run, no network), run **`npm run smoke`** from
> `web/`: it confirms the two migration tracks match, the schema builds, and your
> compliance flags are set correctly. You can also open **`/admin/status`** in the app for
> a live, read-only board of the guardrails, per-firm kill switches, pending approvals, and
> recent errors.

---

## The ten gates (all must be checked)

### [ ] 1. A2P 10DLC brand + campaign APPROVED
Your business ("brand") and your texting use-case ("campaign") must be **registered and
APPROVED** with the carriers through Twilio before you can legally send business SMS in
the US. Confirm the status reads **APPROVED** (not "pending" / "in review") in the Twilio
console. Texting real numbers without this is a compliance violation and gets your
numbers blocked.

### [ ] 2. Anthropic BAA + Zero-Data-Retention (ZDR) active
Call recordings and transcripts are confidential client information. Before real client
data touches the scoring model, a **Business Associate Agreement (BAA)** and **Zero Data
Retention** must be in place and **active** on your Anthropic account. Get written
confirmation on file.

### [ ] 3. AssemblyAI BAA signed
Same reason: transcription processes confidential call audio. A **signed BAA with
AssemblyAI** must be on file before any real call is transcribed.

### [ ] 4. Flip `TEST_MODE` to `false` — ONLY after 1–3
Do **not** change `TEST_MODE` until gates 1, 2, and 3 above are all complete. Once they
are, set `TEST_MODE=false` in your live environment variables (`.env.local` / host env).
Until this moment, the system only simulates sends. **This is the single switch that
starts real texting — treat it with care.**

### [ ] 5. PILOT MODE stays ON (human approval required)
PILOT MODE is **not** something you turn off. Every single outbound text must still be
**reviewed and approved by a human** in the approval queue before it can send. There is
no autonomous/bulk sending. Confirm your team knows the Approve / Edit / Reject workflow.

### [ ] 6. Kill switch tested
Confirm the master **`KILL_SWITCH`** halts ALL sending instantly, and that the per-firm
kill switch works too. Test it: throw the switch, attempt a send, and verify it is
**blocked**. You must know how to stop everything in one move before you go live.

### [ ] 7. Quiet hours + opt-out verified in staging with YOUR OWN phone
Using **your own phone number** (never a client's) in a staging setup:
- **Quiet hours:** confirm no message sends between **8:00pm and 8:00am** in the
  recipient's local time.
- **Opt-out:** text back **STOP** (also test UNSUBSCRIBE / CANCEL / QUIT / END / REVOKE /
  OPT OUT) and confirm that number is **immediately** marked opted-out, logged, and
  **never texted again**.

### [ ] 8. Firm's retainer template loaded in Dropbox Sign
The firm's actual **retainer agreement** must be loaded as the template in Dropbox Sign.
Keep signature requests in **test/sandbox mode** until you have deliberately verified the
correct document, signer fields, and firm details.

### [ ] 9. Ethics-counsel sign-off on file
Get **written sign-off from ethics counsel** on the flat-SaaS fee arrangement **and** the
inbound-lead **TCPA** posture (consent basis: the caller's own inbound inquiry / existing
business relationship). This must be **on file** before real leads are contacted.

---

### [ ] 10. Hosted database migrations applied
Apply **every** file in `web/supabase/migrations/` to your hosted Supabase database (in
order). Local SQLite migrates itself; the hosted Postgres does not. In particular confirm
`0006_template_versions.sql` and `0007_errors.sql` are applied, or onboarding will save a
firm but not its template pack, and the error log will be missing. `npm run smoke` checks
that the two tracks are aligned in the repo; you must still run the SQL on the hosted DB.

---

## After go-live — keep these true

- **PILOT MODE stays on.** A human approves every message, always.
- **Quiet hours and opt-outs are honored automatically** — do not disable them.
- **Kill switch is one move away** if anything looks wrong.
- **Data retention:** transcripts and messages are purged after `DATA_RETENTION_DAYS`.
- **Secrets** live only in environment variables — never in code, never shared, never
  committed.

**If in doubt at any point: set `KILL_SWITCH=true`, stop, and ask.**
