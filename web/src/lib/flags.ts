// TypeScript entry point for feature flags. Single source of truth lives in
// web/analysis/flags.mjs (pure .mjs so the engine modules and node:test can import
// it too); this re-export just gives the app a clean "@/lib/flags" path with types.
export { isSampledReviewEnabled } from "../../analysis/flags.mjs";
