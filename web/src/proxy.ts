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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  // Only the desk work screens require sign-in.
  matcher: ["/desk/:path*"],
};
