import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { DatabaseSync } from "node:sqlite";

/**
 * Migrasi dijalankan di database sungguhan, bukan sekadar dibaca.
 *
 * Generator migrasi pernah menghasilkan SELECT yang menyebut kolom baru dari tabel lama
 * yang belum punya kolom itu — berkasnya terlihat wajar tapi gagal total saat diterapkan.
 * Uji ini menangkap kelas kesalahan tersebut sebelum menyentuh data pelanggan.
 */
const migrationsDir = new URL("../drizzle/", import.meta.url);

/** node:sqlite mengembalikan objek null-prototype; disamakan dulu supaya deepEqual bisa dipakai. */
function plain(row) {
  return row ? { ...row } : row;
}

async function migrationFiles() {
  const names = await readdir(migrationsDir);
  return names.filter((name) => name.endsWith(".sql")).sort();
}

/** Menerapkan migrasi pada rentang [from, upTo) supaya bisa berhenti sebelum yang terbaru. */
async function applyThrough(db, upTo = Infinity, from = 0) {
  const files = await migrationFiles();
  for (const [index, name] of files.entries()) {
    if (index < from) continue;
    if (index >= upTo) break;
    const sql = await readFile(new URL(name, migrationsDir), "utf8");
    for (const statement of sql.split("--> statement-breakpoint")) {
      const trimmed = statement.trim();
      if (trimmed) db.exec(trimmed);
    }
  }
  return files;
}

/**
 * Posisi migrasi yang namanya diawali prefiks tertentu.
 *
 * Uji di bawah menargetkan satu migrasi spesifik. Menyebutnya lewat "yang terakhir" membuat
 * uji ini diam-diam berpindah sasaran setiap kali ada migrasi baru — persis yang terjadi
 * saat migrasi autentikasi ditambahkan.
 */
async function indexOfMigration(prefix) {
  const files = await migrationFiles();
  const index = files.findIndex((name) => name.startsWith(prefix));
  assert.notEqual(index, -1, `migrasi ${prefix} tidak ditemukan`);
  return index;
}

test("semua migrasi berjalan berurutan dari database kosong", async () => {
  const db = new DatabaseSync(":memory:");
  const files = await applyThrough(db);
  assert.ok(files.length >= 4, "migrasi tidak ditemukan");

  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);
  for (const expected of ["workspaces", "branches", "products", "ingredients", "recipes", "orders", "order_items", "shifts", "members", "subscription_claims"]) {
    assert.ok(tables.includes(expected), `tabel ${expected} hilang`);
  }
  db.close();
});

test("nominal uang tersimpan sebagai integer", async () => {
  const db = new DatabaseSync(":memory:");
  await applyThrough(db);

  const columnType = (table, column) =>
    db.prepare(`PRAGMA table_info(${table})`).all().find((row) => row.name === column)?.type;

  for (const [table, column] of [
    ["orders", "total"], ["orders", "tax"], ["orders", "discount"],
    ["order_items", "unit_price"], ["products", "price"], ["products", "cost"],
    ["expenses", "amount"], ["shifts", "opening_cash"], ["billing_invoices", "amount"],
  ]) {
    assert.equal(columnType(table, column), "INTEGER", `${table}.${column} bukan integer`);
  }
  db.close();
});

test("data yang sudah ada selamat melewati migrasi", async () => {
  const db = new DatabaseSync(":memory:");
  const backfill = await indexOfMigration("0003");
  await applyThrough(db, backfill);

  db.exec(`
    INSERT INTO workspaces(id, owner_email, name, slug, plan, tax_percent, subscription_status, billing_interval)
    VALUES('ws1', 'a@b.com', 'Kedai A', 'a', 'pro', 10, 'trialing', 'monthly');
    INSERT INTO branches(id, workspace_id, name, code) VALUES('br1', 'ws1', 'Outlet', 'OUT-01');
    INSERT INTO products(id, workspace_id, name, sku, category, price, cost) VALUES('p1', 'ws1', 'Kopi', 'K1', 'Coffee', 18000, 5700);
    INSERT INTO orders(id, workspace_id, branch_id, order_no, payment_method, subtotal, discount, total)
    VALUES('o1', 'ws1', 'br1', 'FZ-1', 'QRIS', 54000, 4000, 50000);
    INSERT INTO order_items(id, order_id, product_id, product_name, quantity, unit_price, unit_cost, subtotal)
    VALUES('i1', 'o1', 'p1', 'Kopi', 3, 18000, 5700, 54000);
    INSERT INTO shifts(id, workspace_id, branch_id, cashier_name, opening_cash, actual_cash, variance, status)
    VALUES('s1', 'ws1', 'br1', 'Raka', 500000, 510000, 10000, 'closed');
  `);

  await applyThrough(db, backfill + 1, backfill);

  const order = plain(db.prepare("SELECT order_no, subtotal, discount, tax, total, status FROM orders WHERE id = 'o1'").get());
  assert.deepEqual(order, { order_no: "FZ-1", subtotal: 54000, discount: 4000, tax: 0, total: 50000, status: "paid" });

  const item = plain(db.prepare("SELECT product_name, unit_price, subtotal FROM order_items WHERE id = 'i1'").get());
  assert.deepEqual(item, { product_name: "Kopi", unit_price: 18000, subtotal: 54000 });

  const shift = plain(db.prepare("SELECT cashier_name, opening_cash, actual_cash, variance FROM shifts WHERE id = 's1'").get());
  assert.deepEqual(shift, { cashier_name: "Raka", opening_cash: 500000, actual_cash: 510000, variance: 10000 });
  db.close();
});

test("backfill memisahkan yang benar-benar bayar dari yang menaikkan paketnya sendiri", async () => {
  const db = new DatabaseSync(":memory:");
  const backfill = await indexOfMigration("0003");
  await applyThrough(db, backfill);

  // wsA membayar dan klaimnya sudah disetujui admin.
  // wsB berstatus 'active' karena dulu paket bisa dipilih sendiri tanpa membayar.
  db.exec(`
    INSERT INTO workspaces(id, owner_email, name, slug, plan, subscription_status, trial_ends_at)
    VALUES
      ('wsA', 'a@x.com', 'A', 'a', 'business', 'active', '2030-01-01T00:00:00Z'),
      ('wsB', 'b@x.com', 'B', 'b', 'business', 'active', '2030-01-01T00:00:00Z');
    INSERT INTO subscription_claims(id, workspace_id, checkout_reference, buyer_name, buyer_email, buyer_phone, plan, interval, amount, status, activated_at)
    VALUES('c1', 'wsA', 'FCO-A', 'A', 'a@x.com', '08', 'business', 'yearly', 3990000, 'activated', '2026-08-01T10:00:00Z');
  `);

  await applyThrough(db, backfill + 1, backfill);

  const paid = db.prepare("SELECT paid_plan, subscription_status, current_period_end FROM workspaces WHERE id = 'wsA'").get();
  assert.equal(paid.paid_plan, "business");
  assert.equal(paid.subscription_status, "active");
  assert.ok(paid.current_period_end?.startsWith("2027-08-01"), `periode salah: ${paid.current_period_end}`);

  const selfGranted = db.prepare("SELECT paid_plan, subscription_status FROM workspaces WHERE id = 'wsB'").get();
  assert.equal(selfGranted.paid_plan, "");
  assert.equal(selfGranted.subscription_status, "trialing");
  db.close();
});
