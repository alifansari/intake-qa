// Chart & UI colors, kept in one client-safe module so charts and legends agree.
// These mirror the CSS tokens in globals.css (and lib/report.js BAND_COLORS).
export const COLORS = {
  navy: "#1a4d8f",
  navyDeep: "#143a6b",
  red: "#b00020",
  amber: "#b26a00",
  green: "#1a7f37",
  ink: "#1a1a1a",
  muted: "#6b6b6b",
  line: "#e2e2e2",
} as const;

import type { ScoreBand } from "./reconcile";

// Score-band ramp: intervention (red) -> strong (navy). Sequential, few colors.
export const BAND_COLOR: Record<ScoreBand, string> = {
  "0-39": "#b00020",
  "40-59": "#c05621",
  "60-79": "#b26a00",
  "80-100": "#1a4d8f",
};
