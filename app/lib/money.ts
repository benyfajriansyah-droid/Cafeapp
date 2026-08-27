/**
 * Perhitungan uang dan pesanan.
 *
 * Semua nominal adalah rupiah penuh (integer). Fungsi di sini murni supaya hitungan
 * yang menentukan uang pelanggan bisa diuji tanpa database.
 */

export function rupiah(value: number): number {
  return Math.round(Number.isFinite(value) ? value : 0);
}

export function positiveRupiah(value: unknown): number {
  const parsed = Math.round(Number(value ?? 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export type CartLine = { price: number; cost: number; quantity: number };

export type OrderTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  cogs: number;
  /** Diskon terbesar yang boleh diberikan peran ini. */
  discountCeiling: number;
  /** True hanya kalau batas peran — bukan besarnya subtotal — yang memotong diskon. */
  blockedByRoleLimit: boolean;
};

export type DiscountRule = {
  /** Owner dan manager boleh memberi diskon sampai seluruh nilai transaksi. */
  unlimited: boolean;
  /** Batas diskon kasir, dalam persen dari subtotal. */
  maxPercent: number;
};

/**
 * Menghitung total pesanan.
 *
 * Diskon selalu dibatasi supaya tidak melebihi subtotal, dan untuk peran kasir dibatasi lagi
 * oleh persentase yang ditetapkan pemilik. Pajak dihitung setelah diskon, seperti praktik
 * umum di Indonesia, lalu dibulatkan ke rupiah penuh.
 */
export function calculateOrder(lines: CartLine[], options: {
  requestedDiscount: number;
  taxPercent: number;
  discountRule: DiscountRule;
}): OrderTotals {
  const subtotal = lines.reduce((sum, line) => sum + rupiah(line.price) * line.quantity, 0);
  const cogs = lines.reduce((sum, line) => sum + rupiah(line.cost) * line.quantity, 0);

  const ceiling = options.discountRule.unlimited
    ? subtotal
    : Math.min(subtotal, Math.floor(subtotal * clampPercent(options.discountRule.maxPercent) / 100));
  const requested = Math.max(0, rupiah(options.requestedDiscount));
  const discount = Math.min(requested, ceiling);

  // Diskon yang lebih besar dari subtotal cukup dipotong diam-diam — itu bukan pelanggaran
  // aturan. Yang perlu ditolak hanya kalau batas perannya yang menahan.
  const blockedByRoleLimit = requested > ceiling && ceiling < subtotal;

  const taxable = subtotal - discount;
  const tax = Math.round(taxable * clampPercent(options.taxPercent) / 100);

  return { subtotal, discount, tax, total: taxable + tax, cogs, discountCeiling: ceiling, blockedByRoleLimit };
}

export function clampPercent(value: unknown): number {
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(100, Math.max(0, parsed));
}

/**
 * Rata-rata biaya tertimbang setelah stok masuk.
 *
 * Dipakai untuk menjaga HPP tetap mengikuti harga beli terbaru tanpa menghapus riwayat.
 */
export function weightedAverageCost(
  currentQty: number,
  currentCost: number,
  incomingQty: number,
  incomingCost: number,
): number {
  if (!(incomingCost > 0)) return currentCost;
  const totalQty = currentQty + incomingQty;
  if (!(totalQty > 0)) return incomingCost;
  // Stok minus berarti riwayat pembelian tertinggal; jangan biarkan itu menarik HPP ke bawah.
  const baseQty = Math.max(0, currentQty);
  return ((baseQty * currentCost) + (incomingQty * incomingCost)) / Math.max(1, baseQty + incomingQty);
}

export type ProfitInput = { sales: number; cogs: number; expenses: number };

export function profitOf({ sales, cogs, expenses }: ProfitInput) {
  const grossProfit = sales - cogs;
  return {
    sales,
    cogs,
    expenses,
    grossProfit,
    netProfit: grossProfit - expenses,
    grossMargin: sales > 0 ? (grossProfit / sales) * 100 : 0,
  };
}
