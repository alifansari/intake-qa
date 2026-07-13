import "server-only";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { getSupabaseServer } from "@/lib/supabase/server";

// ---------------------------------------------------------------------------
// The founder-only guard (layer B of defense in depth). EVERY studio server
// action, route handler, and server component MUST call one of these before
// touching studio data. It re-validates the session with getUser() (never
// getSession()) AND checks the FOUNDER_EMAIL allowlist. Middleware (layer A)
// and Postgres RLS (layer C) back it up, but code must never assume the request
// already passed middleware.
//
// Fails closed: if Supabase is unconfigured or FOUNDER_EMAIL is unset, no one is
// the founder.
// ---------------------------------------------------------------------------

export interface FounderContext {
  supabase: SupabaseClient;
  user: User;
  email: string;
}

function founderEmail(): string | null {
  const e = process.env.FOUNDER_EMAIL?.trim().toLowerCase();
  return e ? e : null;
}

// Returns the founder context, or null if the caller is not the founder (or the
// stack isn’t configured). Never throws — for callers that want to branch.
export async function getFounderContext(): Promise<FounderContext | null> {
  const supabase = await getSupabaseServer();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const allow = founderEmail();
  const email = user.email?.trim().toLowerCase();
  if (!allow || !email || email !== allow) return null;

  return { supabase, user, email };
}

// For Server Components / page loaders: redirect a non-founder to the studio
// login instead of rendering. Returns the context when authorized.
export async function requireFounderPage(): Promise<FounderContext> {
  const ctx = await getFounderContext();
  if (!ctx) redirect("/login?error=not_authorized");
  return ctx;
}

// For Route Handlers: returns the context, or a 403 Response to return directly.
// Usage: const gate = await requireFounderRoute(); if (gate instanceof Response) return gate;
export async function requireFounderRoute(): Promise<FounderContext | Response> {
  const ctx = await getFounderContext();
  if (!ctx) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }
  return ctx;
}

// For Server Actions: throws so the action aborts. Server Actions can’t return a
// Response; a thrown error is the correct hard stop.
export async function requireFounderAction(): Promise<FounderContext> {
  const ctx = await getFounderContext();
  if (!ctx) throw new Error("forbidden: studio is founder-only");
  return ctx;
}

// Is the studio available at all in this environment? (Supabase configured AND a
// FOUNDER_EMAIL set.) Used to render an honest "not configured" state instead of
// a broken page — the same graceful-degradation pattern the rest of the app uses.
export function isStudioConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
      founderEmail(),
  );
}
