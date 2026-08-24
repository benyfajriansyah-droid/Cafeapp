import { env } from "cloudflare:workers";

/**
 * Siapa yang boleh memverifikasi pembayaran dan mengaktifkan paket pelanggan.
 *
 * Daftarnya dibaca dari environment variable `PLATFORM_ADMIN_EMAILS` (dipisah koma),
 * bukan ditulis di dalam kode — supaya repositori ini bisa diserahkan atau dijual tanpa
 * ikut membawa identitas admin, dan supaya penggantinya tidak butuh deploy ulang.
 *
 * Kalau variabelnya belum diisi, tidak ada seorang pun yang jadi admin. Itu default yang
 * aman: lebih baik panel penjualan tidak bisa dibuka daripada bisa dibuka siapa saja.
 */
export function platformAdminEmails(): string[] {
  const raw = env.PLATFORM_ADMIN_EMAILS;
  if (typeof raw !== "string") return [];
  return raw.split(",").map((entry) => entry.trim().toLowerCase()).filter((entry) => entry.includes("@"));
}

export function isPlatformAdmin(email: string): boolean {
  return platformAdminEmails().includes(email.trim().toLowerCase());
}

/**
 * Pesan error yang aman dikirim ke browser.
 *
 * Detail exception ditulis ke log server saja. Mengirimkannya ke klien bisa membocorkan
 * nama tabel, kolom, dan bentuk query kepada siapa pun yang sengaja memancing error.
 */
export function safeErrorMessage(error: unknown, context: string): string {
  // Drizzle membungkus kegagalan D1 dan menyimpan penyebab aslinya di `cause`. Tanpa ikut
  // membaca rantai itu, log cuma berisi teks query dan penyebabnya tidak pernah kelihatan.
  const detail = describe(error);
  console.error(`[famz] ${context} gagal — ${detail}`);

  if (detail.includes("no such table") || detail.includes("no such column")) {
    return "Database sedang disiapkan. Coba muat ulang beberapa saat lagi.";
  }
  if (detail.includes("D1 binding") || detail.includes("DB` is unavailable")) {
    return "Koneksi database belum siap. Hubungi dukungan kalau berlanjut.";
  }
  return "Terjadi kesalahan di server. Coba lagi sebentar lagi.";
}

function describe(error: unknown, depth = 0): string {
  if (!(error instanceof Error)) return String(error);
  const cause = (error as { cause?: unknown }).cause;
  const nested = cause && depth < 4 ? ` <- ${describe(cause, depth + 1)}` : "";
  return `${error.name}: ${error.message}${nested}`;
}

/** Error yang pesannya memang ditujukan untuk pengguna. */
export class UserFacingError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "UserFacingError";
    this.status = status;
  }
}
