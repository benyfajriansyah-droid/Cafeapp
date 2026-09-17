import test from "node:test";
import assert from "node:assert/strict";

import {
  hasPermission,
  normalizePermissions,
  permissionsFor,
} from "../app/lib/permissions.ts";

test("owner selalu memiliki seluruh akses", () => {
  const permissions = permissionsFor({ role: "owner", permissions: "pos" });
  assert.ok(permissions.includes("settings"));
  assert.ok(permissions.includes("team"));
  assert.ok(hasPermission({ role: "owner", permissions: "" }, "reports"));
});

test("akun lama tanpa konfigurasi mendapat bawaan sesuai peran", () => {
  assert.deepEqual(
    permissionsFor({ role: "cashier", permissions: "" }),
    ["pos", "sales", "products", "inventory"],
  );
});

test("hak akses pilihan owner disaring ke menu yang valid", () => {
  const stored = normalizePermissions(["pos", "inventory", "team", "tidak-valid"], "cashier");
  assert.equal(stored, "pos,inventory,team");
  assert.deepEqual(permissionsFor({ role: "cashier", permissions: stored }), ["pos", "inventory", "team"]);
});

