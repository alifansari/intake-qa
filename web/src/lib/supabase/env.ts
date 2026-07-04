// Supabase configuration gate. The hosted product needs a Supabase project; the
// demo/pilot does not. Every Supabase code path checks isSupabaseConfigured()
// first and degrades gracefully (returns null / shows a "connect Supabase" state)
// when the env vars are absent — so the deployed dashboards never break before a
// project exists. Secrets come ONLY from env (CLAUDE.md hard rule).

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
