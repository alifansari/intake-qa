"use client";
import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PageShell, PageHeader } from "@/components/page";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getSupabaseBrowser } from "@/lib/supabase/client";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/queue";
  const [email, setEmail] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const supabase = getSupabaseBrowser();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) {
      setError("Supabase is not configured yet.");
      return;
    }
    setPending(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setPending(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <Card>
      <CardContent className="py-6">
        {!supabase ? (
          <p className="text-sm text-muted">
            Sign-in requires a connected Supabase project. Set the Supabase environment variables
            to enable login.
          </p>
        ) : sent ? (
          <p className="text-sm text-ink">
            Check your email for a sign-in link. You can close this tab once you click it.
          </p>
        ) : (
          <form onSubmit={submit} className="flex flex-col gap-3">
            <label className="text-sm text-ink" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfirm.com"
              className="rounded-sm border border-line-strong bg-paper p-2 text-sm text-ink"
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

export default function LoginPage() {
  return (
    <PageShell>
      <PageHeader kicker="Pilot control" title="Sign in" />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </PageShell>
  );
}
