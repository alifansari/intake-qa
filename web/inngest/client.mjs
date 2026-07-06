// Inngest client — durable job runner. Reads INNGEST_EVENT_KEY + INNGEST_SIGNING_KEY
// from the environment automatically (set in Vercel). id identifies this app to
// Inngest Cloud.
import { Inngest } from "inngest";

export const inngest = new Inngest({ id: "intake-qa" });
