import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import test from "node:test";

/**
 * Memeriksa hasil `next build`.
 *
 * Sebagian jaminan hanya bisa dibuktikan di bundel akhir, bukan di kode sumber: rahasia yang
 * tidak boleh ikut sampai ke browser, dan header identitas lama yang harus benar-benar hilang
 * dan bukan sekadar tidak dipakai lagi di satu tempat.
 */
const buildDir = new URL("../.next/", import.meta.url);
const options = {
  skip: existsSync(buildDir) ? false : "jalankan `npm run build` dulu untuk memeriksa hasil build",
};

/** Semua berkas JavaScript di bawah satu direktori build. */
async function bundleFiles(subdirectory) {
  const root = new URL(`${subdirectory}/`, buildDir);
  if (!existsSync(root)) return [];

  const found = [];
  async function walk(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const child = new URL(`${entry.name}${entry.isDirectory() ? "/" : ""}`, directory);
      if (entry.isDirectory()) await walk(child);
      else if (entry.name.endsWith(".js")) found.push(child);
    }
  }
  await walk(root);
  return found;
}

/**
 * Alamat contoh yang memang sengaja ada di layar, mis. placeholder kolom email.
 * Selain ini, alamat email tidak punya alasan untuk sampai ke browser.
 */
const PLACEHOLDER_EMAIL = /^(nama@email\.com|.*@app\.local|.*(example|contoh).*)$/i;

test("tidak ada alamat email asli yang sampai ke bundel browser", options, async () => {
  // Dulu alamat admin ditulis langsung di kode dan ikut ter-commit.
  for (const file of await bundleFiles("static")) {
    const source = await readFile(file, "utf8");
    const found = source.match(/[A-Za-z0-9._+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,24}\b/g) ?? [];
    const leaked = found.filter((entry) => !PLACEHOLDER_EMAIL.test(entry));
    assert.deepEqual(leaked, [], `alamat email ikut ke browser lewat ${file.pathname}`);
  }
});

test("connection string database tidak sampai ke bundel browser", options, async () => {
  // DATABASE_URL berisi kata sandi. Kalau nilainya sampai ikut ke kode yang dikirim ke browser,
  // kredensial produksi ikut tersebar ke setiap pengunjung.
  for (const file of await bundleFiles("static")) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(
      source,
      /postgres(ql)?:\/\/[^"'`\s]*:[^"'`\s]*@/,
      `connection string ikut ke browser lewat ${file.pathname}`,
    );
  }
});

test("kunci rahasia server tidak sampai ke bundel browser", options, async () => {
  for (const file of await bundleFiles("static")) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /re_[A-Za-z0-9_]{20,}/, `kunci Resend ikut ke browser lewat ${file.pathname}`);
  }
});

test("header identitas dari proxy tidak lagi dipercaya di mana pun", options, async () => {
  // Dulu siapa pun yang bisa mengirim header ini menjadi pemilik atau admin begitu aplikasi
  // berjalan di luar proxy. Header itu harus benar-benar hilang dari hasil build.
  const files = [...(await bundleFiles("server")), ...(await bundleFiles("static"))];
  assert.ok(files.length, "hasil build tidak berisi berkas JavaScript");

  for (const file of files) {
    const source = await readFile(file, "utf8");
    assert.doesNotMatch(source, /oai-authenticated-user-email/, file.pathname);
    assert.doesNotMatch(source, /AUTH_TRUSTED_PROXY/, file.pathname);
  }
});
