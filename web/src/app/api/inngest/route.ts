// Inngest serve endpoint. Inngest Cloud discovers + invokes the durable functions
// through this route (auth via INNGEST_SIGNING_KEY from the environment).
import { serve } from "inngest/next";
import { inngest } from "../../../../inngest/client.mjs";
import { functions } from "../../../../inngest/functions.mjs";

export const runtime = "nodejs";
// Scoring a real call (transcribe + Claude) runs ~95s — far past the default
// serverless limit. The demo processors already set this; the real pipeline
// route must too, or Inngest steps die mid-scoring.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({ client: inngest, functions });
