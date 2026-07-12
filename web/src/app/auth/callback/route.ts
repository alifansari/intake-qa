import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { recordProductEvent } from "@/lib/events";

export const runtime = "nodejs";

// Magic-link landing: Supabase redirects here with a one-time `code`. We exchange
// it for a session (cookies are set by the SSR client), then send the user on to
// their intended page. If Supabase isn't configured, just go home.
// Only same-origin, path-only targets — never an absolute/protocol-relative URL
// (an emailed sign-in link is a phishing vector otherwise).
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/desk/queue";
  return raw;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));

  // Surface an expired/used link honestly instead of bouncing to a blank form.
  const errParam = url.searchParams.get("error_description") ?? url.searchParams.get("error");
  if (errParam) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(errParam)}`, url.origin));
  }

  const supabase = await getSupabaseServer();
  if (supabase && code) {
    const { error, data } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url.origin));
    }
    // First-party event log (best-effort, never blocks the redirect). Magic-link
    // sign-ins land here; password sign-ins report via POST /api/events.
    await recordProductEvent({
      event: "sign_in",
      actor: data?.user?.email ?? null,
      context: { method: "magic_link" },
    });
  }
  return NextResponse.redirect(new URL(next, url.origin));
}
