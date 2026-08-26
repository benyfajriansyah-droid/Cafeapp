import test from "node:test";
import assert from "node:assert/strict";

import { chunkRows, maxRowsPerInsert, MAX_BOUND_PARAMS } from "../app/lib/chunk.ts";

const rows = (count) => Array.from({ length: count }, (_, index) => index);

test("tiap kelompok tidak pernah melewati batas parameter", () => {
  // Batasnya diuji sebagai parameter, bukan lewat konstanta global. Nilai batas berubah saat
  // databasenya berganti; yang tidak boleh berubah adalah janji fungsinya.
  for (const limit of [100, 999, MAX_BOUND_PARAMS]) {
    for (const columns of [5, 8, 10, 11, 20]) {
      for (const total of [0, 1, 6, 13, 40, 137, 5_000]) {
        for (const chunk of chunkRows(rows(total), columns, limit)) {
          assert.ok(
            chunk.length * columns <= limit,
            `${chunk.length} baris × ${columns} kolom melewati batas ${limit}`,
          );
        }
      }
    }
  }
});

test("tidak ada baris yang hilang atau tertukar urutan", () => {
  const source = rows(137);
  assert.deepEqual(chunkRows(source, 8).flat(), source);
  assert.deepEqual(chunkRows(source, 8, 100).flat(), source);
  assert.deepEqual(chunkRows([], 8), []);
});

test("kasus yang dulu gagal tetap terpecah di batas yang ketat", () => {
  // Tiga kasus ini pernah gagal seluruhnya di database sebelumnya, yang batasnya 100 parameter.
  // Batas sekarang jauh lebih longgar, tapi perilaku pemecahannya tetap harus benar kalau
  // suatu saat pindah ke database yang lebih ketat lagi.
  assert.ok(chunkRows(rows(6), 20, 100).length > 1, "6 pesanan × 20 kolom");
  assert.ok(chunkRows(rows(13), 8, 100).length > 1, "pesanan 13 item × 8 kolom");
  assert.ok(chunkRows(rows(21), 5, 100).length > 1, "resep 21 bahan × 5 kolom");
});

test("satu baris pun tetap dikirim kalau tabelnya lebih lebar dari batas", () => {
  // Membagi habis menghasilkan nol, dan kelompok kosong berarti barisnya hilang diam-diam.
  assert.equal(maxRowsPerInsert(120, 100), 1);
  assert.equal(maxRowsPerInsert(0), 1);
  assert.equal(chunkRows(rows(3), 120, 100).length, 3);
});

test("batas bawaan cukup longgar untuk pemakaian normal", () => {
  // Kalau batasnya kembali sekecil D1, pesanan biasa akan terpecah tanpa alasan.
  assert.ok(MAX_BOUND_PARAMS >= 1_000, `batas terlalu kecil: ${MAX_BOUND_PARAMS}`);
  assert.equal(chunkRows(rows(20), 20).length, 1, "pesanan 20 item harus muat satu perintah");
});
