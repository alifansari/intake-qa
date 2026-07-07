import "server-only";

// Published false-alarm rate — the SAME source /calibration renders (P0-D / §IV).
// False-alarm rate = false_alarms / (correct_flags + false_alarms) = 1 - precision.
// Returned as a rounded percentage + the date it was computed, for the deliverable
// footer line. Never throws: on any failure it returns nulls so the footer falls
// back to "published at plaintiffops.com/calibration".

import { getReconciledCalls } from "./data";
import { calibrationCounts } from "./metrics";

export async function publishedFalseAlarmRate(): Promise<{ ratePct: number | null; updatedDate: string | null }> {
  try {
    const rows = await getReconciledCalls();
    const c = calibrationCounts(rows);
    const denom = c.correctFlags + c.falseAlarms;
    if (denom === 0) return { ratePct: null, updatedDate: null };
    const ratePct = Math.round((c.falseAlarms / denom) * 100);
    // "Updated" = today, since this is computed live from the same ground-truth set.
    const now = new Date();
    const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const updatedDate = `${MONTHS[now.getUTCMonth()]} ${now.getUTCDate()}, ${now.getUTCFullYear()}`;
    return { ratePct, updatedDate };
  } catch {
    return { ratePct: null, updatedDate: null };
  }
}
