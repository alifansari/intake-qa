// The Team member-management guards — role validation + the last-admin lockout.
// Pure logic, no I/O, so it pins the two rules a firm can never be allowed to
// break: only real roles get written, and a firm can never lose its last admin.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  TEAM_ROLES,
  normalizeRole,
  isAssignableRole,
  countAdmins,
  wouldRemoveLastAdmin,
  generateTempPassword,
} from "../src/lib/desk/team-guards.mjs";

test("the three real roles are assignable; nothing else is", () => {
  assert.deepEqual(TEAM_ROLES, ["agent", "manager", "admin"]);
  for (const r of TEAM_ROLES) assert.equal(isAssignableRole(r), true);
  for (const bad of ["operator", "", " ", "Admin", "owner", null, undefined, "ADMIN"]) {
    assert.equal(isAssignableRole(bad), false, `${String(bad)} must not be assignable`);
  }
});

test("normalizeRole maps legacy/blank/unknown to admin, keeps real roles", () => {
  assert.equal(normalizeRole("agent"), "agent");
  assert.equal(normalizeRole("manager"), "manager");
  assert.equal(normalizeRole("admin"), "admin");
  assert.equal(normalizeRole("operator"), "admin");
  assert.equal(normalizeRole(""), "admin");
  assert.equal(normalizeRole(null), "admin");
  assert.equal(normalizeRole("nonsense"), "admin");
});

test("countAdmins counts normalized admins (legacy operator counts)", () => {
  assert.equal(
    countAdmins([
      { user_id: "a", role: "admin" },
      { user_id: "b", role: "operator" }, // legacy → admin
      { user_id: "c", role: "manager" },
      { user_id: "d", role: "agent" },
    ]),
    2,
  );
  assert.equal(countAdmins([]), 0);
  assert.equal(countAdmins(undefined), 0);
});

test("demoting the ONLY admin is refused", () => {
  const members = [
    { user_id: "a", role: "admin" },
    { user_id: "b", role: "manager" },
    { user_id: "c", role: "agent" },
  ];
  assert.equal(wouldRemoveLastAdmin(members, "a", "manager"), true);
  assert.equal(wouldRemoveLastAdmin(members, "a", "agent"), true);
});

test("demoting an admin is allowed when another admin remains", () => {
  const members = [
    { user_id: "a", role: "admin" },
    { user_id: "b", role: "admin" },
    { user_id: "c", role: "agent" },
  ];
  assert.equal(wouldRemoveLastAdmin(members, "a", "manager"), false);
  assert.equal(wouldRemoveLastAdmin(members, "b", "agent"), false);
});

test("keeping an admin as admin, or promoting, never trips the guard", () => {
  const members = [
    { user_id: "a", role: "admin" },
    { user_id: "b", role: "agent" },
  ];
  assert.equal(wouldRemoveLastAdmin(members, "a", "admin"), false); // no change
  assert.equal(wouldRemoveLastAdmin(members, "b", "admin"), false); // promote
  assert.equal(wouldRemoveLastAdmin(members, "b", "manager"), false); // non-admin
});

test("the legacy single-owner (operator) is protected as the last admin", () => {
  // Pre-roles firms have one 'operator' row; it must be treated as the admin it
  // effectively is, so it can never be demoted into a zero-admin firm.
  const members = [{ user_id: "owner", role: "operator" }];
  assert.equal(wouldRemoveLastAdmin(members, "owner", "manager"), true);
});

test("an unknown target is not the lockout case", () => {
  const members = [{ user_id: "a", role: "admin" }];
  assert.equal(wouldRemoveLastAdmin(members, "ghost", "agent"), false);
});

test("generateTempPassword is 20 unambiguous chars, random each call", () => {
  const p = generateTempPassword();
  assert.equal(p.length, 20);
  assert.match(p, /^[ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789]+$/);
  assert.notEqual(p, generateTempPassword());
});
