import test from "node:test";
import assert from "node:assert/strict";

import { createCheckoutReference, isValidCheckoutReference, normalizeCheckoutReference } from "../app/lib/reference.ts";

test("kode checkout berbentuk konsisten dan bisa divalidasi", () => {
  const reference = createCheckoutReference();
  assert.match(reference, /^FCO-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  assert.equal(isValidCheckoutReference(reference), true);
  assert.equal(isValidCheckoutReference("FCO-MDQ2-ABCD"), false);
});

test("kode tidak mengandung waktu pembuatan", () => {
  // Format lama memakai `Date.now()` dalam base36, jadi sebagian besar kodenya bisa dihitung
  // dan sisanya cuma 65 ribu kemungkinan. Dua kode yang dibuat berdekatan tidak boleh mirip.
  const first = createCheckoutReference();
  const second = createCheckoutReference();
  assert.notEqual(first, second);

  const sharedPrefix = [...first].findIndex((char, index) => char !== second[index]);
  assert.ok(sharedPrefix <= 6, `dua kode berbagi awalan terlalu panjang: ${first} / ${second}`);
});

test("seluruh isi kode diambil dari sumber acak", () => {
  const allZero = createCheckoutReference(new Uint8Array(16));
  const allOne = createCheckoutReference(new Uint8Array(16).fill(1));
  assert.equal(allZero, "FCO-0000-0000-0000-0000");
  assert.equal(allOne, "FCO-1111-1111-1111-1111");
});

test("kode yang diketik ulang pembeli tetap cocok", () => {
  assert.equal(normalizeCheckoutReference(" fco-a1b2-c3d4-e5f6-g7h8 "), "FCO-A1B2-C3D4-E5F6-G7H8");
  assert.equal(normalizeCheckoutReference("FCO-A1B2 -C3D4-E5F6-G7H8"), "FCO-A1B2-C3D4-E5F6-G7H8");
  assert.equal(normalizeCheckoutReference(null), "");
});

test("sebaran kode cukup lebar untuk menahan tebakan", () => {
  const seen = new Set();
  for (let index = 0; index < 2_000; index += 1) seen.add(createCheckoutReference());
  assert.equal(seen.size, 2_000);
});
