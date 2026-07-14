"use client";

// The Team roster + management surface. Fetches the firm-scoped member list from
// /api/desk/team and, for admins, lets them change a member's role or add a
// teammate. Everything here is convenience — the API re-verifies admin on every
// mutation, so a non-admin who reaches this component still cannot change
// anything. Calm and minimal, matching the rest of the desk.
//
// COMPLIANCE: adding a teammate never emails anyone. The one-time temp password
// is shown to the admin here to pass along by hand — no message auto-sends.

import * as React from "react";
import { Button } from "@/components/ui/button";

type Role = "agent" | "manager" | "admin";
const ROLE_LABELS: Record<Role, string> = { agent: "Agent", manager: "Manager", admin: "Admin" };
const ROLE_OPTIONS: Role[] = ["agent", "manager", "admin"];

interface Member {
  user_id: string;
  email: string | null;
  role: string;
  created_at: string | null;
  last_active_at: string | null;
}

interface AddResult {
  email: string;
  role: Role;
  existing_account: boolean;
  password: string | null;
  signin_url: string;
}

function normalize(role: string): Role {
  return role === "agent" || role === "manager" || role === "admin" ? role : "admin";
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function TeamClient({ canManage }: { canManage: boolean }) {
  const [members, setMembers] = React.useState<Member[] | null>(null);
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const r = await fetch("/api/desk/team", { cache: "no-store" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "could not load your team");
      setMembers((data.members as Member[]) ?? []);
      setCurrentUserId((data.current_user_id as string | null) ?? null);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not load your team");
      setMembers([]);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const adminCount = (members ?? []).filter((m) => normalize(m.role) === "admin").length;

  return (
    <div className="flex flex-col gap-4">
      {canManage ? <AddTeammate onAdded={load} /> : null}

      <section className="rounded-card border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink">Members</h2>
        {error ? <p className="mt-3 text-sm text-red">{error}</p> : null}
        {members === null ? (
          <p className="mt-4 text-sm text-ink-muted">Loading…</p>
        ) : members.length === 0 ? (
          <p className="mt-4 text-sm text-ink-muted">
            No members to show yet.{canManage ? " Add your first teammate above." : ""}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-ink-muted">
                  <th className="py-2 text-left">Person</th>
                  <th className="py-2 text-left">Role</th>
                  <th className="py-2 text-left">Joined</th>
                  <th className="py-2 text-left">Last activity</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => (
                  <MemberRow
                    key={m.user_id}
                    member={m}
                    canManage={canManage}
                    isSelf={m.user_id === currentUserId}
                    isLastAdmin={normalize(m.role) === "admin" && adminCount <= 1}
                    onChanged={load}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-4 text-xs text-faint">
          Roles control what each person sees on the desk. A firm always keeps at least one admin.
        </p>
      </section>
    </div>
  );
}

function MemberRow({
  member,
  canManage,
  isSelf,
  isLastAdmin,
  onChanged,
}: {
  member: Member;
  canManage: boolean;
  isSelf: boolean;
  isLastAdmin: boolean;
  onChanged: () => Promise<void>;
}) {
  const current = normalize(member.role);
  const [role, setRole] = React.useState<Role>(current);
  const [saving, setSaving] = React.useState(false);
  const [rowError, setRowError] = React.useState<string | null>(null);

  React.useEffect(() => setRole(current), [current]);

  const dirty = role !== current;

  async function save() {
    setSaving(true);
    setRowError(null);
    try {
      const r = await fetch("/api/desk/team", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: member.user_id, role }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "could not change role");
      await onChanged();
    } catch (e) {
      setRowError(e instanceof Error ? e.message : "could not change role");
      setRole(current);
    } finally {
      setSaving(false);
    }
  }

  const label = member.email ?? member.user_id;

  return (
    <tr className="border-b border-hairline last:border-0 align-top">
      <td className="py-3 pr-3">
        <span className="font-medium text-ink break-all">{label}</span>
        {isSelf ? <span className="ml-2 text-xs text-faint">(you)</span> : null}
        {rowError ? <div className="mt-1 text-xs text-red">{rowError}</div> : null}
      </td>
      <td className="py-3 pr-3">
        {canManage ? (
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={role}
              disabled={saving}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-sm border border-line-strong bg-paper px-2 py-1.5 text-sm text-ink disabled:opacity-50"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
            {dirty ? (
              <Button variant="primary" size="sm" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </Button>
            ) : null}
            {isLastAdmin ? (
              <span className="text-xs text-faint">only admin</span>
            ) : null}
          </div>
        ) : (
          <span className="text-ink-muted">{ROLE_LABELS[current]}</span>
        )}
      </td>
      <td className="py-3 pr-3 text-ink-muted">{fmtDate(member.created_at)}</td>
      <td className="py-3 text-ink-muted">{fmtDate(member.last_active_at)}</td>
    </tr>
  );
}

function AddTeammate({ onAdded }: { onAdded: () => Promise<void> }) {
  const [open, setOpen] = React.useState(false);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Role>("agent");
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<AddResult | null>(null);
  const [copied, setCopied] = React.useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const r = await fetch("/api/desk/team", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "could not add teammate");
      setResult(data as AddResult);
      await onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not add teammate");
    } finally {
      setPending(false);
    }
  }

  if (result) {
    const handoff = result.existing_account
      ? `You've been added to the Intake QA desk.\nSign in at ${result.signin_url}\nEmail: ${result.email}\nUse your existing password.`
      : `You've been added to the Intake QA desk.\nSign in at ${result.signin_url}\nEmail: ${result.email}\nTemporary password: ${result.password ?? ""}\n(Change it after you sign in.)`;
    return (
      <section className="rounded-card border border-hairline bg-surface p-5">
        <h2 className="font-display text-lg font-semibold text-ink">{result.email} is on your team.</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Added as {ROLE_LABELS[result.role]}.{" "}
          {result.existing_account
            ? "They already had an account, so no new password was issued — they sign in as they always have."
            : "The temporary password below is shown ONCE and isn't stored anywhere readable."}
        </p>
        <pre className="mt-4 max-h-72 overflow-auto whitespace-pre-wrap rounded-base border border-hairline bg-canvas p-4 text-xs leading-relaxed text-ink">
          {handoff}
        </pre>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            size="sm"
            onClick={async () => {
              await navigator.clipboard.writeText(handoff).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            {copied ? "Copied ✓" : "Copy sign-in details"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResult(null);
              setEmail("");
              setRole("agent");
              setOpen(false);
            }}
          >
            Done
          </Button>
        </div>
        <p className="mt-3 text-xs text-faint">
          Nothing was emailed. Pass these sign-in details to your teammate yourself.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-card border border-hairline bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Add a teammate</h2>
        {!open ? (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Add teammate
          </Button>
        ) : null}
      </div>
      {open ? (
        <form onSubmit={submit} className="mt-4 flex max-w-xl flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Their email
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
              placeholder="jordan@yourfirm.com"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">
            Their role
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="rounded-sm border border-line-strong bg-paper p-2 text-sm"
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="text-sm text-red">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Button variant="primary" type="submit" disabled={pending}>
              {pending ? "Adding…" : "Create account"}
            </Button>
            <Button variant="outline" type="button" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-faint">
            This creates their sign-in and puts them on your firm's desk. We show you a one-time
            password to pass along — nothing is emailed automatically.
          </p>
        </form>
      ) : (
        <p className="mt-2 text-sm text-ink-muted">
          Create a sign-in for someone on your intake team and choose what they can see.
        </p>
      )}
    </section>
  );
}
