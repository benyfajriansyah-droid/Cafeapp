import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

/**
 * Migrasi dijalankan di Postgres sungguhan, bukan sekadar dibaca.
 *
 * PGlite adalah Postgres yang dijalankan di dalam proses ini, jadi uji ini memakai mesin yang
 * sama dengan produksi tanpa perlu server terpisah. Generator migrasi pernah menghasilkan
 * perintah yang terlihat wajar tapi gagal total saat diterapkan; kelas kesalahan itu hanya
 * ketahuan kalau SQL-nya benar-benar dieksekusi.
 */
const migrationsDir = new URL("../drizzle/", import.meta.url);

async function migrationFiles() {
  const names = await readdir(migrationsDir);
  return names.filter((name) => name.endsWith(".sql")).sort();
}

async function freshDatabase() {
  const db = new PGlite();
  const files = await migrationFiles();
  assert.ok(files.length, "migrasi tidak ditemukan");

  for (const name of files) {
    const sql = await readFile(new URL(name, migrationsDir), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) await db.exec(trimmed);
    }
  }
  return db;
}

test("semua migrasi berjalan berurutan dari database kosong", async () => {
  const db = await freshDatabase();

  const { rows } = await db.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'",
  );
  const tables = rows.map((row) => row.table_name);

  for (const expected of [
    "workspaces", "branches", "products", "ingredients", "recipes",
    "orders", "order_items", "expenses", "stock_movements", "shifts",
    "members", "billing_invoices", "platform_settings", "subscription_claims",
    "users", "sessions", "password_resets", "invitations",
  ]) {
    assert.ok(tables.includes(expected), `tabel ${expected} tidak terbentuk`);
  }

  await db.close();
});

test("nominal uang bertipe integer, besaran fisik tetap pecahan", async () => {
  // Rupiah tidak punya sen. Menyimpannya sebagai pecahan membuat penjumlahan di laporan
  // mengakumulasi galat yang tidak bisa dijelaskan ke pemilik usaha.
  const db = await freshDatabase();

  const { rows } = await db.query(`
    SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('price', 'cost', 'total', 'subtotal', 'amount', 'opening_cash', 'stock_qty', 'quantity')
  `);
  const typeOf = (table, column) =>
    rows.find((row) => row.table_name === table && row.column_name === column)?.data_type;

  assert.equal(typeOf("products", "price"), "integer");
  assert.equal(typeOf("products", "cost"), "integer");
  assert.equal(typeOf("orders", "total"), "integer");
  assert.equal(typeOf("expenses", "amount"), "integer");
  assert.equal(typeOf("shifts", "opening_cash"), "integer");

  assert.equal(typeOf("ingredients", "stock_qty"), "double precision");
  assert.equal(typeOf("recipes", "quantity"), "double precision");

  await db.close();
});

test("email akun dan kode checkout dijaga unik oleh database", async () => {
  // Keunikan yang hanya dijaga di kode akan bocor begitu ada dua permintaan bersamaan.
  const db = await freshDatabase();

  await db.exec(`
    INSERT INTO users(id, email, password_hash) VALUES('u1', 'a@x.com', 'pbkdf2$sha256$1$c2E$aA');
  `);
  await assert.rejects(
    db.exec(`INSERT INTO users(id, email, password_hash) VALUES('u2', 'a@x.com', 'pbkdf2$sha256$1$c2E$aA')`),
    /duplicate key|unique/i,
    "email yang sama harus ditolak database",
  );

  await db.exec(`
    INSERT INTO subscription_claims(id, checkout_reference, buyer_name, buyer_email, buyer_phone, plan, amount)
    VALUES('c1', 'FCO-AAAA', 'A', 'a@x.com', '08', 'pro', 199000);
  `);
  await assert.rejects(
    db.exec(`
      INSERT INTO subscription_claims(id, checkout_reference, buyer_name, buyer_email, buyer_phone, plan, amount)
      VALUES('c2', 'FCO-AAAA', 'B', 'b@x.com', '08', 'pro', 199000)
    `),
    /duplicate key|unique/i,
    "kode checkout yang sama harus ditolak database",
  );

  await db.close();
});

test("satu email hanya boleh sekali per workspace, tapi boleh di workspace berbeda", async () => {
  const db = await freshDatabase();

  await db.exec(`
    INSERT INTO members(id, workspace_id, email, role) VALUES('m1', 'ws1', 'raka@x.com', 'cashier');
    INSERT INTO members(id, workspace_id, email, role) VALUES('m2', 'ws2', 'raka@x.com', 'manager');
  `);

  await assert.rejects(
    db.exec(`INSERT INTO members(id, workspace_id, email, role) VALUES('m3', 'ws1', 'raka@x.com', 'manager')`),
    /duplicate key|unique/i,
  );

  await db.close();
});

test("hak akses berbayar tidak punya nilai bawaan yang memberi paket", async () => {
  // Workspace baru harus lahir tanpa paket berbayar. Kalau `paid_plan` punya nilai bawaan yang
  // bukan kosong, setiap pendaftar langsung mendapat paket tanpa pernah membayar.
  const db = await freshDatabase();

  await db.exec(`
    INSERT INTO workspaces(id, owner_email, name, slug) VALUES('ws1', 'a@x.com', 'A', 'a');
  `);
  const { rows } = await db.query("SELECT paid_plan, subscription_status FROM workspaces WHERE id = 'ws1'");

  assert.equal(rows[0].paid_plan, "");
  assert.equal(rows[0].subscription_status, "trialing");

  await db.close();
});
