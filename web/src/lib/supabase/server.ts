import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

// Server-side Supabase client bound to the request's cookies (so auth sessions
// work in Server Components, Route Handlers, and Server Actions). Returns null
// when Supabase is not configured, so callers can show the "connect" state
// instead of crashing.
export async function getSupabaseServer(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // In Server Components cookie writes throw; ignore (middleware/route
        // handlers refresh the session). This keeps read-only renders working.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          /* no-op in a read-only render context */
        }
      },
    },
  });
}

// The signed-in user, or null. Never throws.
export async function getCurrentUser() {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
