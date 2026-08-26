import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

const distServer = new URL("../dist/server/index.js", import.meta.url);
const assetDirectory = new URL("../dist/client/assets/", import.meta.url);

// Uji ini memeriksa hasil build, jadi dilewati saat `npm test` dijalankan tanpa build dulu.
// `npm run test:build` menjalankan build lebih dulu supaya bagian ini ikut terperiksa.
const built = existsSync(distServer);
const options = { skip: built ? false : "jalankan `npm run test:build` untuk memeriksa hasil build" };

test("rute API dan halaman checkout ikut ter-build", options, async () => {
  const workerSource = await readFile(distServer, "utf8");
  const assetNames = await readdir(assetDirectory);

  const checkoutAsset = assetNames.find((name) => name.startsWith("orderhero-checkout-"));
  const activationAsset = assetNames.find((name) => name.startsWith("activation-form-"));
  assert.ok(checkoutAsset, "bundel halaman checkout tidak ditemukan");
  assert.ok(activationAsset, "bundel halaman aktivasi tidak ditemukan");

  assert.match(workerSource, /\/api\/orderhero/);
  assert.match(workerSource, /platform_settings/);
  assert.match(await readFile(new URL(checkoutAsset, assetDirectory), "utf8"), /CHECKOUT AMAN VIA ORDERHERO/);
  assert.match(await readFile(new URL(activationAsset, assetDirectory), "utf8"), /Kode checkout Famz/);
});

test("email admin platform tidak ikut ter-build ke dalam bundel", options, async () => {
  // Dulu alamat admin ditulis langsung di kode dan ikut ter-commit. Sekarang dibaca dari
  // environment variable, jadi tidak boleh ada alamat email siapa pun di hasil build.
  const workerSource = await readFile(distServer, "utf8");
  // TLD dibatasi huruf supaya token seperti `wght@100..900` dari Google Fonts tidak ikut terjaring.
  const emails = workerSource.match(/[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}\b/g) ?? [];
  const suspicious = emails.filter((entry) => !entry.endsWith("@app.local") && !entry.includes("example"));
  assert.deepEqual(suspicious, [], `alamat email ikut ter-build: ${suspicious.join(", ")}`);
});

test("halaman autentikasi ikut ter-build", options, async () => {
  const workerSource = await readFile(distServer, "utf8");
  const assetNames = await readdir(assetDirectory);

  const authAsset = assetNames.find((name) => name.startsWith("auth-form-"));
  assert.ok(authAsset, "bundel halaman masuk/daftar tidak ditemukan");
  assert.match(await readFile(new URL(authAsset, assetDirectory), "utf8"), /Buat akun/);

  assert.match(workerSource, /\/api\/auth/);
  assert.match(workerSource, /password_hash/, "tabel akun harus ikut ter-build");
  assert.match(workerSource, /famz_session/, "nama cookie sesi harus ikut ter-build");
});

test("header identitas dari proxy tidak lagi dipercaya di mana pun", options, async () => {
  // Dulu siapa pun yang bisa mengirim header ini menjadi pemilik atau admin begitu aplikasi
  // berjalan di luar proxy. Header itu harus benar-benar hilang dari hasil build, bukan
  // sekadar tidak dipakai lagi di satu tempat.
  const workerSource = await readFile(distServer, "utf8");
  assert.doesNotMatch(workerSource, /oai-authenticated-user-email/);
  assert.doesNotMatch(workerSource, /AUTH_TRUSTED_PROXY/);
});
