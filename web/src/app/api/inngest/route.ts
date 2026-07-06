// Inngest serve endpoint. Inngest Cloud discovers + invokes the durable functions
// through this route (auth via INNGEST_SIGNING_KEY from the environment).
import { serve } from "inngest/next";
import { inngest } from "../../../../inngest/client.mjs";
import { functions } from "../../../../inngest/functions.mjs";

export const runtime = "nodejs";

export const { GET, POST, PUT } = serve({ client: inngest, functions });
