import assert from "node:assert/strict";
import test from "node:test";

import {
  MIN_PASSWORD_LENGTH,
  fromBase64Url,
  hashPassword,
  passwordProblem,
  timingSafeEqual,
  toBase64Url,
  verifyPassword,
} from "../app/lib/auth/password.ts";

test("kata sandi yang benar diterima, yang salah ditolak", async () => {
  const stored = await hashPassword("kopi-susu-gula-aren", 1_000);

  assert.equal((await verifyPassword("kopi-susu-gula-aren", stored)).valid, true);
  assert.equal((await verifyPassword("kopi-susu-gula-arem", stored)).valid, false);
  assert.equal((await verifyPassword("", stored)).valid, false);
});

test("dua hash dari kata sandi yang sama selalu berbeda", async () => {
  // Kalau salt-nya tidak acak, hash yang sama di dua akun membocorkan bahwa kata sandinya sama.
  const first = await hashPassword("kata-sandi-yang-sama", 1_000);
  const second = await hashPassword("kata-sandi-yang-sama", 1_000);

  assert.notEqual(first, second);
  assert.equal((await verifyPassword("kata-sandi-yang-sama", first)).valid, true);
  assert.equal((await verifyPassword("kata-sandi-yang-sama", second)).valid, true);
});

test("hash menyimpan jumlah iterasinya sendiri", async () => {
  const stored = await hashPassword("kata-sandi-panjang", 1_000);
  const [algorithm, hash, iterations] = stored.split("$");

  assert.equal(algorithm, "pbkdf2");
  assert.equal(hash, "sha256");
  assert.equal(iterations, "1000");
});

test("hash dengan iterasi di bawah standar ditandai untuk ditulis ulang", async () => {
  const lama = await hashPassword("kata-sandi-panjang", 1_000);
  const hasil = await verifyPassword("kata-sandi-panjang", lama);

  assert.equal(hasil.valid, true);
  assert.equal(hasil.needsRehash, true, "kata sandi lama harus dinaikkan saat pemiliknya masuk");
});

test("hash yang rusak atau dipalsukan ditolak, bukan bikin error", async () => {
  for (const rusak of [
    "",
    "bukan-hash",
    "pbkdf2$sha256$210000$salt",
    "pbkdf2$md5$210000$c2FsdA$aGFzaA",
    "bcrypt$sha256$210000$c2FsdA$aGFzaA",
    // Iterasi 1 akan membuat verifikasi nyaris gratis kalau nilainya dipercaya begitu saja.
    "pbkdf2$sha256$1$c2FsdA$aGFzaA",
    "pbkdf2$sha256$99999999999$c2FsdA$aGFzaA",
  ]) {
    const hasil = await verifyPassword("apa pun", rusak);
    assert.equal(hasil.valid, false, `harus ditolak: ${rusak}`);
  }
});

test("panjang minimum kata sandi ditegakkan", () => {
  assert.equal(passwordProblem("x".repeat(MIN_PASSWORD_LENGTH)), null);
  assert.notEqual(passwordProblem("x".repeat(MIN_PASSWORD_LENGTH - 1)), null);
  assert.notEqual(passwordProblem("          "), null, "spasi saja tidak dihitung");
  assert.notEqual(passwordProblem("x".repeat(201)), null);
});

test("perbandingan aman-waktu membandingkan isi, bukan panjang saja", () => {
  const a = new Uint8Array([1, 2, 3, 4]);
  assert.equal(timingSafeEqual(a, new Uint8Array([1, 2, 3, 4])), true);
  assert.equal(timingSafeEqual(a, new Uint8Array([1, 2, 3, 5])), false);
  assert.equal(timingSafeEqual(a, new Uint8Array([1, 2, 3])), false);
});

test("base64url bolak-balik tanpa kehilangan byte", () => {
  const bytes = new Uint8Array([0, 1, 62, 63, 128, 255, 250]);
  const kembali = fromBase64Url(toBase64Url(bytes));

  assert.deepEqual([...kembali], [...bytes]);
  assert.equal(toBase64Url(bytes).includes("+"), false, "harus aman dipakai di URL");
  assert.equal(toBase64Url(bytes).includes("/"), false);
  assert.equal(toBase64Url(bytes).includes("="), false);
});
