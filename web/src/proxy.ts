import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Gate the /desk work screens behind a Supabase session. Marketing pages, the free
// Intake Quality Audit funnel, the public demo, and the token-shared Leak Report
// stay open (see matcher). If Supabase isn't configured (local dev without env),
// we do NOT gate — the pilot/demo must keep working before a project exists.
//
// This is the standard @supabase/ssr proxy (Next 16's renamed middleware): it also
// refreshes the auth cookie on every matched request so Server Components see a live
// session.
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let response = NextResponse.next({ request });

  // Not configured → don't lock anyone out.
  if (!url || !anon) return response;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Never use getSession() for a protection decision — getUser() re-validates the
  // JWT with Supabase (compliance / security requirement for the founder tool).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isStudio = path === "/studio" || path.startsWith("/studio/");
  // /admin is the operator console — founder-only, same as /studio.
  const isAdmin = path === "/admin" || path.startsWith("/admin/");

  // /studio/login is a legacy stub that redirects to /login — let it through so
  // old bookmarks and emailed links keep working without a redirect loop.
  if (path === "/studio/login") return response;

  if (!user) {
    // ONE sign-in screen for everyone (/login, password + magic link). The
    // founder simply gets sent on to /studio via ?next=; /studio/login still
    // works as a magic-link fallback but nothing redirects there anymore.
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  // FOUNDER-ONLY gate (layer A of defense in depth): /studio/* is reachable ONLY
  // by the single FOUNDER_EMAIL. Any other signed-in user is bounced to the
  // studio login with a not-authorized flag (never a 200). The same check is
  // ALSO enforced in every studio server action/route (layer B) and in Postgres
  // RLS (layer C). Fail closed: if FOUNDER_EMAIL is unset, no one is the founder.
  if (isStudio || isAdmin) {
    const founderEmail = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
    const userEmail = user.email?.trim().toLowerCase();
    if (!founderEmail || !userEmail || userEmail !== founderEmail) {
      const denied = new URL("/login", request.url);
      denied.searchParams.set("error", "not_authorized");
      return NextResponse.redirect(denied);
    }
  }

  return response;
}

export const config = {
  // The desk work screens and the founder-only Spot Check Studio require sign-in.
  // (/studio also requires the FOUNDER_EMAIL allowlist, checked above.)
  // /billing and /settings/integrations also self-gate in their pages; listing
  // them here adds defense in depth and keeps their auth cookies refreshed.
  matcher: [
    "/desk/:path*",
    "/studio/:path*",
    "/admin/:path*",
    "/billing",
    "/settings/integrations",
  ],
};
