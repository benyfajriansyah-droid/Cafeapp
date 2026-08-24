/**
 * Memecah insert banyak baris supaya tidak melewati batas parameter D1.
 *
 * D1 membatasi jumlah nilai yang boleh diikat dalam satu perintah. Sebuah insert multi-baris
 * memakai (jumlah kolom × jumlah baris) parameter, jadi tabel lebar cepat menabrak batas itu:
 * pesanan dengan belasan item, resep dengan banyak bahan, atau pengisian data contoh akan
 * gagal seluruhnya — dan gagalnya baru terlihat di produksi, bukan saat baris pertama ditulis.
 */
export const D1_MAX_BOUND_PARAMS = 100;

export function maxRowsPerInsert(columnsPerRow: number, limit = D1_MAX_BOUND_PARAMS): number {
  if (!(columnsPerRow > 0)) return 1;
  return Math.max(1, Math.floor(limit / columnsPerRow));
}

/** Memecah daftar baris menjadi kelompok yang aman untuk satu perintah insert. */
export function chunkRows<T>(rows: T[], columnsPerRow: number, limit = D1_MAX_BOUND_PARAMS): T[][] {
  const size = maxRowsPerInsert(columnsPerRow, limit);
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}
