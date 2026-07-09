// Zero-login rescue-packet delivery (module 4 delivery + module 10 CRM leg).
//
// The packet is PUSHED to the firm — email + SMS to the designated staffer +
// a task in the firm's CRM. The dashboard is secondary. Everything here goes
// TO THE FIRM'S OWN STAFF; nothing in this module can address a prospect
// (invariant a) — prospect phone numbers appear only inside the packet body
// as data for the staffer to dial.
//
// Transports are injectable and TEST_MODE-simulated (Twilio pattern): the beta
// can run end-to-end with delivery simulated and logged.

import { markPacketDelivered } from "../beta/store.mjs";
import { getFirmIntegration } from "../ingest/store.mjs";
import { dispatch } from "../integrations/connector.mjs";

// Render the packet as plain text (email body / long SMS). Deterministic; the
// same content the CRM task carries.
export function renderPacketText(packet, { firmName = "your firm" } = {}) {
  const lines = [
    `Rescue packet for ${firmName} — ${packet.packet_date}`,
    `${packet.items.length} case${packet.items.length === 1 ? "" : "s"} to call back today. Each script takes ~2 minutes.`,
    "",
  ];
  for (const item of packet.items) {
    lines.push(
      `#${item.rank} — ${item.prospect_name ?? "Unknown caller"} (${item.prospect_phone ?? "no number"})`,
      `Est. value: $${Math.round((item.est_value_cents ?? 0) / 100).toLocaleString("en-US")}`,
      `What went wrong: ${item.diagnosis ?? "see call record"}`,
      item.sol_deadline ? `SOL deadline: ${item.sol_deadline} — call first` : null,
      "",
      "CALLBACK SCRIPT:",
      item.callback_script ?? "(no script)",
      "",
      "---",
      ""
    );
  }
  lines.push("Reply to this email with what happened on each callback, or log it in the app.");
  return lines.filter((l) => l != null).join("\n");
}

// Deliver one packet through every configured channel. Returns per-channel
// receipts; partial failure never blocks the other channels.
//
//   email: { send({to, subject, text}) }  — Resend seam (TEST_MODE: simulate)
//   sms:   { send({to, body}) }           — staff-notification seam. NOTE: this
//          is a notification to the CUSTOMER (firm staff), not a prospect
//          re-engagement; it deliberately does not route through
//          messaging/send.mjs, whose gates are for prospect-facing SMS. It
//          MUST only ever carry a staff recipient.
//   crm:   via integrations/connector.mjs dispatch('rescue_packet.created').
export async function deliverPacket({
  db,
  packet,
  firm,
  recipients = {}, // { email, smsPhone }
  transports = {}, // { email, sms } injectables
  env = process.env,
  now = new Date(),
}) {
  const receipts = { email: null, sms: null, crm: null };
  const testMode = env.TEST_MODE !== "false";
  const text = renderPacketText(packet, { firmName: firm?.name });

  // Email (primary channel).
  if (recipients.email) {
    if (testMode || !transports.email) {
      receipts.email = { simulated: true, to: recipients.email };
    } else {
      try {
        await transports.email.send({
          to: recipients.email,
          subject: `Today's rescue packet: ${packet.items.length} case(s) to call back`,
          text,
        });
        receipts.email = { sent: true, to: recipients.email };
      } catch (err) {
        receipts.email = { failed: true, error: String(err?.message ?? err) };
      }
    }
  }

  // SMS ping to the designated STAFFER (short pointer, not the full packet).
  // TODO(integration): A2P 10DLC applies to this number too — live sends stay
  // off until registration clears, same rule as the re-engagement pipeline.
  if (recipients.smsPhone) {
    const smsBody = `Rescue packet ready: ${packet.items.length} case(s) to call back today. Check your email for scripts.`;
    if (testMode || !transports.sms) {
      receipts.sms = { simulated: true, to: recipients.smsPhone };
    } else {
      try {
        await transports.sms.send({ to: recipients.smsPhone, body: smsBody });
        receipts.sms = { sent: true, to: recipients.smsPhone };
      } catch (err) {
        receipts.sms = { failed: true, error: String(err?.message ?? err) };
      }
    }
  }

  // CRM task via the firm's configured integration (module 10). One pluggable
  // CRM ships in Phase 1; the connector seam covers the rest later.
  const integration = await firstEnabledIntegration(db, packet.firm_id);
  if (integration) {
    receipts.crm = await dispatch({
      integration,
      event: "rescue_packet.created",
      payload: {
        packet_date: packet.packet_date,
        items: packet.items.map((i) => ({
          rank: i.rank,
          prospect_name: i.prospect_name,
          prospect_phone: i.prospect_phone,
          diagnosis: i.diagnosis,
          callback_script: i.callback_script,
          est_value_cents: i.est_value_cents,
          sol_deadline: i.sol_deadline,
        })),
      },
      now,
    }).catch((err) => ({ failed: true, error: String(err?.message ?? err) }));
  }

  await markPacketDelivered(db, packet.id, receipts, now);
  return receipts;
}

async function firstEnabledIntegration(db, firmId) {
  for (const provider of ["clio", "leaddocket", "filevine", "webhook"]) {
    const integration = await getFirmIntegration(db, firmId, provider).catch(() => null);
    if (integration && truthyFlag(integration.enabled)) return integration;
  }
  return null;
}

function truthyFlag(v) {
  return v === true || v === 1;
}
