"use client";

// Email capture on the Leak Audit report. Reuses /api/demo/lead (extended with
// session_token) so the operator console can follow up. Test-mode-safe: the API
// only transmits when Resend is configured AND TEST_MODE is off; otherwise it
// just records the capture.

import { useState } from "react";

export function AuditEmailCapture({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      const r = await fetch("/api/demo/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, session_token: token }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? "Please enter a valid email.");
      setSent(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Something went wrong.");
    }
  }

  if (sent) {
    return (
      <p className="text-sm text-green">
        Sent — a copy of this audit is on its way, and we’ll be in touch.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@yourfirm.com"
        className="w-64 rounded-sm border border-line bg-paper px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-sm bg-navy px-4 py-2 text-sm font-semibold text-white"
      >
        Email me this audit
      </button>
      {err && <span className="w-full text-sm text-red">{err}</span>}
    </form>
  );
}
