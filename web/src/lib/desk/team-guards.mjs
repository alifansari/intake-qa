// Pure, I/O-free guards for the Team member-management flow (add teammate /
// change role). No `server-only` import so the two rules that MUST NOT drift —
// role validation and the last-admin lockout guard — are unit-testable against
// both backends without a database.
//
// The desk's READ/gating path lives in lib/desk/roles.ts (normalizeRole,
// isManagerRole, isAdminRole). These mirror that normalization for the WRITE
// path and add the mutation-only guards. Keep the two in lock-step: the three
// real roles are 'agent' | 'manager' | 'admin', and anything legacy/blank/
// unknown normalizes to 'admin' (we never lock anyone out of a firm they own).

export const TEAM_ROLES = ["agent", "manager", "admin"];

// Same mapping as roles.ts normalizeRole. Reads tolerate legacy values; this is
// used only to REASON about the current membership (e.g. counting admins).
export function normalizeRole(raw) {
  return raw === "agent" || raw === "manager" || raw === "admin" ? raw : "admin";
}

// Is `role` a value we are allowed to WRITE? Only the three real roles may ever
// be persisted — never legacy 'operator', a blank, or a typo — even though the
// read path tolerates them for backward compatibility.
export function isAssignableRole(role) {
  return role === "agent" || role === "manager" || role === "admin";
}

// Effective admin count in a membership list (roles normalized first, so a
// legacy 'operator'/blank owner still counts as the admin they are).
export function countAdmins(members) {
  let n = 0;
  for (const m of members || []) {
    if (normalizeRole(m.role) === "admin") n += 1;
  }
  return n;
}

// The lockout guard. Would changing `targetUserId` to `newRole` leave the firm
// with ZERO admins? `members` is the CURRENT membership: [{ user_id, role }].
// Returns true when the change must be REFUSED (demoting the last admin).
//
// It only fires when we are actually demoting an admin OUT of admin; promoting,
// or changing a non-admin, is always allowed. An unknown target is not our
// lockout case (the caller handles "not a member" as a 404).
export function wouldRemoveLastAdmin(members, targetUserId, newRole) {
  const list = members || [];
  const target = list.find((m) => String(m.user_id) === String(targetUserId));
  if (!target) return false;
  const wasAdmin = normalizeRole(target.role) === "admin";
  const staysAdmin = normalizeRole(newRole) === "admin";
  if (!wasAdmin || staysAdmin) return false;
  // Demoting an admin: allowed only if at least one OTHER admin remains.
  return countAdmins(list) <= 1;
}

// A one-time temporary password for a freshly-created teammate account. Mirrors
// the alphabet + length used by the studio onboarding path (no ambiguous
// glyphs). Shown to the admin ONCE and never stored readable.
const PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";

export function generateTempPassword() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += PASSWORD_ALPHABET[bytes[i] % PASSWORD_ALPHABET.length];
  return out;
}
