"use client";

// Report actions (Stage 5): logs a view on mount, offers a "Save as PDF" that
// prints the page (a real per-token PDF of the firm's own data, no server compose
// needed) and logs a download. Best-effort beacons — never block the page.

import { useEffect } from "react";

function beacon(token: string, event_type: "view" | "download") {
  try {
    fetch("/api/audit/access", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, event_type }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function ReportActions({ token }: { token: string }) {
  useEffect(() => {
    beacon(token, "view");
  }, [token]);

  return (
    <div className="no-print mb-6 flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={() => {
          beacon(token, "download");
          window.print();
        }}
        className="rounded-pill bg-accent px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Save as PDF
      </button>
      <span className="text-xs text-faint">
        Prints a clean copy you can forward. Audio isn&apos;t stored — every quote is timestamped to
        your original recording.
      </span>
    </div>
  );
}
