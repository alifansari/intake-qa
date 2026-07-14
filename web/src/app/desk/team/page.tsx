// The Team page — who is on this firm's intake desk and what they can do.
// Manager + admin can VIEW the roster; only an admin can change roles or add a
// teammate (the client hides every control when can_manage is false, and the
// API re-checks admin on every mutation, so the gate is enforced server-side —
// the UI just avoids showing dead buttons).
//
// A plain agent who guesses this URL gets a gentle pointer back to their queue,
// never a 403 wall — the same pattern the team scorecard uses.
import Link from "next/link";
import { resolveDeskFirm } from "@/lib/desk/firm";
import { getUserRole, isManagerRole, isAdminRole } from "@/lib/desk/roles";
import { TeamClient } from "./team-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your team — Intake QA" };

export default async function TeamPage() {
  let canView = true; // graceful default (single-user firm / no DB → owner)
  let canManage = true;
  let firmName: string | null = null;

  const store = await import("../../../../ingest/store.mjs");
  if (store.pipelineDbConfigured()) {
    let db;
    try {
      db = await store.openPipelineDb();
      const firm = await resolveDeskFirm(db, store.listFirms);
      if (firm) {
        firmName = firm.name;
        const role = await getUserRole(db, firm.id);
        canView = isManagerRole(role);
        canManage = isAdminRole(role);
      }
    } catch {
      // role resolution failed — fall back to the safe owner default.
    } finally {
      await store.closePipelineDb(db);
    }
  }

  if (!canView) return <GatedForManagers />;

  return (
    <div>
      <div className="mb-6">
        <p className="eyebrow">The desk{firmName ? ` · ${firmName}` : ""}</p>
        <h1 className="mt-1 font-display text-2xl font-semibold text-ink">Your team</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-ink-muted">
          Everyone who works this firm's desk, and what each person can do. An{" "}
          <span className="font-medium text-ink">agent</span> works the callback queue and their
          own calls; a <span className="font-medium text-ink">manager</span> also sees the team
          scorecard; an <span className="font-medium text-ink">admin</span> can change settings and
          manage this list.
        </p>
      </div>
      <TeamClient canManage={canManage} />
    </div>
  );
}

function GatedForManagers() {
  return (
    <div className="mx-auto max-w-[560px] rounded-card border border-hairline bg-surface p-8 text-center">
      <h1 className="font-display text-xl font-semibold text-ink">Team management is for managers</h1>
      <p className="mt-2 text-sm text-ink-muted">
        This page manages who is on your firm's desk. Your manager or admin can see it. Your job is
        the callback queue — the callers worth phoning back are waiting there.
      </p>
      <Link
        href="/desk"
        className="mt-5 inline-block rounded-pill bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover"
      >
        Back to your callbacks →
      </Link>
    </div>
  );
}
