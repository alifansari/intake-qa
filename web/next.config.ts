import type { NextConfig } from "next";
import { DESK_REDIRECTS } from "./src/lib/desk-redirects.mjs";

const nextConfig: NextConfig = {
  // This app lives in a subfolder of the CLI repo (which has its own lockfile);
  // pin Turbopack's workspace root to this dir so local dev resolves here.
  // NOTE: do NOT set `outputFileTracingRoot` — on Vercel (Root Directory = web)
  // it makes the builder look for output at the wrong path and the deploy fails
  // post-build with "ENOENT ... .next/package.json". Vercel sets the root itself.
  turbopack: { root: __dirname },
  // Keep the Anthropic SDK OUT of the webpack bundle and in the function's
  // node_modules instead. The scoring engine is loaded as an EXTERNAL runtime
  // module (see ingest/demo.mjs importEngine) and does `import "@anthropic-ai/sdk"`
  // itself, so it must resolve the SDK from node_modules — this ensures the SDK
  // (and its deps) ship in the serverless bundle for both the engine and the
  // analysis passes to share. Same reasoning for `assemblyai`, which the engine's
  // transcribe.js imports ("import { AssemblyAI } from 'assemblyai'").
  serverExternalPackages: ["@anthropic-ai/sdk", "assemblyai", "twilio"],
  // The JsonFileRepository reads seed JSON from ./data at request time. Ensure
  // those files are traced into the serverless bundle so the demo has data on
  // Vercel (where the CLI's ../output folder does NOT ship).
  outputFileTracingIncludes: {
    // Seed JSON read at request time by the JsonFileRepository, the demo fee
    // config, and the vendored scoring engine + its data files (see
    // scripts/vendor-engine.mjs). Without these the /api/demo pipeline can't find
    // the prompt/config/example files on Vercel and every demo stalls at "queued".
    "/**": ["./data/**/*.json", "./demo-config.json", "./.engine/**/*"],
  },
  // 301 map — retire the old human answering-service marketing while PRESERVING
  // the concierge value. All permanent (301) redirects.
  async redirects() {
    return [
      // The old "answering service / full coverage" pitch becomes the pilot
      // white-glove concierge offer — keep that value, don't 404 it.
      { source: "/answering-service", destination: "/concierge", permanent: true },
      { source: "/full-coverage", destination: "/concierge", permanent: true },
      { source: "/coverage", destination: "/concierge", permanent: true },
      { source: "/virtual-receptionist", destination: "/concierge", permanent: true },
      // Old pricing surfaces (including the retired $2,000/$5,000 tiers) -> /pricing.
      { source: "/plans", destination: "/pricing", permanent: true },
      { source: "/pricing-old", destination: "/pricing", permanent: true },
      // Everything else from the old answering-service marketing -> new homepage.
      { source: "/answering", destination: "/", permanent: true },
      { source: "/intake-service", destination: "/", permanent: true },
      { source: "/services", destination: "/", permanent: true },
      { source: "/home", destination: "/", permanent: true },
      // The old 5-step wizard is retired: /apply is the ONE signup story
      // (provisioning happens in /studio/onboard-firm).
      { source: "/onboard", destination: "/apply", permanent: true },
      // Consolidation (item 3): the ~7 prior internal tabs -> four desk screens.
      ...DESK_REDIRECTS,
    ];
  },
};

export default nextConfig;
