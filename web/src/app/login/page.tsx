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

// Only allow same-origin, path-only redirect targets. An absolute or
// protocol-relative `next` (e.g. //evil.com) would let a sign-in link phish.
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/desk/queue";
  return raw;
}

function LoginForm() {
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  // Set when someone signed-in but not on the founder allowlist tried to open
  // the studio — explain instead of silently bouncing them.
  const errorParam = params.get("error");
  const notAuthorized = errorParam === "not_authorized";
  // Any other error (e.g. an expired magic link from the callback) is shown as text.
  const linkError = errorParam && !notAuthorized ? errorParam : null;
  const [mode, setMode] = React.useState<"password" | "magic">("password");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [sent, setSent] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  const supabase = getSupabaseBrowser();

  // Password sign-in: browsers offer to save the credentials (autoComplete hints),
  // and it needs no email, so it works even while the email limit is cooling down.
  async function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return setError("Supabase is not configured yet.");
    setPending(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setPending(false);
    if (error) setError(error.message);
    else {
      // First-party sign-in event (password flow never touches our server, so
      // report it here). keepalive + no await: never delays or blocks the login.
      try {
        void fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event: "sign_in", method: "password" }),
          keepalive: true,
        });
      } catch { /* best-effort */ }
      window.location.assign(next); // full nav so the server sees the session cookie
    }
  }

  // Magic link fallback (no password): emails a one-time sign-in link.
  async function submitMagic(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!supabase) return setError("Supabase is not configured yet.");
    setPending(true);
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    // shouldCreateUser:false — accounts are provisioned by the founder during
    // onboarding. Without this, Supabase's default silently creates a user for
    // ANY email typed here, and a member-less session could reach the desk.
    const { error } = await supabase.auth.signInWithOtp({
      email,
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
            Sign-in requires a connected Supabase project. Set the Supabase environment variables to
            enable login.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="py-6">
        {notAuthorized ? (
          <p className="mb-4 rounded-sm border border-line-strong bg-paper px-3 py-2 text-xs text-ink">
            The studio is limited to the founder account. Sign in with that account to continue,
            or head to <a href="/desk/queue" className="underline">your desk</a>.
          </p>
        ) : null}
        {linkError ? (
          <p className="mb-4 rounded-sm border border-line-strong bg-paper px-3 py-2 text-xs text-ink">
            That sign-in link didn&apos;t work (it may have expired or already been used). Enter your
            email below for a fresh one, or use your password.
          </p>
        ) : null}
        {mode === "password" ? (
          // Single <form> with username + password fields so the browser's
          // password manager recognizes it and offers to save the credentials.
          <form onSubmit={submitPassword} className="flex flex-col gap-3" autoComplete="on">
            <label className="text-sm text-ink" htmlFor="email">
              Work email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfirm.com"
              className={inputClass}
            />
            <label className="text-sm text-ink" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              className={inputClass}
            />
            {error ? <p className="text-xs text-red">{error}</p> : null}
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
            <button
              type="button"
              onClick={() => { setMode("magic"); setError(null); }}
              className="mt-1 self-start text-xs text-muted underline hover:text-ink"
            >
              Prefer a one-time email link instead?
            </button>
          </form>
        ) : sent ? (
          <p className="text-sm text-ink">
            Check your email for a sign-in link. You can close this tab once you click it.
          </p>
        ) : (
          <form onSubmit={submitMagic} className="flex flex-col gap-3">
            <label className="text-sm text-ink" htmlFor="email-magic">
              Work email
            </label>
            <input
              id="email-magic"
              name="email"
              type="email"
              required
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@yourfirm.com"
              className={inputClass}
            />
            {error ? <p className="text-xs text-red">{error}</p> : null}
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Sending…" : "Email me a sign-in link"}
            </Button>
            <button
              type="button"
              onClick={() => { setMode("password"); setError(null); }}
              className="mt-1 self-start text-xs text-muted underline hover:text-ink"
            >
              Sign in with a password instead
            </button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <PageShell>
      <PageHeader kicker="Your desk" title="Sign in" />
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
      <p className="mt-4 max-w-[56ch] text-xs text-faint">
        Your account is set up for you when you join the beta. Check your welcome email
        for the sign-in details, or use &ldquo;email me a sign-in link&rdquo; above. No account
        yet?{" "}
        <a href="/apply" className="underline hover:text-ink">Apply for the beta</a> &middot;
        questions:{" "}
        <a href="mailto:ali@plaintiffops.com" className="underline hover:text-ink">ali@plaintiffops.com</a>
      </p>
    </PageShell>
  );
}
