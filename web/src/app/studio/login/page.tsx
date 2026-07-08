"use client";
import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase/client";

const inputClass =
  "rounded-sm border border-line-strong bg-paper p-2 text-sm text-ink focus:border-accent focus:outline-none";

// Minimal founder-only sign-in. Magic link only (reuses the shared /auth/callback
// code-exchange route, sending the founder on to /studio). The FOUNDER_EMAIL
// allowlist is enforced in middleware + every server route — this page just
// authenticates; it does not decide authorization.
function StudioLoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/studio";
  const notAuthorized = params.get("error") === "not_authorized";
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const supabase = getSupabaseBrowser();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return setError("Supabase is not configured yet.");
    setPending(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // Never auto-create an account here — the founder account is provisioned
      // manually and public sign-ups are disabled in Supabase.
      options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
    });
    setPending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  if (!supabase) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted">
            The Studio requires a connected Supabase project and a FOUNDER_EMAIL. Set the
            environment variables to enable sign-in.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        {notAuthorized ? (
          <p className="mb-4 rounded-sm border border-red/30 bg-red-tint px-3 py-2 text-xs text-red">
            That account is not authorized for the Studio. This tool is founder-only.
          </p>
        ) : null}
        {sent ? (
          <p className="text-sm text-ink">
            Check your email for a one-time sign-in link. You can close this tab once you click
            it.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="text-sm text-ink" htmlFor="studio-email">
              Founder email
            </label>
            <input
              id="studio-email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@plaintiffops.com"
              className={inputClass}
            />
            {error ? <p className="text-xs text-red">{error}</p> : null}
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Sending…" : "Email me a sign-in link"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function StudioLoginPage() {
  return (
    <PageShell>
      <PageHeader kicker="Spot Check Studio" title="Founder sign-in" />
      <Suspense fallback={null}>
        <StudioLoginForm />
      </Suspense>
      <p className="mt-4 max-w-[52ch] text-xs text-faint">
        This is an internal, founder-only tool. There is no public sign-up.
      </p>
    </PageShell>
  );
}
