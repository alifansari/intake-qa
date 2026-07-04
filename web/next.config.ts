import type { NextConfig } from "next";

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
  // analysis passes to share.
  serverExternalPackages: ["@anthropic-ai/sdk"],
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
};

export default nextConfig;
