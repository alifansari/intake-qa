"use client";

// Buy button for the pricing page. POSTs the plan to /api/checkout and redirects
// to the Stripe Checkout URL it returns. In TEST_MODE / no keys the API returns a
// simulated /welcome URL, so the whole flow is clickable with no Stripe account.
//
// The audit session token (if the visitor came from a completed audit) is read
// from the ?audit= query param or sessionStorage and passed as client_reference_id
// so the webhook can stitch the payer back to their audit.

import { useCallback, useState } from "react";

export function CheckoutButton({
  plan,
  label,
  className,
}: {
  plan: "core" | "pro" | "charter";
  label: string;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let auditToken: string | null = null;
      if (typeof window !== "undefined") {
        const q = new URLSearchParams(window.location.search).get("audit");
        auditToken = q || window.sessionStorage.getItem("audit_token") || null;
      }
      const r = await fetch("/api/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan, auditToken }),
      });
      const data = await r.json();
      if (!r.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
        return;
      }
      window.location.href = data.url as string;
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [plan]);

  return (
    <div>
      <button type="button" onClick={go} disabled={loading} className={className}>
        {loading ? "Starting checkout…" : label}
      </button>
      {error && <p className="mt-2 text-xs text-alert">{error}</p>}
    </div>
  );
}
