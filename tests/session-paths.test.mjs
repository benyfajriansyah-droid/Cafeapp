import assert from "node:assert/strict";
import test from "node:test";

import { hashToken, isoIn, newLinkToken, newSessionToken } from "../app/lib/auth/tokens.ts";

// `safeReturnPath` ada di modul yang mengimpor `next/headers`, yang tidak bisa dimuat di luar
// runtime Next. Aturannya disalin di sini supaya perilakunya tetap terkunci oleh test.
// Kalau salah satu berubah, yang satunya harus ikut — lihat app/lib/auth/session.ts.
function safeReturnPath(value) {
  if (!value.startsWith("/") || value.startsWith("//")) return "/app";
  try {
    const url = new URL(value, "https://app.local");
    if (url.origin !== "https://app.local") return "/app";
    if (["/masuk", "/daftar", "/keluar"].includes(url.pathname)) return "/app";
    return `${url.pathname}${url.search}`;
  } catch {
    return "/app";
  }
}

test("tujuan setelah masuk hanya boleh path di dalam aplikasi ini", () => {
  // Tanpa penyaringan ini, halaman masuk jadi pengalih terbuka: korban melihat domain yang
  // benar, memasukkan kata sandinya, lalu dilempar ke situs penyerang.
  assert.equal(safeReturnPath("https://situs-penipu.example"), "/app");
  assert.equal(safeReturnPath("//situs-penipu.example"), "/app");
  assert.equal(safeReturnPath("http://situs-penipu.example/app"), "/app");
  assert.equal(safeReturnPath("javascript:alert(1)"), "/app");
  assert.equal(safeReturnPath(""), "/app");
});

test("path internal yang wajar dipertahankan", () => {
  assert.equal(safeReturnPath("/app"), "/app");
  assert.equal(safeReturnPath("/aktivasi"), "/aktivasi");
  assert.equal(safeReturnPath("/app?branch=br_1"), "/app?branch=br_1");
});

test("halaman auth tidak dipakai sebagai tujuan, supaya tidak berputar", () => {
  assert.equal(safeReturnPath("/masuk"), "/app");
  assert.equal(safeReturnPath("/daftar"), "/app");
  assert.equal(safeReturnPath("/keluar"), "/app");
});

test("token sesi dan tautan selalu berbeda tiap dibuat", () => {
  const sesi = new Set(Array.from({ length: 200 }, () => newSessionToken()));
  const tautan = new Set(Array.from({ length: 200 }, () => newLinkToken()));

  assert.equal(sesi.size, 200);
  assert.equal(tautan.size, 200);
});

test("token cukup panjang dan aman dipakai di URL", () => {
  for (const token of [newSessionToken(), newLinkToken()]) {
    assert.ok(token.length >= 40, `token terlalu pendek: ${token.length}`);
    assert.match(token, /^[A-Za-z0-9_-]+$/);
  }
});

test("yang disimpan adalah hash token, bukan tokennya", async () => {
  const token = newSessionToken();
  const hash = await hashToken(token);

  assert.notEqual(hash, token, "token mentah tidak boleh jadi kunci baris");
  assert.equal(hash, await hashToken(token), "hash harus stabil");
  assert.notEqual(hash, await hashToken(newSessionToken()));
});

test("umur token dihitung maju dari sekarang", () => {
  const satuJam = Date.parse(isoIn(60 * 60 * 1000));
  const selisih = satuJam - Date.now();

  assert.ok(selisih > 59 * 60 * 1000 && selisih <= 60 * 60 * 1000, `selisih ${selisih}ms`);
});
