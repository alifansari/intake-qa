# Simplicity audit — "as intuitive as buying a notebook" (2026-07-10)

Full-surface analysis of how a stranger understands, values, signs up for, uses, and
accesses the product — and what was changed. Method: exhaustive inventory of all 16
marketing pages + every CTA, every funnel traced through code, the signed-in IA, and
the redirect layer.

## The diagnosis (what failed the notebook test)

1. **Too many things with names.** One product was presented as ~13 named artifacts
   (Leak Audit, Missed-Revenue Statement, Recoverable-Lead Alert, Saved-Case Ledger,
   Team Coaching, the letter, manifesto, concierge, beta, demo, three unpublished
   price tiers…). A notebook is one thing.
2. **Signing up did not exist.** The beta-application API (`/api/beta/apply` — ICP
   qualification, NDA gate, waitlist) was fully built with **no form anywhere on the
   site**. The only actions were the free audit upload and emailing Ali.
3. **Dead ends at the moment of interest.** The homepage "See a real sample
   Statement →" sent anonymous visitors into a login wall (`/statement` → 308 →
   `/desk/documents` → `/login`). The audit report's "Book a walkthrough" button
   silently vanished when `AUDIT_CALENDAR_URL` was unset (it is unset).
4. **The product entrance was stale.** Post-login landed via a redirect hop; the
   product nav's 7 links all 308-redirected to 3 desk screens with mismatched
   labels; desk nav used insider words ("Leaked-case queue", "Statements & readouts",
   "Calls & reconciliation").
5. **A truthfulness bug.** Three pages claimed "our own analysis and transcription
   models" while the DPA's subprocessor table names AssemblyAI and Anthropic
   (Rule 7.1 / compliance §V problem, and a trust hole for any diligent buyer).

## What changed

| Area | Before | After |
|---|---|---|
| Signup | No form; email Ali | **`/apply`** — 5 fields, one button, wired to the existing NDA/waitlist API; linked from nav CTA row, homepage (3 places), pricing, footer, and the audit report |
| Homepage | 17 sections, 7-step mechanism list | 11 sections, **3-step "How it works"**, one primary CTA (free audit) + one secondary (apply); agency-accountability, months-2-12, comparison-table, duplicate-independence, founder-note, newsletter sections cut |
| Hero sample link | `/statement` → login wall | `/audit/sample` (public sample report) |
| Marketing nav | Manifesto / How it works / Beta & pricing / Compliance / The letter | **How it works / Pricing / Compliance / FAQ** (manifesto + letter + error rate moved to footer) |
| Audit report CTA | Walkthrough button vanished without config | Always renders (falls back to email); **"Apply for a founding seat"** added |
| Pricing | Free-audit CTA + mailto only | **Apply** as the primary action, audit as step one |
| Post-login | `/queue` → 308 hop | Straight to `/desk/queue` |
| Product nav | 7 stale redirected links, wrong labels | 4 links matching the desk's real screens |
| Desk labels | "Leaked-case queue", "Statements & readouts", "Calls & reconciliation", "Review queue" | **"Missed cases", "Documents", "Calls", "Analyst review"** |
| Onboard success | Linked to two dead routes | Links to the real desk |
| Truthfulness | "our own models" ×3 | "specialist engines under our DPA (every subprocessor named)" — matches the DPA |
| Local DB | `db.*.supabase.co` (IPv6-only, breaks on IPv4 networks) | Pooler host in `DATABASE_URL` (works everywhere; use the same on Vercel) |

## The journey now

**Understand** (one breath): "We read your intake calls, find the signable cases that
walked, and show you what they cost. Flat fee, never a share." →
**Value** (one scroll): sample statement + 3 steps + 4 stats →
**Sign up** (one minute): `/apply`, five fields → NDA lands by email →
**Use**: sign in → land directly on Missed cases →
**Access**: 4 plain-word desk tabs; everything else one click from the footer.

## Deferred (worth doing, not done in this pass)

- `/how-it-works`, `/faq`, `/compliance` are still walls of text — they now carry
  less of the burden but would benefit from the same cut.
- The `/desk` first-run experience still shows demo-firm data or setup errors for a
  brand-new firm; a real empty state ("your first calls land here") needs design.
- `/onboard` remains unlinked (it doesn't create an account; linking it would add a
  second signup story — decide its fate).
- The 8 shadowed page files behind the 308 redirects are dead code; delete when
  convenient.
- "Leak Audit" vs "audit" vs "spot-check" wording could collapse to one term
  everywhere ("the free audit").
