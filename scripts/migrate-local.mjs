/**
 * Menerapkan migrasi ke database D1 lokal milik `npm run dev`.
 *
 * Di produksi migrasi dijalankan oleh Cloudflare (`wrangler d1 migrations apply`) atau oleh
 * control plane hosting. Di lokal tidak ada yang melakukannya, jadi database Miniflare yang
 * baru dibuat selalu kosong dan setiap permintaan gagal dengan "no such table".
 *
 * Skrip ini menerapkan berkas yang belum pernah dijalankan, dicatat di tabel `_migrations`.
 * Aman dipanggil berkali-kali.
 */

import { DatabaseSync } from "node:sqlite";
import { readFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const D1_DIR = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject";
const MIGRATIONS_DIR = "drizzle";

const files = (await readdir(MIGRATIONS_DIR))
  .filter((name) => name.endsWith(".sql"))
  .sort();

if (!files.length) {
  console.error(`Tidak ada berkas migrasi di ${MIGRATIONS_DIR}/`);
  process.exit(1);
}

if (!existsSync(D1_DIR)) {
  console.error(
    `Database lokal belum ada di ${D1_DIR}.\n` +
    "Jalankan `npm run dev` sekali sampai server siap, hentikan, lalu ulangi perintah ini.",
  );
  process.exit(1);
}

// Miniflare menamai berkasnya dengan hash, dan menyimpan metadata-nya di berkas terpisah.
const candidates = (await readdir(D1_DIR)).filter(
  (name) => name.endsWith(".sqlite") && name !== "metadata.sqlite",
);

if (candidates.length !== 1) {
  console.error(
    candidates.length
      ? `Ada ${candidates.length} database lokal; tidak jelas yang mana yang dipakai:\n  ${candidates.join("\n  ")}`
      : `Tidak menemukan berkas database di ${D1_DIR}. Jalankan \`npm run dev\` dulu.`,
  );
  process.exit(1);
}

const db = new DatabaseSync(resolve(D1_DIR, candidates[0]));
db.exec("CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL)");

const applied = new Set(db.prepare("SELECT name FROM _migrations").all().map((row) => row.name));
let count = 0;

for (const name of files) {
  if (applied.has(name)) continue;

  const sql = await readFile(resolve(MIGRATIONS_DIR, name), "utf8");
  try {
    db.exec("BEGIN");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) db.exec(trimmed);
    }
    db.prepare("INSERT INTO _migrations(name, applied_at) VALUES(?, ?)")
      .run(name, new Date().toISOString());
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    console.error(`Migrasi ${name} gagal — tidak ada perubahan yang disimpan.`);
    throw error;
  }

  console.log(`  diterapkan  ${name}`);
  count += 1;
}

db.close();
console.log(count ? `\n${count} migrasi diterapkan.` : "Database lokal sudah paling baru.");
