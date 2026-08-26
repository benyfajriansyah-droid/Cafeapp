/**
 * Memecah insert banyak baris supaya tidak melewati batas parameter database.
 *
 * Sebuah insert multi-baris memakai (jumlah kolom × jumlah baris) parameter. Postgres
 * membatasi satu perintah di 65.535 parameter — jauh lebih longgar daripada D1 yang dipakai
 * sebelumnya, tapi tetap bisa tertabrak oleh pengisian data massal, dan gagalnya terjadi
 * seluruhnya, bukan sebagian.
 *
 * Batas di bawah sengaja disetel di bawah batas sesungguhnya supaya ada ruang aman, dan tetap
 * menghasilkan perintah yang cukup kecil untuk dibaca di log kalau ada yang perlu ditelusuri.
 */
export const MAX_BOUND_PARAMS = 8_000;

export function maxRowsPerInsert(columnsPerRow: number, limit = MAX_BOUND_PARAMS): number {
  if (!(columnsPerRow > 0)) return 1;
  return Math.max(1, Math.floor(limit / columnsPerRow));
}

/** Memecah daftar baris menjadi kelompok yang aman untuk satu perintah insert. */
export function chunkRows<T>(rows: T[], columnsPerRow: number, limit = MAX_BOUND_PARAMS): T[][] {
  const size = maxRowsPerInsert(columnsPerRow, limit);
  const chunks: T[][] = [];
  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }
  return chunks;
}
