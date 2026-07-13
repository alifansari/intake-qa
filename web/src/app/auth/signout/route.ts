import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";

export const runtime = "nodejs";

// Sign the user out (clears the Supabase session cookies) and return to /login.
// POST-only so a link prefetch or a cross-site GET can’t log someone out (CSRF-safe).
export async function POST(request: Request) {
  const supabase = await getSupabaseServer();
  if (supabase) await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
