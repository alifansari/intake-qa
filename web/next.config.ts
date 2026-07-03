import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This app lives in a subfolder of the CLI repo (which has its own lockfile);
  // pin the workspace root to this dir so tracing and Turbopack resolve here.
  turbopack: { root: __dirname },
  outputFileTracingRoot: __dirname,
  // The JsonFileRepository reads seed JSON from ./data at request time. Ensure
  // those files are traced into the serverless bundle so the demo has data on
  // Vercel (where the CLI's ../output folder does NOT ship).
  outputFileTracingIncludes: {
    "/**": ["./data/**/*.json"],
  },
};

export default nextConfig;
