/**
 * Menerapkan migrasi ke database Postgres yang ditunjuk DATABASE_URL.
 *
 * Dipakai untuk Neon (lokal maupun produksi). Berkas yang sudah pernah dijalankan dicatat di
 * tabel `_migrations`, jadi perintah ini aman dipanggil berkali-kali dan aman dijalankan
 * sebagai bagian dari alur deploy.
 *
 * Dijalankan otomatis oleh Vercel lewat `buildCommand` di vercel.json. Karena beberapa deploy
 * bisa berjalan bersamaan, seluruh proses dijaga advisory lock Postgres: yang kedua menunggu
 * yang pertama selesai, bukan menerapkan migrasi yang sama dua kali.
 */

import { neon } from "@neondatabase/serverless";
import pg from "pg";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL belum diisi.\n" +
    "Lokal : simpan di .env.local, lalu jalankan `node --env-file=.env.local scripts/migrate.mjs`\n" +
    "Vercel: sudah terisi otomatis kalau integrasi Neon terpasang",
  );
  process.exit(1);
}

const isNeon = (() => {
  try {
    return new URL(url).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
})();

const files = (await readdir("drizzle")).filter((name) => name.endsWith(".sql")).sort();

if (!files.length) {
  console.error("Tidak ada berkas migrasi di drizzle/");
  process.exit(1);
}

/**
 * Neon hanya bisa dihubungi lewat HTTP-nya sendiri; Postgres lain lewat koneksi biasa.
 * Keduanya dibungkus jadi satu bentuk supaya sisa skrip ini tidak perlu tahu bedanya.
 */
async function connect() {
  if (isNeon) {
    const sql = neon(url);
    return {
      query: (text, params = []) => sql.query(text, params),
      // Isi satu batch HTTP Neon dijalankan di dalam satu transaksi.
      atomic: (statements) => sql.transaction(statements.map(([text, params = []]) => sql.query(text, params))),
      close: async () => {},
    };
  }

  const client = new pg.Client({ connectionString: url });
  await client.connect();
  return {
    query: async (text, params = []) => (await client.query(text, params)).rows,
    atomic: async (statements) => {
      await client.query("BEGIN");
      try {
        for (const [text, params = []] of statements) await client.query(text, params);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
    },
    close: () => client.end(),
  };
}

const db = await connect();

// Angka kuncinya bebas, asal sama di setiap proses yang memigrasikan database ini.
const LOCK_KEY = 4_412_071;

// Lock diambil SEBELUM apa pun disentuh, termasuk sebelum tabel catatannya dibuat.
// `CREATE TABLE IF NOT EXISTS` bukan operasi aman untuk dijalankan bersamaan: dua proses
// yang memeriksa "belum ada" di saat yang sama akan sama-sama mencoba membuatnya, dan yang
// kalah gagal dengan pelanggaran unique constraint di katalog Postgres.
await db.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
await db.query("CREATE TABLE IF NOT EXISTS _migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())");

// Daftar yang sudah diterapkan dibaca SETELAH lock didapat. Membacanya lebih dulu berarti
// deploy yang menunggu memakai daftar usang, lalu mencoba menerapkan ulang migrasi yang
// baru saja dijalankan deploy sebelumnya.
const applied = new Set((await db.query("SELECT name FROM _migrations")).map((row) => row.name));

let count = 0;
for (const name of files) {
  if (applied.has(name)) continue;

  const statements = (await readFile(resolve("drizzle", name), "utf8"))
    .split("--> statement-breakpoint")
    .map((statement) => statement.trim())
    .filter(Boolean);

  // Migrasi yang gagal di tengah tidak boleh meninggalkan sebagian tabel terbentuk dan
  // sebagian tidak — pemulihannya jauh lebih repot daripada mengulang dari awal.
  await db.atomic([
    ...statements.map((statement) => [statement]),
    ["INSERT INTO _migrations(name) VALUES($1)", [name]],
  ]);

  console.log(`  diterapkan  ${name}`);
  count += 1;
}

await db.query("SELECT pg_advisory_unlock($1)", [LOCK_KEY]);
await db.close();
console.log(count ? `\n${count} migrasi diterapkan.` : "Database sudah paling baru.");
