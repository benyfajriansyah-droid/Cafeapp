import test from "node:test";
import assert from "node:assert/strict";

import { chunkRows, maxRowsPerInsert, D1_MAX_BOUND_PARAMS } from "../app/lib/chunk.ts";

const rows = (count) => Array.from({ length: count }, (_, index) => index);

test("tiap kelompok tidak pernah melewati batas parameter D1", () => {
  for (const columns of [5, 8, 10, 11, 20]) {
    for (const total of [0, 1, 6, 13, 40, 137]) {
      for (const chunk of chunkRows(rows(total), columns)) {
        assert.ok(
          chunk.length * columns <= D1_MAX_BOUND_PARAMS,
          `${chunk.length} baris × ${columns} kolom melewati batas`,
        );
      }
    }
  }
});

test("tidak ada baris yang hilang atau tertukar urutan", () => {
  const source = rows(137);
  assert.deepEqual(chunkRows(source, 8).flat(), source);
  assert.deepEqual(chunkRows([], 8), []);
});

test("kasus yang dulu gagal sekarang terpecah", () => {
  // Data contoh: 6 pesanan × 20 kolom = 120 parameter, ditolak D1 sebagai satu insert.
  const orderChunks = chunkRows(rows(6), 20);
  assert.ok(orderChunks.length > 1);

  // Pesanan dengan 13 item × 8 kolom = 104 parameter.
  const itemChunks = chunkRows(rows(13), 8);
  assert.ok(itemChunks.length > 1);

  // Resep dengan 21 bahan × 5 kolom = 105 parameter.
  const recipeChunks = chunkRows(rows(21), 5);
  assert.ok(recipeChunks.length > 1);
});

test("tabel yang sangat lebar tetap menyisakan satu baris per perintah", () => {
  assert.equal(maxRowsPerInsert(120), 1);
  assert.equal(maxRowsPerInsert(0), 1);
  assert.equal(chunkRows(rows(3), 120).length, 3);
});
