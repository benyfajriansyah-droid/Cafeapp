import test from "node:test";
import assert from "node:assert/strict";

import { calculateOrder, positiveRupiah, profitOf, weightedAverageCost } from "../app/lib/money.ts";

const lines = [
  { price: 18_000, cost: 5_700, quantity: 3 },
  { price: 15_000, cost: 4_200, quantity: 2 },
];
const openDiscount = { unlimited: true, maxPercent: 0 };

test("subtotal, HPP, dan total dihitung dari harga produk", () => {
  const totals = calculateOrder(lines, { requestedDiscount: 0, taxPercent: 0, discountRule: openDiscount });
  assert.equal(totals.subtotal, 84_000);
  assert.equal(totals.cogs, 25_500);
  assert.equal(totals.total, 84_000);
});

test("pajak layanan benar-benar dipakai dan dihitung setelah diskon", () => {
  // Dulu `taxPercent` disimpan tapi tidak pernah masuk ke total pesanan.
  const totals = calculateOrder(lines, { requestedDiscount: 4_000, taxPercent: 10, discountRule: openDiscount });
  assert.equal(totals.discount, 4_000);
  assert.equal(totals.tax, 8_000);
  assert.equal(totals.total, 88_000);
});

test("pajak dibulatkan ke rupiah penuh", () => {
  const totals = calculateOrder([{ price: 18_333, cost: 0, quantity: 1 }], {
    requestedDiscount: 0, taxPercent: 11, discountRule: openDiscount,
  });
  assert.equal(totals.tax, 2_017);
  assert.equal(Number.isInteger(totals.total), true);
});

test("diskon tidak pernah melebihi subtotal", () => {
  const totals = calculateOrder(lines, { requestedDiscount: 999_999, taxPercent: 0, discountRule: openDiscount });
  assert.equal(totals.discount, 84_000);
  assert.equal(totals.total, 0);
});

test("kasir dibatasi persentase diskon yang ditetapkan pemilik", () => {
  // Tanpa batas ini, kasir bisa menggratiskan transaksi tanpa persetujuan siapa pun.
  const capped = calculateOrder(lines, {
    requestedDiscount: 50_000, taxPercent: 0, discountRule: { unlimited: false, maxPercent: 10 },
  });
  assert.equal(capped.discount, 8_400);
  assert.equal(capped.total, 75_600);

  const noDiscountAllowed = calculateOrder(lines, {
    requestedDiscount: 5_000, taxPercent: 0, discountRule: { unlimited: false, maxPercent: 0 },
  });
  assert.equal(noDiscountAllowed.discount, 0);
});

test("owner dan manager boleh memberi diskon penuh", () => {
  const totals = calculateOrder(lines, {
    requestedDiscount: 20_000, taxPercent: 0, discountRule: { unlimited: true, maxPercent: 0 },
  });
  assert.equal(totals.discount, 20_000);
});

test("nominal negatif dan bukan angka tidak pernah lolos", () => {
  assert.equal(positiveRupiah(-5_000), 0);
  assert.equal(positiveRupiah("abc"), 0);
  assert.equal(positiveRupiah(undefined), 0);
  assert.equal(positiveRupiah("12500"), 12_500);
  assert.equal(positiveRupiah(12_500.6), 12_501);

  const totals = calculateOrder(lines, { requestedDiscount: -9_000, taxPercent: -5, discountRule: openDiscount });
  assert.equal(totals.discount, 0);
  assert.equal(totals.tax, 0);
});

test("laba kotor memakai penjualan dan HPP dari rentang yang sama", () => {
  // Bug lamanya: penjualan dibatasi 200 transaksi terakhir sementara HPP dihitung dari
  // seluruh riwayat, jadi laba kotor merosot sampai minus padahal usahanya untung.
  const profit = profitOf({ sales: 84_000, cogs: 25_500, expenses: 12_000 });
  assert.equal(profit.grossProfit, 58_500);
  assert.equal(profit.netProfit, 46_500);
  assert.equal(Math.round(profit.grossMargin), 70);

  assert.equal(profitOf({ sales: 0, cogs: 0, expenses: 0 }).grossMargin, 0);
});

test("rata-rata biaya bahan mengikuti harga beli terbaru", () => {
  assert.equal(weightedAverageCost(100, 200, 100, 300), 250);
  // Stok masuk tanpa harga tidak boleh mengubah HPP.
  assert.equal(weightedAverageCost(100, 200, 50, 0), 200);
  // Stok minus berarti pembelian belum tercatat; jangan biarkan itu menarik HPP ke bawah.
  assert.equal(weightedAverageCost(-40, 200, 100, 300), 300);
});
