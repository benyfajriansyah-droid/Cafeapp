import test from "node:test";
import assert from "node:assert/strict";

import {
  actionAllowedWhenLocked,
  entitlementOf,
  limitsFor,
  periodEndFrom,
  PLANS,
} from "../app/lib/plans.ts";

const NOW = new Date("2026-06-01T00:00:00.000Z");
const future = (days) => new Date(NOW.getTime() + days * 86_400_000).toISOString();
const past = (days) => new Date(NOW.getTime() - days * 86_400_000).toISOString();

const workspace = (overrides = {}) => ({
  paidPlan: "",
  subscriptionStatus: "trialing",
  currentPeriodEnd: null,
  trialEndsAt: null,
  ...overrides,
});

test("paket yang dipilih sendiri tidak memberi hak akses apa pun", () => {
  // Ini kebocoran utamanya: dulu `plan` cukup untuk membuka batas Business tanpa bayar.
  // `entitlementOf` sengaja tidak menerima `plan`, jadi tidak ada jalan masuk lewat situ.
  const claimed = entitlementOf(workspace({ subscriptionStatus: "pending_payment" }), NOW);
  assert.equal(claimed.plan, null);
  assert.equal(claimed.locked, true);
});

test("status aktif tanpa paidPlan tetap terkunci", () => {
  const spoofed = entitlementOf(workspace({ subscriptionStatus: "active" }), NOW);
  assert.equal(spoofed.locked, true);
  assert.equal(spoofed.source, "none");
});

test("langganan berbayar yang masih berlaku memberi paket yang dibayar", () => {
  const paid = entitlementOf(workspace({
    paidPlan: "business",
    subscriptionStatus: "active",
    currentPeriodEnd: future(20),
  }), NOW);
  assert.equal(paid.plan, "business");
  assert.equal(paid.source, "paid");
  assert.equal(paid.locked, false);
  assert.equal(paid.daysLeft, 20);
});

test("langganan berbayar yang lewat tanggal ikut terkunci", () => {
  const expired = entitlementOf(workspace({
    paidPlan: "pro",
    subscriptionStatus: "active",
    currentPeriodEnd: past(1),
  }), NOW);
  assert.equal(expired.locked, true);
  assert.equal(expired.plan, null);
});

test("langganan berbayar tanpa tanggal akhir dianggap masih berjalan", () => {
  const manual = entitlementOf(workspace({
    paidPlan: "starter",
    subscriptionStatus: "active",
    currentPeriodEnd: null,
  }), NOW);
  assert.equal(manual.plan, "starter");
  assert.equal(manual.daysLeft, null);
});

test("masa uji coba memberi akses sementara lalu berhenti", () => {
  const running = entitlementOf(workspace({ trialEndsAt: future(5) }), NOW);
  assert.equal(running.source, "trial");
  assert.equal(running.plan, "pro");
  assert.equal(running.daysLeft, 5);

  // Ini yang dulu tidak pernah terjadi: trial habis tapi akses jalan terus selamanya.
  const over = entitlementOf(workspace({ trialEndsAt: past(1) }), NOW);
  assert.equal(over.locked, true);
  assert.equal(over.plan, null);
});

test("langganan berbayar menang atas trial yang sudah lewat", () => {
  const both = entitlementOf(workspace({
    paidPlan: "pro",
    subscriptionStatus: "active",
    currentPeriodEnd: future(30),
    trialEndsAt: past(10),
  }), NOW);
  assert.equal(both.source, "paid");
  assert.equal(both.locked, false);
});

test("batas outlet dan tim mengikuti paket yang berlaku", () => {
  const starter = limitsFor(entitlementOf(workspace({
    paidPlan: "starter", subscriptionStatus: "active", currentPeriodEnd: future(10),
  }), NOW));
  assert.deepEqual(starter, { branches: PLANS.starter.branches, members: PLANS.starter.members });

  // Workspace terkunci tidak boleh menambah apa pun.
  const locked = limitsFor(entitlementOf(workspace(), NOW));
  assert.deepEqual(locked, { branches: 1, members: 1 });
});

test("hanya jalan keluar yang tetap terbuka saat langganan mati", () => {
  for (const action of ["select-plan", "claim-orderhero"]) {
    assert.equal(actionAllowedWhenLocked(action), true, action);
  }
  for (const action of ["create-order", "restock", "create-product", "create-branch", "create-member", "open-shift"]) {
    assert.equal(actionAllowedWhenLocked(action), false, action);
  }
});

test("periode langganan dihitung per bulan dan per tahun", () => {
  assert.equal(periodEndFrom(new Date("2026-01-31T00:00:00.000Z"), "yearly").slice(0, 10), "2027-01-31");
  assert.equal(periodEndFrom(new Date("2026-06-15T00:00:00.000Z"), "monthly").slice(0, 10), "2026-07-15");
});
