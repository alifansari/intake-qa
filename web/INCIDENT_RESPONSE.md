# Incident response (one page)

Keep this current. If something goes wrong with a firm's confidential call data, speed and honesty
matter more than polish.

## Who to contact
- Owner / analyst of record: Ali — ali@plaintiffops.com. TODO(Ali): add a phone number and a
  backup contact.

## Revoke / rotate keys (do this first on any suspected key compromise)
- Supabase: Dashboard → Project Settings → API → roll the `service_role` and `anon` keys; update
  Vercel env vars; redeploy.
- AssemblyAI: Dashboard → API keys → revoke + reissue; update env.
- Anthropic: Console → API keys → revoke + reissue; update env.
- Resend: Dashboard → API keys → revoke + reissue; update env.
- Twilio: Console → revoke auth token / API keys; update env. (Dark until A2P anyway.)
- Vercel: rotate any exposed project env vars; redeploy so old values stop being served.

## Force-delete a tenant's data
- Trigger the deletion cascade for the firm (Settings → Request data deletion, or the deletion
  function directly): removes Supabase Storage objects (audio, PDFs), deletes DB rows for the
  tenant, and calls AssemblyAI `DELETE /v2/transcript/{id}` for each transcript. Record responses.
- TODO(Ali): confirm the cascade + receipt are enabled in production (security gate).

## Breach-notification checklist
1. Contain: revoke keys (above), take the affected surface offline if needed.
2. Scope: which firm(s), which data (recordings/transcripts/flags/statements), what time window.
   Use `artifact_access_log` to see what was accessed.
3. Notify the affected firm(s) promptly and plainly — what happened, what data, what you're doing.
   TODO(Ali): confirm the notification timeline you can commit to (e.g., within 72 hours of
   becoming aware) and whether any statutory notice (e.g., CCPA) applies.
4. Preserve evidence: logs, timestamps, the access log.
5. Remediate + write a short post-incident note (what, why, fix).

## Do not
- Do not delete logs during an active incident.
- Do not claim it's contained until keys are rotated and the vector is closed.
- Do not overstate to the firm — say what you know and what you don't.
